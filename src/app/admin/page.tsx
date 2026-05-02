import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminTopBar from "@/components/AdminTopBar";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const engagements = await prisma.engagement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      nodes: { orderBy: { sortOrder: "asc" } },
      users: { include: { user: true } },
    },
  });

  return (
    <div className="min-h-screen bg-otm-light">
      <AdminTopBar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-outfit font-bold text-otm-navy text-xl mb-6">
          Engagements
        </h1>

        <div className="space-y-3">
          {engagements.map((eng) => {
            const completed = eng.nodes.filter((n) => n.status === "complete").length;
            const clients = eng.users
              .filter((u) => u.user.role === "CLIENT")
              .map((u) => u.user.name || u.user.email);

            return (
              <Link
                key={eng.id}
                href={`/admin/engagements/${eng.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-otm-teal/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-outfit font-semibold text-otm-navy text-sm">
                      {eng.clientName}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {completed} of {eng.nodes.length} complete
                      {clients.length > 0 && ` · ${clients.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-otm-teal/10 text-otm-teal px-2 py-0.5 rounded-full">
                      {eng.lifecycleStage}
                    </span>
                    <span className="text-gray-400 text-sm">&rarr;</span>
                  </div>
                </div>
              </Link>
            );
          })}

          {engagements.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              No engagements yet. Create one to get started.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
