"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";

const STAGES = ["Formation", "Traction", "Structure", "Momentum", "Scale-Ready", "Accelerate+Exit"];

export default function OverviewTab({
  engagement,
}: {
  engagement: { id: string; clientName: string; lifecycleStage: string; internalNotes: string | null };
}) {
  const [stage, setStage] = useState(engagement.lifecycleStage);
  const [notes, setNotes] = useState(engagement.internalNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(engagement.internalNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/engagements/${engagement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-outfit font-semibold text-otm-navy text-sm mb-4">Engagement</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <dt className="text-gray-500">Client name</dt>
          <dd className="col-span-2 text-otm-navy">{engagement.clientName}</dd>

          <dt className="text-gray-500">Lifecycle stage</dt>
          <dd className="col-span-2">
            <select
              value={stage}
              onChange={(e) => {
                const next = e.target.value;
                setStage(next);
                patch({ lifecycleStage: next });
              }}
              disabled={busy}
              className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-otm-teal"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </dd>
        </dl>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-outfit font-semibold text-otm-navy text-sm">Internal notes</h2>
          <span className="text-[11px] text-gray-400">Visible to OTM admins only</span>
        </div>
        <RichTextEditor
          initialHtml={notes}
          onChange={setNotes}
          placeholder="Add private notes about this engagement…"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            disabled={busy || notes === savedNotes}
            onClick={async () => {
              await patch({ internalNotes: notes });
              setSavedNotes(notes);
            }}
            className="text-xs font-semibold px-4 py-2 rounded-md text-white bg-otm-navy disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save notes"}
          </button>
          {notes !== savedNotes && !busy && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
        </div>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
