import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEngagementFresh } from "@/lib/data-store";
import { getSessionUser } from "@/lib/session";
import OverviewTab from "./OverviewTab";
import UsersTab from "./UsersTab";
import SettingsTab from "./SettingsTab";
import BrandingTab from "./BrandingTab";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "nodes", label: "Nodes" },
  { key: "users", label: "Users" },
  { key: "settings", label: "Settings" },
  { key: "branding", label: "Branding" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function EngagementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const tab = (sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "overview") as TabKey;

  let engagement;
  try {
    engagement = await getEngagementFresh(id);
  } catch {
    notFound();
  }

  // Fetch the underlying Engagement row for tabs that need raw fields
  const engagementRow = await prisma.engagement.findUnique({
    where: { id },
    select: {
      id: true,
      clientName: true,
      lifecycleStage: true,
      clientLogoUrl: true,
      internalNotes: true,
      createdAt: true,
    },
  });
  if (!engagementRow) notFound();

  return (
    <div className="min-h-screen bg-otm-light">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-8 w-auto" />
          <span className="font-outfit font-semibold text-otm-navy text-sm">Admin</span>
          <Link href="/admin" className="text-xs text-otm-teal hover:underline">
            &larr; All engagements
          </Link>
        </div>
        <span className="text-sm text-otm-gray">{engagement.clientName}</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-outfit font-bold text-otm-navy text-xl mb-1">
          {engagement.clientName}
        </h1>
        <p className="text-xs text-gray-500 mb-6">
          Stage 1 engagement &middot; Created{" "}
          {new Date(engagementRow.createdAt).toLocaleDateString()}
        </p>

        {/* Tab navigation */}
        <nav className="flex gap-1 border-b border-gray-200 mb-6">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={`/admin/engagements/${id}?tab=${t.key}`}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  active
                    ? "border-otm-teal text-otm-navy"
                    : "border-transparent text-gray-500 hover:text-otm-navy"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {tab === "overview" && (
          <OverviewTab
            engagement={{
              id: engagementRow.id,
              clientName: engagementRow.clientName,
              lifecycleStage: engagementRow.lifecycleStage,
              internalNotes: engagementRow.internalNotes,
            }}
          />
        )}
        {tab === "nodes" && (
          <NodesList engagementId={id} nodes={engagement.nodes} />
        )}
        {tab === "users" && <UsersTab engagementId={id} />}
        {tab === "settings" && <SettingsTab engagementId={id} />}
        {tab === "branding" && (
          <BrandingTab
            engagementId={id}
            clientLogoUrl={engagementRow.clientLogoUrl}
          />
        )}
      </main>
    </div>
  );
}

function NodesList({
  engagementId,
  nodes,
}: {
  engagementId: string;
  nodes: Awaited<ReturnType<typeof getEngagementFresh>>["nodes"];
}) {
  return (
    <div className="space-y-3">
      {nodes.map((node) => (
        <Link
          key={node.nodeKey}
          href={`/admin/nodes/${node.nodeKey}?engagement=${engagementId}`}
          className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-otm-teal/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-outfit font-semibold text-otm-navy text-sm">
                  {node.sortOrder}. {node.displayName}
                </span>
                {node.isGate && (
                  <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                    Gate
                  </span>
                )}
                {node.isConditional && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    Conditional
                  </span>
                )}
                {node.lockedIn && (
                  <span className="text-[10px] bg-otm-navy text-white px-1.5 py-0.5 rounded">
                    Locked In
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate max-w-lg">
                {node.execSummary
                  ? node.execSummary.slice(0, 100) + "..."
                  : "No summary yet"}
              </p>
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
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {node.status}
              </span>
              <span className="text-gray-400 text-sm">&rarr;</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
