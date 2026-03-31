import TopBar from "@/components/TopBar";
import LifecycleBar from "@/components/LifecycleBar";
import StageCard from "@/components/StageCard";
import { getEngagementFresh } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const engagement = getEngagementFresh();
  const completed = engagement.nodes.filter((n) => n.status === "complete").length;
  const total = engagement.nodes.length;

  return (
    <div className="min-h-screen bg-otm-light">
      <TopBar clientName={engagement.clientName} />
      <main className="max-w-[960px] mx-auto px-6 pt-8 pb-16">
        <LifecycleBar />
        <StageCard completedCount={completed} totalCount={total} />
      </main>
    </div>
  );
}
