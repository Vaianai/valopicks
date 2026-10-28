"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/components/layout/LanguageContext";
import { useState, useEffect } from "react";

export default function SocialPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [addHandle, setAddHandle] = useState("");

  useEffect(() => {
    if (session?.user) {
      fetch("/api/social/friends").then(r => r.json()).then(d => { if (d.ok) setFriends(d.friendships); });
      fetch("/api/social/activity").then(r => r.json()).then(d => { if (d.ok) setActivity(d.activity); });
    }
  }, [session]);

  const handleAdd = async () => {
    if (!addHandle.trim()) return;
    // ... in a real app, we'd lookup user by discord handle or email.
    alert("Lookup by handle not implemented in mock");
  };

  const handleAction = async (id: string, action: string) => {
    const res = await fetch(`/api/social/friends/${id}`, {
      method: "PATCH", body: JSON.stringify({ action }), headers: { "Content-Type": "application/json" }
    });
    if (res.ok) {
      setFriends(friends.map(f => f.id === id ? { ...f, status: action === "accept" ? "ACCEPTED" : "BLOCKED" } : f));
    }
  };

  if (!session) return <div className="text-center py-20 text-[var(--vp-text-muted)]">{t("common.loading")}</div>;

  const pending = friends.filter(f => f.status === "PENDING" && f.addresseeId === session.user.id);
  const accepted = friends.filter(f => f.status === "ACCEPTED");

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="font-title text-3xl font-bold uppercase text-white">{t("social.friends")}</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Discord handle..." className="vp-input w-48" value={addHandle} onChange={e => setAddHandle(e.target.value)} />
          <button onClick={handleAdd} className="vp-btn vp-btn-primary">{t("social.addFriend")}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="font-title text-xl font-bold text-white border-b border-[var(--vp-border)] pb-2">{t("social.activityFeed")}</h2>
          <div className="vp-card p-4 space-y-4">
            {activity.length > 0 ? activity.map(a => (
              <div key={a.id} className="activity-item">
                <div className="w-8 h-8 rounded-full bg-[var(--vp-border)] flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-bold text-white">{a.user?.name}</span>
                  <span className="text-[var(--vp-text-muted)] mx-1">
                    {a.type === "DRAFTED" ? "drafted a new team:" : a.type === "JOINED_LEAGUE" ? "joined league:" : "did something"}
                  </span>
                  <span className="font-semibold text-[var(--vp-accent)]">{a.payload?.name || a.payload?.teamName}</span>
                </div>
                <div className="text-xs text-[var(--vp-text-muted)]">{new Date(a.createdAt).toLocaleDateString()}</div>
              </div>
            )) : <div className="text-center text-[var(--vp-text-muted)] py-8">{t("common.noData")}</div>}
          </div>
        </div>

        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-title text-xl font-bold text-white border-b border-[var(--vp-border)] pb-2">{t("social.pending")}</h2>
              <div className="vp-card p-4 space-y-3">
                {pending.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm font-bold">{p.requester?.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(p.id, "accept")} className="vp-btn vp-btn-primary px-2 py-1 text-xs">{t("social.accept")}</button>
                      <button onClick={() => handleAction(p.id, "decline")} className="vp-btn vp-btn-secondary px-2 py-1 text-xs">{t("social.decline")}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="font-title text-xl font-bold text-white border-b border-[var(--vp-border)] pb-2">{t("social.friends")}</h2>
            <div className="vp-card p-4 space-y-3">
              {accepted.length > 0 ? accepted.map(f => {
                const friend = f.requesterId === session.user.id ? f.addressee : f.requester;
                return (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[var(--vp-border)] flex-shrink-0" />
                    <span className="font-bold text-sm">{friend?.name}</span>
                  </div>
                );
              }) : <div className="text-sm text-[var(--vp-text-muted)]">{t("common.noData")}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
