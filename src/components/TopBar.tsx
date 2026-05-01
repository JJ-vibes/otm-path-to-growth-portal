"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function TopBar({
  clientName,
  clientLogoUrl,
}: {
  clientName: string;
  clientLogoUrl?: string | null;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isStrategy = pathname === "/portal/strategy";
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {clientLogoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/documents/${encodeURIComponent(clientLogoUrl)}`}
              alt={`${clientName} logo`}
              className="h-8 w-auto max-w-[160px] object-contain"
            />
            <span className="h-6 w-px bg-gray-200" aria-hidden />
          </>
        )}
        <Link href="/portal">
          <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-8 w-auto" />
        </Link>
        {isStrategy && (
          <Link
            href="/portal"
            className="text-xs text-otm-teal hover:underline ml-2"
          >
            &larr; Home
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-otm-gray text-sm font-lato">{clientName}</span>
        {isAdmin && (
          <Link
            href="/admin"
            className="text-[10px] text-gray-400 hover:text-otm-teal border border-gray-200 px-2 py-0.5 rounded"
          >
            Admin
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-[10px] text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-0.5 rounded"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
