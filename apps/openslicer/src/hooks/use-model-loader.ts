"use client";

import { useState, useEffect, useRef } from "react";

interface ModelLoaderResult {
  arrayBuffer: ArrayBuffer | null;
  blobUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for loading 3D model files.
 * Accepts a File object or a URL string.
 * Returns the raw ArrayBuffer (for STL parsing) and a blob URL (for display).
 */
export function useModelLoader(
  source: File | string | null
): ModelLoaderResult {
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevBlobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!source) {
      setArrayBuffer(null);
      setBlobUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        let buffer: ArrayBuffer;

        if (source instanceof File) {
          buffer = await source.arrayBuffer();
          // Create a blob URL for the file
          const url = URL.createObjectURL(source);
          if (!cancelled) {
            // Revoke previous blob URL
            if (prevBlobUrl.current) {
              URL.revokeObjectURL(prevBlobUrl.current);
            }
            prevBlobUrl.current = url;
            setBlobUrl(url);
          }
        } else {
          // Fetch from URL
          const res = await fetch(source);
          if (!res.ok) {
            throw new Error(`Failed to fetch model: ${res.status}`);
          }
          buffer = await res.arrayBuffer();
          if (!cancelled) {
            setBlobUrl(source);
          }
        }

        if (!cancelled) {
          setArrayBuffer(buffer);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load model"
          );
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [source]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
      }
    };
  }, []);

  return { arrayBuffer, blobUrl, isLoading, error };
}
