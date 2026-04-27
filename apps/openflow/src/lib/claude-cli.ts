import { spawn } from "node:child_process";

function resolveClaudeBin(): string {
  return process.env.CLAUDE_CLI_PATH || process.env.CLAUDE_CODE_EXECPATH || "claude";
}

export async function callClaudeCli(prompt: string, opts?: { timeoutMs?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveClaudeBin(), ["-p"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Claude CLI timeout"));
    }, opts?.timeoutMs ?? 120_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(`Claude CLI exited ${code}: ${stderr}`));
      resolve(stdout.trim());
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
