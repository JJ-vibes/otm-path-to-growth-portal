"use client";

import { useEffect, useState } from "react";

type ConfigRow = {
  nodeKey: string;
  displayName: string;
  excluded: boolean;
  sectionToggles: Record<string, boolean> | null;
};

export default function SettingsTab({ engagementId }: { engagementId: string }) {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/engagements/${engagementId}/config`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setRows(data.config);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [engagementId]);

  async function patchNode(nodeKey: string, body: Record<string, unknown>) {
    setErr("");
    const res = await fetch(
      `/api/admin/engagements/${engagementId}/config/${nodeKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Save failed");
      return;
    }
    const data = await res.json();
    setRows((prev) => prev.map((r) => (r.nodeKey === nodeKey ? { ...r, ...data.config } : r)));
  }

  const wawSelling = rows.find((r) => r.nodeKey === "what-are-we-selling");
  const icp = rows.find((r) => r.nodeKey === "ideal-client-profile");
  const vocOn = !icp?.sectionToggles || icp.sectionToggles.voc_alignment !== false;

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-outfit font-semibold text-otm-navy text-sm mb-4">
          Conditional content
        </h2>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && wawSelling && (
          <Toggle
            checked={!wawSelling.excluded}
            label='Include "What Are We Selling" node'
            description="When unchecked, this node is hidden from the client portal, top progression strip, and PDF export. Cascade dependencies skip it."
            onChange={(checked) => patchNode("what-are-we-selling", { excluded: !checked })}
          />
        )}

        {!loading && icp && (
          <Toggle
            checked={vocOn}
            label="Include Voice of Customer / ICP Alignment sections"
            description="When unchecked, the VoC sections inside the ICP node are hidden on the client portal."
            onChange={(checked) =>
              patchNode("ideal-client-profile", {
                sectionToggles: { ...(icp.sectionToggles || {}), voc_alignment: checked },
              })
            }
          />
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      </section>
    </div>
  );
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-otm-navy">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </label>
  );
}
