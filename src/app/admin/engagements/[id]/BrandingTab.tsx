"use client";

import { useState } from "react";

export default function BrandingTab({
  engagementId,
  clientLogoUrl,
}: {
  engagementId: string;
  clientLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(clientLogoUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setErr("");
    if (file.size > 2 * 1024 * 1024) {
      setErr("Logo must be 2MB or smaller");
      return;
    }
    if (!/^(image\/png|image\/jpe?g|image\/svg\+xml)$/.test(file.type)) {
      setErr("Logo must be PNG, JPG, or SVG");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/engagements/${engagementId}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const data = await res.json();
      setLogoUrl(data.clientLogoUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientLogoUrl: null }),
      });
      if (!res.ok) throw new Error("Failed");
      setLogoUrl(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="font-outfit font-semibold text-otm-navy text-sm mb-4">Client logo</h2>
      {logoUrl ? (
        <div className="flex items-center gap-6 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/documents/${encodeURIComponent(logoUrl)}`} alt="Client logo" className="h-[120px] max-w-[300px] object-contain border border-gray-100 rounded p-2" />
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md text-otm-gray hover:bg-gray-50 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">No logo uploaded yet.</p>
      )}
      <label className="inline-flex items-center gap-2 bg-otm-teal text-white text-sm font-medium px-4 py-2 rounded-md cursor-pointer hover:bg-otm-teal/90">
        {busy ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-gray-400 mt-2">
        PNG, JPG, or SVG. Max 2MB. Recommended max 1000×1000px.
      </p>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
    </div>
  );
}
