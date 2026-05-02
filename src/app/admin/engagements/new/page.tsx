"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopBar from "@/components/AdminTopBar";

export default function NewEngagementPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: clientName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create engagement");
      }

      const { engagement } = await res.json();
      router.push(`/admin/engagements/${engagement.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-otm-light">
      <AdminTopBar crumbs={[{ label: "New engagement" }]} />

      <main className="max-w-md mx-auto px-6 py-8">
        <h1 className="font-outfit font-bold text-otm-navy text-xl mb-6">
          New Engagement
        </h1>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-otm-gray mb-1">
              Client name
            </label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Executive Presence"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-otm-teal"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-otm-teal text-white font-medium py-2 rounded hover:bg-otm-teal/90 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Creating..." : "Create engagement"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            This will create all 10 Stage 1 deliverables with dependencies.
          </p>
        </form>
      </main>
    </div>
  );
}
