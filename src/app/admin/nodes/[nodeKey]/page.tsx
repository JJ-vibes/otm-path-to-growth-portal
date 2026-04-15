"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CascadeNode, CascadeFlag, NodeTemplateSection, NodeSectionData } from "@/data/engagement";
import SectionHtml from "@/components/SectionHtml";

interface ParsedSectionResult {
  sectionKey: string;
  sectionTitle: string;
  content: string;
  sortOrder: number;
  displayLayer: "CHAPTER" | "FULL";
  isRequired: boolean;
  isConditional: boolean;
  matched: boolean;
}

type Step =
  | "idle"
  | "uploading"
  | "parsing"
  | "editing"
  | "publishing"
  | "done";

export default function NodeAdminPage() {
  const params = useParams();
  const router = useRouter();
  const nodeKey = params.nodeKey as string;

  const [node, setNode] = useState<CascadeNode | null>(null);
  const [flag, setFlag] = useState<CascadeFlag | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");

  // Section editor state
  const [templateSections, setTemplateSections] = useState<NodeTemplateSection[]>([]);
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [unmatchedHeadings, setUnmatchedHeadings] = useState<string[]>([]);
  const [triggerCascade, setTriggerCascade] = useState(false);
  const [disabledConditionals, setDisabledConditionals] = useState<Set<string>>(new Set());
  const [uploadedFilename, setUploadedFilename] = useState("");

  // Legacy fallback state (for nodes without templates)
  const [legacySummary, setLegacySummary] = useState("");
  const [useLegacy, setUseLegacy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/nodes/${nodeKey}/details`).then((r) => r.json()),
      fetch(`/api/templates/${nodeKey}`).then((r) =>
        r.ok ? r.json() : { sections: [] }
      ),
    ])
      .then(([detailsData, templateData]) => {
        setNode(detailsData.node);
        setFlag(detailsData.flag || null);

        if (templateData.sections?.length) {
          setTemplateSections(templateData.sections);
          // Pre-populate from existing sections if they exist
          if (detailsData.sections?.length) {
            const contents: Record<string, string> = {};
            for (const s of detailsData.sections as NodeSectionData[]) {
              contents[s.sectionKey] = s.content;
            }
            setSectionContents(contents);
            setStep("editing");
          }
        } else {
          // No templates — fall back to legacy single-textarea
          setUseLegacy(true);
          if (detailsData.node?.execSummary) {
            setLegacySummary(detailsData.node.execSummary);
          }
        }
      })
      .catch(() => setError("Failed to load node"));
  }, [nodeKey]);

  const isRevision = node?.status === "complete";

  const hasConditionalSections = templateSections.some((t) => t.isConditional);

  function updateSectionContent(sectionKey: string, content: string) {
    setSectionContents((prev) => ({ ...prev, [sectionKey]: content }));
  }

  function toggleConditionalSections() {
    const conditionalKeys = templateSections
      .filter((t) => t.isConditional)
      .map((t) => t.sectionKey);

    setDisabledConditionals((prev) => {
      if (prev.size > 0) {
        return new Set();
      }
      return new Set(conditionalKeys);
    });
  }

  async function handleUpload(file: File) {
    setError("");
    setUploadedFilename(file.name);

    if (useLegacy) {
      // Legacy flow — just extract text
      setStep("uploading");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
        const { text } = await res.json();
        setLegacySummary(text.slice(0, 2000));
        setStep("editing");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStep("idle");
      }
      return;
    }

    // Section-based flow — use auto-parser
    setStep("parsing");

    try {
      // First upload the file to save it
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      if (!uploadRes.ok) throw new Error((await uploadRes.json()).error || "Upload failed");

      // Then parse it against templates
      const parseForm = new FormData();
      parseForm.append("file", file);
      const parseRes = await fetch(`/api/nodes/${nodeKey}/parse-upload`, {
        method: "POST",
        body: parseForm,
      });
      if (!parseRes.ok) throw new Error((await parseRes.json()).error || "Parse failed");

      const { matched, unmatched, missing } = await parseRes.json();

      // Merge parsed sections into editor state
      setSectionContents((prev) => {
        const merged = { ...prev };
        for (const section of matched as ParsedSectionResult[]) {
          // Only overwrite if currently empty, or this is a fresh upload
          if (!merged[section.sectionKey]?.trim() || step === "idle") {
            merged[section.sectionKey] = section.content;
          }
        }
        return merged;
      });

      setUnmatchedHeadings(unmatched || []);
      setStep("editing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  function getActiveTemplateSections(): NodeTemplateSection[] {
    return templateSections.filter(
      (t) => !disabledConditionals.has(t.sectionKey)
    );
  }

  function getValidationErrors(): string[] {
    const errors: string[] = [];
    for (const t of getActiveTemplateSections()) {
      if (t.isRequired && t.displayLayer === "CHAPTER") {
        const content = sectionContents[t.sectionKey]?.trim();
        if (!content) {
          errors.push(t.sectionTitle);
        }
      }
    }
    return errors;
  }

  async function handlePublish() {
    setError("");

    if (useLegacy) {
      if (!legacySummary.trim()) {
        setError("Summary content is required");
        return;
      }
    } else {
      const missing = getValidationErrors();
      if (missing.length > 0) {
        setError(`Required CHAPTER sections missing: ${missing.join(", ")}`);
        return;
      }
    }

    setStep("publishing");

    try {
      const body: Record<string, unknown> = {
        status: "complete",
        triggerCascade: isRevision && triggerCascade,
      };

      if (useLegacy) {
        body.execSummary = legacySummary;
      } else {
        body.sections = getActiveTemplateSections()
          .filter((t) => sectionContents[t.sectionKey]?.trim())
          .map((t) => ({
            sectionKey: t.sectionKey,
            sectionTitle: t.sectionTitle,
            content: sectionContents[t.sectionKey],
            sortOrder: t.sortOrder,
            displayLayer: t.displayLayer,
          }));
      }

      const res = await fetch(`/api/nodes/${nodeKey}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Publish failed");
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
      setStep("editing");
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

  const activeSections = getActiveTemplateSections();
  const chapterSections = activeSections.filter((t) => t.displayLayer === "CHAPTER");
  const fullSections = activeSections.filter((t) => t.displayLayer === "FULL");
  const filledCount = activeSections.filter(
    (t) => sectionContents[t.sectionKey]?.trim()
  ).length;
  const requiredChapterCount = chapterSections.filter((t) => t.isRequired).length;
  const filledRequiredChapterCount = chapterSections.filter(
    (t) => t.isRequired && sectionContents[t.sectionKey]?.trim()
  ).length;

  return (
    <div className="min-h-screen bg-otm-light">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-8 w-auto" />
          <span className="font-outfit font-semibold text-otm-navy text-sm">
            Admin
          </span>
          <Link href="/admin" className="text-xs text-otm-teal hover:underline">
            &larr; All nodes
          </Link>
        </div>
        <Link href="/portal/strategy" className="text-xs text-otm-teal hover:underline">
          View client portal &rarr;
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
          <div className="flex items-center gap-3">
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
            {!useLegacy && templateSections.length > 0 && step === "editing" && (
              <span className="text-xs text-gray-400">
                {filledCount} of {activeSections.length} sections filled
                {requiredChapterCount > 0 && (
                  <> &middot; {filledRequiredChapterCount}/{requiredChapterCount} required chapters</>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Flag warning */}
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

        {/* Upload area */}
        {(step === "idle" || step === "done") && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <p className="text-sm text-gray-500 mb-3">
              {step === "done"
                ? "Upload another document to revise"
                : "Upload a .docx file — sections will be auto-parsed from Heading 1 markers"}
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
            {!useLegacy && step === "idle" && templateSections.length > 0 && (
              <button
                onClick={() => setStep("editing")}
                className="ml-4 text-sm text-otm-teal hover:underline"
              >
                Or write sections directly
              </button>
            )}
          </div>
        )}

        {/* Parsing progress */}
        {(step === "uploading" || step === "parsing") && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-otm-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-otm-gray">
                {step === "uploading" ? "Uploading..." : "Parsing document sections..."}
              </p>
            </div>
          </div>
        )}

        {/* Publishing progress */}
        {step === "publishing" && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-otm-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-otm-gray">Publishing...</p>
            </div>
          </div>
        )}

        {/* Unmatched headings warning */}
        {step === "editing" && unmatchedHeadings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 font-medium mb-1">
              {unmatchedHeadings.length} heading{unmatchedHeadings.length > 1 ? "s" : ""} not matched to template
            </p>
            <ul className="text-xs text-amber-700 list-disc pl-4">
              {unmatchedHeadings.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload filename badge */}
        {step === "editing" && uploadedFilename && !useLegacy && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-400">Parsed from:</span>
            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-otm-gray">
              {uploadedFilename}
            </span>
          </div>
        )}

        {/* Conditional section toggle */}
        {step === "editing" && !useLegacy && hasConditionalSections && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={disabledConditionals.size === 0}
                onChange={toggleConditionalSections}
                className="rounded border-gray-300 text-otm-teal focus:ring-otm-teal"
              />
              <div>
                <span className="text-sm font-medium text-otm-navy">
                  Include Voice of Customer sections
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Enable when the engagement includes primary research (interviews/surveys)
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Section editor */}
        {step === "editing" && !useLegacy && (
          <div className="space-y-4">
            {/* CHAPTER sections */}
            {chapterSections.length > 0 && (
              <div>
                <h2 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3 flex items-center gap-2">
                  Chapter Sections
                  <span className="text-[10px] bg-otm-teal/10 text-otm-teal px-1.5 py-0.5 rounded normal-case tracking-normal">
                    Client-facing
                  </span>
                </h2>
                <div className="space-y-3">
                  {chapterSections.map((t) => (
                    <SectionEditor
                      key={t.sectionKey}
                      template={t}
                      content={sectionContents[t.sectionKey] || ""}
                      onChange={(val) => updateSectionContent(t.sectionKey, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* FULL sections */}
            {fullSections.length > 0 && (
              <div>
                <h2 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3 mt-6 flex items-center gap-2">
                  Detail Sections
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded normal-case tracking-normal">
                    Behind expander / download
                  </span>
                </h2>
                <div className="space-y-3">
                  {fullSections.map((t) => (
                    <SectionEditor
                      key={t.sectionKey}
                      template={t}
                      content={sectionContents[t.sectionKey] || ""}
                      onChange={(val) => updateSectionContent(t.sectionKey, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cascade trigger checkbox — only for revisions */}
            {isRevision && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
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
                      has changed. Leave unchecked for informational updates.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Publish button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handlePublish}
                disabled={filledRequiredChapterCount < requiredChapterCount}
                className="bg-otm-teal text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-otm-teal/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Publish to portal
              </button>
              <button
                onClick={() => {
                  setStep("idle");
                  setSectionContents({});
                  setUnmatchedHeadings([]);
                  setUploadedFilename("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5"
              >
                Cancel
              </button>
              {filledRequiredChapterCount < requiredChapterCount && (
                <span className="text-xs text-gray-400">
                  All required chapter sections must have content to publish
                </span>
              )}
            </div>
          </div>
        )}

        {/* Legacy single-textarea editor (fallback) */}
        {step === "editing" && useLegacy && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <h3 className="text-[11px] uppercase text-gray-400 tracking-[0.06em] mb-3">
              Executive Summary
            </h3>
            <textarea
              value={legacySummary}
              onChange={(e) => setLegacySummary(e.target.value)}
              rows={12}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-otm-gray leading-relaxed resize-y focus:outline-none focus:border-otm-teal"
            />

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
                      has changed. Leave unchecked for informational updates.
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
                  setLegacySummary("");
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
              Published successfully.
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

function SectionEditor({
  template,
  content,
  onChange,
}: {
  template: NodeTemplateSection;
  content: string;
  onChange: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isChapter = template.displayLayer === "CHAPTER";
  const hasContent = content.trim().length > 0;
  const looksLikeHtml = content.includes("<") && content.includes(">");

  return (
    <div
      className={`bg-white border rounded-lg p-4 ${
        isChapter ? "border-gray-200" : "border-gray-150 bg-gray-50/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Match indicator */}
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
            hasContent
              ? "bg-otm-teal/10 text-otm-teal"
              : "bg-gray-100 text-gray-300"
          }`}>
            {hasContent ? "✓" : "○"}
          </span>
          <h4 className="text-sm font-medium text-otm-navy">
            {template.sectionTitle}
          </h4>
          {template.isRequired && (
            <span className="text-red-400 text-xs">*</span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              isChapter
                ? "bg-otm-teal/10 text-otm-teal"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {template.displayLayer}
          </span>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-[11px] text-gray-400 hover:text-otm-teal transition-colors px-2 py-1 rounded hover:bg-gray-50"
        >
          {editing ? "Preview" : hasContent ? "Edit" : "Write"}
        </button>
      </div>
      {template.description && (
        <p className="text-xs text-gray-400 mb-2 ml-7">{template.description}</p>
      )}

      {editing ? (
        <div className="ml-7">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            rows={isChapter ? 6 : 4}
            placeholder={looksLikeHtml
              ? "Edit HTML content..."
              : `Enter ${template.sectionTitle.toLowerCase()} content (HTML supported)...`
            }
            className="w-full border border-gray-200 rounded-lg p-3 text-sm text-otm-gray leading-relaxed resize-y focus:outline-none focus:border-otm-teal font-mono text-xs"
          />
        </div>
      ) : hasContent ? (
        <div className="ml-7 border border-gray-100 rounded-lg p-3 bg-gray-50/30">
          <SectionHtml content={content} />
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic ml-7">
          {template.isRequired ? "Required — not yet populated" : "Optional — not found in document"}
        </p>
      )}
    </div>
  );
}
