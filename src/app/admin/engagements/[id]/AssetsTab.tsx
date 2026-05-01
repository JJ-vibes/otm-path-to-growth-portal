"use client";

import { useEffect, useState } from "react";
import { Trash2, Download } from "lucide-react";

type Asset = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

const MAX_BYTES = 25 * 1024 * 1024;

export default function AssetsTab({ engagementId }: { engagementId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}/assets`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAssets(data.assets);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [engagementId]);

  async function uploadFiles(files: File[]) {
    setErr("");
    setBusy(true);
    try {
      for (const file of files) {
        if (file.size > MAX_BYTES) {
          setErr(`${file.name}: too large (max 25MB)`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/admin/engagements/${engagementId}/assets`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setErr(j.error || `${file.name}: upload failed`);
        }
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function del(asset: Asset) {
    if (!window.confirm(`Delete ${asset.filename}?`)) return;
    const res = await fetch(
      `/api/admin/engagements/${engagementId}/assets/${asset.id}`,
      { method: "DELETE" }
    );
    if (res.ok) load();
    else setErr("Delete failed");
  }

  return (
    <div className="space-y-4">
      <label
        className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          busy ? "border-gray-300 bg-gray-50" : "border-gray-300 hover:border-otm-teal"
        }`}
      >
        <p className="text-sm text-otm-gray">
          {busy ? "Uploading…" : "Click to upload files (max 25MB each, multiple allowed)"}
        </p>
        <input
          type="file"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) uploadFiles(files);
            e.target.value = "";
          }}
        />
      </label>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading && <p className="px-6 py-6 text-sm text-gray-400">Loading…</p>}
        {!loading && assets.length === 0 && (
          <p className="px-6 py-6 text-sm text-gray-400">
            No shared assets yet. Drop files above to share with the client.
          </p>
        )}
        {!loading && assets.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-gray-400 tracking-[0.05em]">
                <th className="text-left px-6 py-2 font-medium">Filename</th>
                <th className="text-left px-2 py-2 font-medium">Type</th>
                <th className="text-left px-2 py-2 font-medium">Size</th>
                <th className="text-left px-2 py-2 font-medium">Uploaded</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-6 py-3 text-otm-navy">{a.filename}</td>
                  <td className="px-2 py-3 text-otm-gray text-xs">{a.mimeType}</td>
                  <td className="px-2 py-3 text-xs text-gray-500">
                    {formatBytes(a.sizeBytes)}
                  </td>
                  <td className="px-2 py-3 text-xs text-gray-500">
                    {new Date(a.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`/api/documents/${encodeURIComponent(a.url)}`}
                        download={a.filename}
                        title="Download"
                        className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => del(a)}
                        title="Delete"
                        className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-[#c84a3c]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
