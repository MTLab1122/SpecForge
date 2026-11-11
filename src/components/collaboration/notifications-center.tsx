"use client";

import React, { useState, useEffect } from "react";
import type {
  InAppNotification,
  UserNotificationPreferences,
  NotificationJob
} from "@/lib/notifications/notification-service";
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Mail,
  ShieldCheck,
  Send,
  Eye,
  Sliders,
  Check,
  XCircle,
  FileText,
  DollarSign,
  Activity
} from "lucide-react";

export interface InAppNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  eventType?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt?: string;
  timeAgo?: string;
}

interface NotificationsCenterProps {
  initialNotifications?: InAppNotificationItem[];
  userId?: string;
  organizationId?: string;
  onMarkRead?: (notificationId?: string, markAll?: boolean) => void;
}

export function NotificationsCenter({
  initialNotifications = [],
  userId = "usr_developer",
  organizationId = "org_apex_digital",
  onMarkRead
}: NotificationsCenterProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"INBOX" | "HISTORY" | "PREFERENCES">("INBOX");
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>(initialNotifications);
  const [deliveryHistory, setDeliveryHistory] = useState<NotificationJob[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // User Notification Preferences State
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    userId,
    emailEnabled: true,
    inAppEnabled: true,
    weeklyDigest: true,
    approvalAlerts: true,
    changeRequestAlerts: true,
    paymentAlerts: true,
    marketingEmails: false, // Opt-in only
    slackEnabled: true,
    unsubscribedEventTypes: []
  });

  const fetchNotificationsAndHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/collaboration/notifications", {
        headers: { "x-user-id": userId, "x-org-id": organizationId }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setNotifications(data.data.notifications || []);
        setDeliveryHistory(data.data.history || []);
      }

      const prefRes = await fetch("/api/v1/collaboration/notifications/preferences", {
        headers: { "x-user-id": userId }
      });
      const prefData = await prefRes.json();
      if (prefData.success && prefData.data) {
        setPreferences(prefData.data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsAndHistory();
  }, [userId, organizationId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (onMarkRead) onMarkRead(id, false);

    await fetch("/api/v1/collaboration/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ notificationId: id })
    });
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (onMarkRead) onMarkRead(undefined, true);

    await fetch("/api/v1/collaboration/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ markAllAsRead: true })
    });
  };

  const handleTogglePref = async (key: keyof UserNotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    try {
      await fetch("/api/v1/collaboration/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setRetryingId(jobId);
      const res = await fetch("/api/v1/collaboration/notifications/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ action: "RETRY", jobId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchNotificationsAndHistory();
      }
    } catch (err) {
      console.error("Failed to retry notification job:", err);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="relative font-sans">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-84 sm:w-104 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Notifications & Queue
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {unreadCount > 0 && activeTab === "INBOX" && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 mt-3 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setActiveTab("INBOX")}
                className={`flex-1 py-1 px-2.5 rounded-lg text-center transition cursor-pointer ${
                  activeTab === "INBOX"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Inbox ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`flex-1 py-1 px-2.5 rounded-lg text-center transition cursor-pointer ${
                  activeTab === "HISTORY"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Delivery Queue
              </button>
              <button
                onClick={() => setActiveTab("PREFERENCES")}
                className={`flex-1 py-1 px-2.5 rounded-lg text-center transition cursor-pointer ${
                  activeTab === "PREFERENCES"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Preferences
              </button>
            </div>
          </div>

          {/* TAB 1: INBOX */}
          {activeTab === "INBOX" && (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto opacity-70" />
                  <p>You are all caught up!</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id)}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex items-start gap-3 ${
                      !notif.isRead
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">
                      {notif.eventType?.includes("APPROVAL") || notif.type === "PROPOSAL_APPROVED" ? "🎉" :
                       notif.eventType?.includes("CHANGE") || notif.type === "CHANGE_REQUEST" ? "🔄" :
                       notif.eventType?.includes("PAYMENT") ? "💳" : "📋"}
                    </span>

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {notif.timeAgo || (notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.linkUrl && (
                        <a
                          href={notif.linkUrl}
                          className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
                        >
                          View item →
                        </a>
                      )}
                    </div>

                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: DELIVERY HISTORY & QUEUE */}
          {activeTab === "HISTORY" && (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
              {deliveryHistory.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No queued or dispatched notification events.
                </div>
              ) : (
                deliveryHistory.map((job) => (
                  <div
                    key={job.id}
                    className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {job.title || job.eventType}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === "DELIVERED" || job.status === "SENT"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : job.status === "OPENED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400"
                            : job.status === "FAILED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Channel: {job.channel}</span>
                      <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {job.error && (
                      <div className="flex items-center justify-between text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg">
                        <span className="truncate max-w-[200px]">{job.error}</span>
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={retryingId === job.id}
                          className="font-bold underline text-indigo-600 dark:text-indigo-400 cursor-pointer"
                        >
                          {retryingId === job.id ? "Retrying..." : "Retry"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === "PREFERENCES" && (
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto text-xs">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Channels
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">In-app notifications</span>
                    <input
                      type="checkbox"
                      checked={preferences.inAppEnabled}
                      onChange={() => handleTogglePref("inAppEnabled")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Email notifications</span>
                    <input
                      type="checkbox"
                      checked={preferences.emailEnabled}
                      onChange={() => handleTogglePref("emailEnabled")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Notification Alert Categories
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Client approval alerts</span>
                    <input
                      type="checkbox"
                      checked={preferences.approvalAlerts}
                      onChange={() => handleTogglePref("approvalAlerts")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Change-request alerts</span>
                    <input
                      type="checkbox"
                      checked={preferences.changeRequestAlerts}
                      onChange={() => handleTogglePref("changeRequestAlerts")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Payment & milestone alerts</span>
                    <input
                      type="checkbox"
                      checked={preferences.paymentAlerts}
                      onChange={() => handleTogglePref("paymentAlerts")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Weekly discovery digest</span>
                    <input
                      type="checkbox"
                      checked={preferences.weeklyDigest}
                      onChange={() => handleTogglePref("weeklyDigest")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium block">Marketing updates</span>
                      <span className="text-[10px] text-slate-400">Strictly opt-in only.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketingEmails}
                      onChange={() => handleTogglePref("marketingEmails")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Deduplication & Replay Defense Active</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>
      )}
    </div>
  );
}
