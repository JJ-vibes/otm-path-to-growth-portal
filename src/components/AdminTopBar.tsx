"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Crumb = { label: string; href?: string };

export default function AdminTopBar({
  crumbs = [],
  engagementId,
}: {
  crumbs?: Crumb[];
  engagementId?: string;
}) {
  const pathname = usePathname();
  const onEngagementsList = pathname === "/admin";

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-7 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-otm-navy bg-otm-teal/10 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </Link>
          <span className="h-5 w-px bg-gray-200 mx-1 shrink-0" aria-hidden />
          <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
            <Link
              href="/admin"
              className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                onEngagementsList
                  ? "bg-otm-teal/10 text-otm-teal"
                  : "text-otm-gray hover:text-otm-navy hover:bg-gray-50"
              }`}
            >
              Engagements
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1 shrink min-w-0">
                <span className="text-gray-300 shrink-0">/</span>
                {c.href ? (
                  <Link
                    href={c.href}
                    className="px-2.5 py-1 rounded-md text-otm-gray hover:text-otm-navy hover:bg-gray-50 truncate"
                    title={c.label}
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="px-2.5 py-1 text-otm-navy font-medium truncate" title={c.label}>
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/engagements/new"
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-otm-teal text-white hover:bg-otm-teal/90"
          >
            + New
          </Link>
          <Link
            href={engagementId ? `/portal?engagement=${engagementId}` : "/portal"}
            className="text-xs text-otm-teal hover:underline px-2 py-1"
          >
            View as client →
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[10px] text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-0.5 rounded"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
