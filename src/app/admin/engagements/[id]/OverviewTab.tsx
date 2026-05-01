"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";

const STAGES = ["Formation", "Traction", "Structure", "Momentum", "Scale-Ready", "Accelerate+Exit"];

export default function OverviewTab({
  engagement,
}: {
  engagement: { id: string; clientName: string; lifecycleStage: string; internalNotes: string | null };
}) {
  const router = useRouter();
  const [stage, setStage] = useState(engagement.lifecycleStage);
  const [notes, setNotes] = useState(engagement.internalNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(engagement.internalNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Two-step delete state
  const [deleteStep, setDeleteStep] = useState<"none" | "warn" | "confirm">("none");
  const [confirmText, setConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

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

      {/* Danger zone — delete engagement */}
      <section className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="font-outfit font-semibold text-red-700 text-sm mb-1">Danger zone</h2>
        <p className="text-xs text-gray-500 mb-4">
          Deleting this engagement removes all nodes, versions, sections, cascade flags, user
          links, and configuration. The user accounts themselves are not deleted. This cannot be undone.
        </p>
        <button
          onClick={() => setDeleteStep("warn")}
          className="text-xs font-semibold px-4 py-2 rounded-md text-white"
          style={{ backgroundColor: "#c84a3c" }}
        >
          Delete engagement
        </button>
      </section>

      {/* Step 1: warning */}
      {deleteStep === "warn" && (
        <DeleteDialog
          title={`Delete ${engagement.clientName}?`}
          body={
            <>
              <p className="mb-2">
                This will permanently delete <strong>{engagement.clientName}</strong> and everything
                attached to it:
              </p>
              <ul className="list-disc pl-5 text-xs text-otm-gray space-y-0.5">
                <li>All 7 strategy nodes and their versions/sections</li>
                <li>Document uploads tied to this engagement</li>
                <li>Cascade flags and node configuration</li>
                <li>Client user links (the user accounts themselves stay)</li>
              </ul>
              <p className="mt-3 text-otm-gray">This cannot be undone.</p>
            </>
          }
          cancelLabel="Cancel"
          confirmLabel="Continue"
          onCancel={() => setDeleteStep("none")}
          onConfirm={() => {
            setConfirmText("");
            setDeleteErr("");
            setDeleteStep("confirm");
          }}
          busy={false}
        />
      )}

      {/* Step 2: type to confirm */}
      {deleteStep === "confirm" && (
        <DeleteDialog
          title="One more step"
          body={
            <>
              <p className="mb-3 text-otm-gray">
                Type <strong>{engagement.clientName}</strong> below to confirm deletion.
              </p>
              <input
                autoFocus
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={engagement.clientName}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-400"
              />
              {deleteErr && <p className="mt-2 text-sm text-red-600">{deleteErr}</p>}
            </>
          }
          cancelLabel="Cancel"
          confirmLabel="Delete forever"
          confirmDisabled={confirmText.trim() !== engagement.clientName}
          onCancel={() => setDeleteStep("none")}
          onConfirm={async () => {
            setDeleteBusy(true);
            setDeleteErr("");
            try {
              const res = await fetch(`/api/admin/engagements/${engagement.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmName: confirmText.trim() }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || "Delete failed");
              }
              router.push("/admin");
            } catch (e) {
              setDeleteErr(e instanceof Error ? e.message : "Delete failed");
              setDeleteBusy(false);
            }
          }}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}

function DeleteDialog({
  title,
  body,
  cancelLabel,
  confirmLabel,
  confirmDisabled,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  body: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-outfit font-bold text-otm-navy text-lg mb-3">{title}</h3>
        <div className="text-sm text-otm-gray mb-5">{body}</div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-sm px-4 py-2 border border-gray-300 rounded-md text-otm-gray hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className="text-sm font-semibold px-4 py-2 rounded-md text-white disabled:opacity-50"
            style={{ backgroundColor: "#c84a3c" }}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
