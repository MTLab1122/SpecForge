"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Key,
  Lock,
  Trash2,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check
} from "lucide-react";

export interface UserSessionView {
  id: string;
  deviceName: string;
  deviceType: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrentSession: boolean;
}

export interface UserDeviceView {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isTrusted: boolean;
  lastSeenAt: string;
  lastIpAddress: string;
}

export interface SecurityEventView {
  id: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  status: "SUCCESS" | "WARNING" | "BLOCKED";
  description: string;
}

interface SecurityControlCenterProps {
  mfaEnabled: boolean;
  onInitiateMfaSetup: () => Promise<{ secret: string; otpauthUri: string; backupCodes: string[] }>;
  onConfirmMfa: (code: string) => Promise<boolean>;
  onDisableMfa: () => Promise<void>;
  sessions: UserSessionView[];
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeAllOtherSessions: () => Promise<void>;
  devices: UserDeviceView[];
  onToggleDeviceTrust: (deviceId: string, trust: boolean) => Promise<void>;
  securityEvents: SecurityEventView[];
}

export const SecurityControlCenter: React.FC<SecurityControlCenterProps> = ({
  mfaEnabled,
  onInitiateMfaSetup,
  onConfirmMfa,
  onDisableMfa,
  sessions,
  onRevokeSession,
  onRevokeAllOtherSessions,
  devices,
  onToggleDeviceTrust,
  securityEvents
}) => {
  const [activeTab, setActiveTab] = useState<"mfa" | "sessions" | "devices" | "events">("mfa");
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUri: string; backupCodes: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleStartMfaSetup = async () => {
    try {
      const data = await onInitiateMfaSetup();
      setMfaSetupData(data);
      setIsSettingUpMfa(true);
      setMfaError(null);
    } catch (err: any) {
      setMfaError(err.message || "Failed to start MFA setup");
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    try {
      const success = await onConfirmMfa(verificationCode);
      if (success) {
        setIsSettingUpMfa(false);
        setMfaSetupData(null);
        setVerificationCode("");
      } else {
        setMfaError("Invalid 6-digit TOTP code. Please try again.");
      }
    } catch (err: any) {
      setMfaError(err.message || "Verification failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Institutional Security & Identity</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Authentication & Device Management
          </h2>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("mfa")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "mfa"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            2FA / MFA
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "sessions"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Active Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab("devices")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "devices"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "events"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Security Audit
          </button>
        </div>
      </div>

      {/* Tab 1: MFA */}
      {activeTab === "mfa" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  Two-Factor Authentication (TOTP)
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    mfaEnabled
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {mfaEnabled ? "PROTECTED (ENABLED)" : "NOT CONFIGURED"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Requires a 6-digit verification code from Google Authenticator, 1Password, or Authy on every sign-in.
              </p>
            </div>

            {mfaEnabled ? (
              <button
                onClick={onDisableMfa}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900 transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleStartMfaSetup}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-colors"
              >
                Configure Authenticator App
              </button>
            )}
          </div>

          {/* MFA Setup Wizard */}
          {isSettingUpMfa && mfaSetupData && (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Step-by-Step Two-Factor Activation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Secret Key & URI */}
                <div className="space-y-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    1. Scan QR code or enter manual secret key:
                  </span>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-sm flex items-center justify-between">
                    <span>{mfaSetupData.secret}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mfaSetupData.secret);
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="p-1 hover:text-indigo-600"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    URI: <span className="font-mono">{mfaSetupData.otpauthUri}</span>
                  </span>
                </div>

                {/* Verification Code Form */}
                <form onSubmit={handleVerifyMfa} className="space-y-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    2. Enter 6-digit code from authenticator:
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full text-center text-lg font-mono tracking-widest px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    required
                  />
                  {mfaError && <span className="text-red-500 text-xs block">{mfaError}</span>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                    >
                      Verify & Activate 2FA
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSettingUpMfa(false)}
                      className="px-3 py-2 border rounded-lg text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>

              {/* Backup Recovery Codes */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Save Emergency Backup Recovery Codes</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  If you lose access to your phone, these one-time codes are the only way to recover your account.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border">
                  {mfaSetupData.backupCodes.map((code, idx) => (
                    <div key={idx} className="text-center py-1 bg-slate-50 dark:bg-slate-800 rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sessions */}
      {activeTab === "sessions" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Browser & Client Sessions
              </h3>
              <p className="text-xs text-slate-500">
                Devices currently authenticated into your SpecForge workspace.
              </p>
            </div>
            <button
              onClick={onRevokeAllOtherSessions}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900 transition-colors"
            >
              Sign Out All Other Sessions
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {sess.deviceType === "MOBILE" ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {sess.deviceName}
                      </span>
                      {sess.isCurrentSession && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>IP: {sess.ipAddress}</span>
                      <span>Last active: {new Date(sess.lastActiveAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {!sess.isCurrentSession && (
                  <button
                    onClick={() => onRevokeSession(sess.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Revoke session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Devices */}
      {activeTab === "devices" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recognized & Trusted Devices
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {devices.map((dev) => (
              <div
                key={dev.deviceId}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {dev.deviceName}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        dev.isTrusted
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {dev.isTrusted ? "Trusted" : "Untrusted"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Last IP: {dev.lastIpAddress} • Seen: {new Date(dev.lastSeenAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => onToggleDeviceTrust(dev.deviceId, !dev.isTrusted)}
                  className="text-xs px-2.5 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  {dev.isTrusted ? "Revoke Trust" : "Mark as Trusted"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Security Audit Feed */}
      {activeTab === "events" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Security Incident & Authentication Audit Trail
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden">
            {securityEvents.map((evt) => (
              <div key={evt.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evt.status === "SUCCESS"
                        ? "bg-emerald-500"
                        : evt.status === "WARNING"
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {evt.action}
                    </span>
                    <span className="text-slate-500 ml-2">{evt.description}</span>
                  </div>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  {evt.ipAddress} • {new Date(evt.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
