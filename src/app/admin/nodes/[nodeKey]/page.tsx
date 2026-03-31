"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CascadeNode, CascadeFlag } from "@/data/engagement";

type Step =
  | "idle"
  | "uploading"
  | "extracting"
  | "generating"
  | "review"
  | "publishing"
  | "done";

export default function NodeAdminPage() {
  const params = useParams();
  const router = useRouter();
  const nodeKey = params.nodeKey as string;

  const [node, setNode] = useState<CascadeNode | null>(null);
  const [flag, setFlag] = useState<CascadeFlag | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [extractedPreview, setExtractedPreview] = useState("");
  const [summary, setSummary] = useState("");
  const [triggerCascade, setTriggerCascade] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/nodes/${nodeKey}/details`)
      .then((r) => r.json())
      .then((data) => {
        setNode(data.node);
        setFlag(data.flag || null);
      })
      .catch(() => setError("Failed to load node"));
  }, [nodeKey]);

  const isRevision = node?.status === "complete";

  async function handleUpload(file: File) {
    setError("");
    setStep("uploading");

    try {
      setStep("extracting");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { text } = await uploadRes.json();
      setExtractedPreview(text.slice(0, 500));

      setStep("generating");
      const summaryRes = await fetch("/api/extract-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          nodeDisplayName: node?.displayName,
          upstreamNames: node?.upstreamNames,
          downstreamNames: node?.downstreamNames,
          isGate: node?.isGate,
        }),
      });

      if (!summaryRes.ok) {
        const err = await summaryRes.json();
        throw new Error(err.error || "Summary generation failed");
      }

      const { summary: generatedSummary } = await summaryRes.json();
      setSummary(generatedSummary);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  async function handlePublish() {
    setStep("publishing");
    setError("");

    try {
      const res = await fetch(`/api/nodes/${nodeKey}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execSummary: summary,
          status: "complete",
          triggerCascade: isRevision && triggerCascade,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Publish failed");
      }

      const data = await res.json();
      setStep("done");

      if (data.flagCount > 0) {
        setError("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
      setStep("review");
    }
  }

  async function handleResolveFlag() {
    setError("");
    try {
      const res = await fetch(`/api/nodes/${nodeKey}/resolve-flag`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to resolve flag");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    }
  }

  if (!node) {
    return (
      <div className="min-h-screen bg-otm-light flex items-center justify-center">
        <p className="text-gray-500">{error || "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-otm-light">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-8 w-auto" />
          <span className="font-outfit font-semibold text-otm-navy text-sm">
            Admin
          </span>
          <Link
            href="/admin"
            className="text-xs text-otm-teal hover:underline"
          >
            &larr; All nodes
          </Link>
        </div>
        <Link
          href="/strategy"
          className="text-xs text-otm-teal hover:underline"
        >
          View client portal &rarr;
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Node header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-outfit font-bold text-otm-navy text-xl">
              {node.displayName}
            </h1>
            {node.isGate && (
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">
                Strategic gate
              </span>
            )}
            {node.isConditional && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                Conditional
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                node.status === "complete"
                  ? "bg-otm-teal/10 text-otm-teal"
                  : node.status === "active"
                  ? "bg-blue-50 text-blue-600"
                  : node.status === "flagged"
                  ? "bg-amber-50 text-amber-700"
                  : node.status === "cascading"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {node.status}
            </span>
          </div>
        </div>

        {/* Flag warning for flagged nodes */}
        {(node.status === "flagged" || flag) && (
          <div className="bg-[#fffbeb] border border-[#f59e0b] rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-amber-600 text-lg leading-none">⚠</span>
              <div>
                <p className="text-[#92400e] text-sm font-medium">
                  Upstream change detected
                </p>
                {flag && (
                  <p className="text-[#92400e] text-sm mt-1">
                    Flagged because an upstream deliverable was revised on{" "}
                    {new Date(flag.sourceChangeDate).toLocaleDateString()}.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResolveFlag}
                className="text-xs px-4 py-2 bg-white border border-gray-300 rounded-lg text-otm-gray hover:bg-gray-50 transition-colors"
              >
                No changes needed
              </button>
              <span className="text-xs text-gray-400">or upload a revised document below</span>
            </div>
          </div>
        )}

        {/* Current summary */}
        {node.execSummary && step === "idle" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3">
              Current Executive Summary
            </h3>
            <div className="space-y-3">
              {node.execSummary.split("\n\n").map((p, i) => (
                <p key={i} className="text-sm text-otm-gray leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Upload area */}
        {(step === "idle" || step === "done") && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <p className="text-sm text-gray-500 mb-3">
              {step === "done"
                ? "Upload another document to regenerate the summary"
                : "Upload a .docx, .pdf, or .md to generate an executive summary"}
            </p>
            <label className="inline-flex items-center gap-2 bg-otm-teal text-white text-sm font-medium px-5 py-2.5 rounded-lg cursor-pointer hover:bg-otm-teal/90 transition-colors">
              Choose file
              <input
                type="file"
                accept=".docx,.pdf,.md,.markdown,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
          </div>
        )}

        {/* Progress steps */}
        {step === "extracting" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-otm-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-otm-gray">
                Extracting text from document...
              </p>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            {extractedPreview && (
              <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-500 max-h-32 overflow-hidden">
                <p className="font-medium mb-1">Extracted text preview:</p>
                {extractedPreview}...
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-otm-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-otm-gray">
                Generating executive summary...
              </p>
            </div>
          </div>
        )}

        {step === "publishing" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-otm-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-otm-gray">Publishing...</p>
            </div>
          </div>
        )}

        {/* Review area */}
        {step === "review" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3">
              Generated Summary — Review & Edit
            </h3>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={12}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-otm-gray leading-relaxed resize-y focus:outline-none focus:border-otm-teal"
            />

            {/* Cascade trigger checkbox — only for revisions */}
            {isRevision && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={triggerCascade}
                    onChange={(e) => setTriggerCascade(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-amber-800">
                      This revision affects downstream deliverables
                    </span>
                    <p className="text-xs text-amber-700 mt-1">
                      Check this if the strategic direction, ICP, or positioning
                      has changed. Leave unchecked for informational updates
                      (revenue numbers, minor wording).
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handlePublish}
                className="bg-otm-teal text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-otm-teal/90 transition-colors"
              >
                Publish to portal
              </button>
              <button
                onClick={() => {
                  setStep("idle");
                  setSummary("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Done message */}
        {step === "done" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm font-medium">
              Summary published successfully.
              {triggerCascade &&
                " Downstream deliverables have been flagged for review."}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
