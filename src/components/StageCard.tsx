import Link from "next/link";

export default function StageCard({
  completedCount,
  totalCount,
}: {
  completedCount: number;
  totalCount: number;
}) {
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 border-l-[3px] border-l-otm-teal">
      <h3 className="font-outfit font-semibold text-otm-navy text-lg mb-2">
        Stage 1: Prove the Strategy
      </h3>
      <p className="text-otm-gray text-sm leading-relaxed mb-4">
        We develop your positioning, define your ICP, and build a messaging
        framework, then put it in front of real buyers to see what lands. You
        don&apos;t leave this stage with a document. You leave with proof.
      </p>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">
            {completedCount} of {totalCount} deliverables complete
          </span>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
        <div className="h-[3px] bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-otm-teal rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Link
        href="/strategy"
        className="inline-flex items-center gap-1 bg-otm-teal text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-otm-teal/90 transition-colors"
      >
        View your strategy progress &rarr;
      </Link>
    </div>
  );
}
