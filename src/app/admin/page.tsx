import Image from "next/image";
import Link from "next/link";
import { getEngagementFresh } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const engagement = getEngagementFresh();

  return (
    <div className="min-h-screen bg-otm-light">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-8 w-auto" />
          <span className="font-outfit font-semibold text-otm-navy text-sm">
            Admin
          </span>
          <Link href="/" className="text-xs text-otm-teal hover:underline">
            &larr; View portal
          </Link>
        </div>
        <span className="text-sm text-otm-gray">{engagement.clientName}</span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-outfit font-bold text-otm-navy text-xl mb-6">
          Manage Deliverables
        </h1>

        <div className="space-y-3">
          {engagement.nodes.map((node) => (
            <Link
              key={node.nodeKey}
              href={`/admin/nodes/${node.nodeKey}`}
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
      </main>
    </div>
  );
}
