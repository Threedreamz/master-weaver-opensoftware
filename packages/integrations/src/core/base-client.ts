import type {
  BaseClientConfig,
  RequestConfig,
  ApiResponse,
  RetryConfig,
  RateLimitConfig,
  CircuitBreakerConfig,
} from "./types";

// ==================== Rate Limiter (Token Bucket) ====================

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(config: RateLimitConfig) {
    this.maxTokens = config.burstSize ?? config.requestsPerMinute;
    this.tokens = this.maxTokens;
    this.refillRate = config.requestsPerMinute / 60_000;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until a token is available
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ==================== Circuit Breaker ====================

class CircuitBreaker {
  private failures = 0;
  private lastFailureAt = 0;
  private isOpen = false;

  constructor(private config: CircuitBreakerConfig) {}

  check(): void {
    if (!this.isOpen) return;
    const elapsed = Date.now() - this.lastFailureAt;
    if (elapsed >= this.config.resetTimeMs) {
      this.isOpen = false;
      this.failures = 0;
      return;
    }
    throw new IntegrationError(
      "CIRCUIT_OPEN",
      `Circuit breaker open — retry after ${Math.ceil((this.config.resetTimeMs - elapsed) / 1000)}s`
    );
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.isOpen = true;
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.isOpen = false;
  }
}

// ==================== Error ====================

export type IntegrationErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "CIRCUIT_OPEN"
  | "UNKNOWN";

export class IntegrationError extends Error {
  constructor(
    public code: IntegrationErrorCode,
    message: string,
    public status?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

// ==================== Base Client ====================

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
};

const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeMs: 60_000,
};

export class BaseIntegrationClient {
  protected baseUrl: string;
  protected credentials: Record<string, string>;
  protected authType: string;
  protected timeout: number;
  protected defaultHeaders: Record<string, string>;

  private retryConfig: RetryConfig;
  private rateLimiter?: TokenBucket;
  private circuitBreaker: CircuitBreaker;

  constructor(config: BaseClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.credentials = config.credentials;
    this.authType = config.authType;
    this.timeout = config.timeout ?? 30_000;
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.retryConfig = { ...DEFAULT_RETRY, ...config.retry };
    this.circuitBreaker = new CircuitBreaker({
      ...DEFAULT_CIRCUIT_BREAKER,
      ...config.circuitBreaker,
    });

    if (config.rateLimit) {
      this.rateLimiter = new TokenBucket(config.rateLimit);
    }
  }

  async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    this.circuitBreaker.check();

    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(config);
        this.circuitBreaker.recordSuccess();
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof IntegrationError) {
          // Don't retry auth errors or validation errors
          if (error.code === "AUTH_ERROR" || error.code === "VALIDATION_ERROR") {
            this.circuitBreaker.recordFailure();
            throw error;
          }
        }

        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt),
            this.retryConfig.maxDelayMs
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.circuitBreaker.recordFailure();
    throw lastError ?? new IntegrationError("UNKNOWN", "Request failed after all retries");
  }

  // Convenience methods
  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", path, params });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", path, body });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PUT", path, body });
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "PATCH", path, body });
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "DELETE", path });
  }

  // ==================== Private ====================

  private async executeRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = new URL(config.path, this.baseUrl);
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...this.defaultHeaders,
      ...this.getAuthHeaders(),
      ...config.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout ?? this.timeout
    );

    try {
      const response = await fetch(url.toString(), {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }

        if (response.status === 401 || response.status === 403) {
          throw new IntegrationError("AUTH_ERROR", `Authentication failed: ${response.status}`, response.status, parsed);
        }
        if (response.status === 429) {
          throw new IntegrationError("RATE_LIMITED", "Rate limit exceeded", response.status, parsed);
        }
        if (response.status === 422 || response.status === 400) {
          throw new IntegrationError("VALIDATION_ERROR", `Validation error: ${response.status}`, response.status, parsed);
        }
        if (response.status >= 500) {
          throw new IntegrationError("SERVER_ERROR", `Server error: ${response.status}`, response.status, parsed);
        }
        throw new IntegrationError("UNKNOWN", `HTTP ${response.status}`, response.status, parsed);
      }

      const text = await response.text();
      const data = text ? (JSON.parse(text) as T) : ({} as T);

      return { data, status: response.status, headers: responseHeaders };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new IntegrationError("TIMEOUT", `Request timed out after ${this.timeout}ms`);
      }
      throw new IntegrationError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    switch (this.authType) {
      case "api_key":
        if (this.credentials.headerName && this.credentials.apiKey) {
          return { [this.credentials.headerName]: this.credentials.apiKey };
        }
        if (this.credentials.apiKey) {
          return { Authorization: `Bearer ${this.credentials.apiKey}` };
        }
        return {};

      case "oauth2":
        if (this.credentials.accessToken) {
          return { Authorization: `Bearer ${this.credentials.accessToken}` };
        }
        return {};

      case "basic_auth":
        if (this.credentials.username && this.credentials.password) {
          const encoded = btoa(`${this.credentials.username}:${this.credentials.password}`);
          return { Authorization: `Basic ${encoded}` };
        }
        return {};

      default:
        return {};
    }
  }
}
