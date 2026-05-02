import Link from "next/link";
import { Lock } from "lucide-react";
import TopBar from "@/components/TopBar";
import GrowthLifecycle from "@/components/GrowthLifecycle";
import { getEngagementFresh } from "@/lib/data-store";
import { getUserEngagementId, getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ engagement?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const engagementId = await getUserEngagementId(sp.engagement);
  if (!engagementId) redirect("/login");

  const engagement = await getEngagementFresh(engagementId);
  const visibleNodes = engagement.nodes.filter((n) => !n.excluded);
  const completed = visibleNodes.filter((n) => n.status === "complete").length;
  const total = visibleNodes.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const strategyHref =
    user.role === "ADMIN"
      ? `/portal/strategy?engagement=${engagementId}`
      : "/portal/strategy";

  return (
    <div className="min-h-screen bg-otm-light">
      <TopBar clientName={engagement.clientName} />
      <main className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
        <GrowthLifecycle currentStage={engagement.lifecycleStage} />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActiveStageCard
            label="Stage 1"
            title="Prove the Strategy"
            description="We develop your positioning, define your ICP, and build a messaging framework, then put it in front of real buyers to see what lands. You don't leave this stage with a document. You leave with proof."
            completed={completed}
            total={total}
            pct={pct}
            href={strategyHref}
          />
          <LockedStageCard
            label="Stage 2"
            title="Prove the Tactics"
            description="Test the strategy in market — campaigns, channels, and offers prove what drives growth before you scale."
            unlocksAfter="Prove the Strategy"
          />
          <LockedStageCard
            label="Stage 3"
            title="Prove the Model"
            description="Scale what works — repeatable processes, measurable outcomes, profitable growth at scale."
            unlocksAfter="Prove the Tactics"
          />
        </div>

      </main>
    </div>
  );
}

function ActiveStageCard({
  label,
  title,
  description,
  completed,
  total,
  pct,
  href,
}: {
  label: string;
  title: string;
  description: string;
  completed: number;
  total: number;
  pct: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-xl border border-gray-200 border-l-4 p-6 transition-shadow hover:shadow-md flex flex-col"
      style={{ borderLeftColor: "#e0f5f6" }}
    >
      <span
        className="font-outfit font-bold uppercase text-[11px] tracking-[0.1em] mb-1"
        style={{ color: "#e7a923" }}
      >
        {label}
      </span>
      <h3
        className="font-outfit font-bold text-[20px] leading-tight mb-3"
        style={{ color: "#0d354f" }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed mb-4" style={{ color: "#5b6577" }}>
        {description}
      </p>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">
            {completed} of {total} deliverables complete
          </span>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
        <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-otm-teal rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className="font-outfit font-bold text-[14px] inline-flex items-center gap-1"
          style={{ color: "#0d354f" }}
        >
          View Strategy <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

function LockedStageCard({
  label,
  title,
  description,
  unlocksAfter,
}: {
  label: string;
  title: string;
  description: string;
  unlocksAfter: string;
}) {
  return (
    <div
      className="relative bg-white rounded-xl border border-gray-200 p-6 flex flex-col opacity-60 cursor-default"
    >
      <Lock className="absolute top-4 right-4" size={16} color="#5b6577" />
      <span
        className="font-outfit font-bold uppercase text-[11px] tracking-[0.1em] mb-1"
        style={{ color: "#8a92a3" }}
      >
        {label}
      </span>
      <h3
        className="font-outfit font-bold text-[20px] leading-tight mb-3"
        style={{ color: "#0d354f" }}
      >
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed mb-4" style={{ color: "#5b6577" }}>
        {description}
      </p>
      <p className="mt-auto text-xs italic" style={{ color: "#8a92a3" }}>
        Unlocks after {unlocksAfter}
      </p>
    </div>
  );
}
