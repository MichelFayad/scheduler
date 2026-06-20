"use client";

import { useState, useEffect } from "react";

interface Community { id: string; name: string }
interface EmailLog { id: string; trigger: string; recipient: string; subject: string; sentAt: string; isError: boolean; booking?: { referenceNumber: string } | null }

export default function AlertsPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [communityId, setCommunityId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    fetch("/api/communities").then((r) => r.json()).then((data) => {
      setCommunities(data);
      if (data.length > 0) setCommunityId(data[0].id);
    });
    fetch("/api/admin/email-logs").then((r) => r.json()).then(setLogs).catch(() => {});
  }, []);

  async function sendAlert(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    const res = await fetch("/api/admin/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId, subject, message }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setResult(`✓ Sent to ${data.sentTo} recipient${data.sentTo !== 1 ? "s" : ""}`);
      setSubject("");
      setMessage("");
      // Refresh logs
      fetch("/api/admin/email-logs").then((r) => r.json()).then(setLogs).catch(() => {});
    } else {
      setResult(`✗ ${data.error}`);
    }
  }

  const TRIGGER_LABELS: Record<string, string> = {
    BOOKING_CONFIRMED: "Booking confirmed",
    BOOKING_CANCELLED_USER: "Cancelled by user",
    BOOKING_CANCELLED_ADMIN: "Cancelled by admin",
    BOOKING_RESCHEDULED_USER: "Rescheduled by user",
    BOOKING_RESCHEDULED_ADMIN: "Rescheduled by admin",
    BOOKING_REMINDER: "Reminder",
    MANUAL_COMMUNITY_ALERT: "Manual alert",
  };

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Alerts</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send manual alert */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Send Manual Alert</h2>
          <form onSubmit={sendAlert} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
              <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {result && (
              <p className={`text-sm font-medium ${result.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{result}</p>
            )}
            <button type="submit" disabled={sending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {sending ? "Sending…" : "Send Alert"}
            </button>
          </form>
        </div>

        {/* Recent email log */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Email Activity</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">No email activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 20).map((log) => (
                <li key={log.id} className="text-xs border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${log.isError ? "text-red-600" : "text-gray-700"}`}>
                      {TRIGGER_LABELS[log.trigger] ?? log.trigger}
                    </span>
                    <span className="text-gray-400">{new Date(log.sentAt).toLocaleDateString("en-US")}</span>
                  </div>
                  <p className="text-gray-500 truncate">{log.recipient}</p>
                  {log.isError && <p className="text-red-500">Failed</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
