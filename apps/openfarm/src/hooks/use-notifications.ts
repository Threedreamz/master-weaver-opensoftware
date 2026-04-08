"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Notification {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  printerId?: string | null;
  jobId?: string | null;
  metadata?: Record<string, unknown> | null;
  assignedTo?: string | null;
  readAt?: Date | null;
  dismissedAt?: Date | null;
  createdAt: Date;
  printer?: { id: string; name: string } | null;
  job?: { id: string; name: string } | null;
}

export function useNotifications(pollInterval = 10000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch("/api/notifications?limit=50", {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to fetch notifications:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Retry on next poll
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Retry on next poll
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() }))
      );
      setUnreadCount(0);
    } catch {
      // Retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, pollInterval);
    return () => {
      clearInterval(interval);
      controllerRef.current?.abort();
    };
  }, [fetchNotifications, fetchUnreadCount, pollInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    dismiss,
    markAllRead,
    refresh: fetchNotifications,
  };
}
