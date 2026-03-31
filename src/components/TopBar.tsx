"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopBar({ clientName }: { clientName: string }) {
  const pathname = usePathname();
  const isStrategy = pathname === "/strategy";

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Image src="/otm-logo.png" alt="OTM" width={80} height={32} className="h-8 w-auto" />
        </Link>
        {isStrategy && (
          <Link
            href="/"
            className="text-xs text-otm-teal hover:underline ml-2"
          >
            &larr; Home
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-otm-gray text-sm font-lato">{clientName}</span>
        <Link
          href="/admin"
          className="text-[10px] text-gray-400 hover:text-otm-teal border border-gray-200 px-2 py-0.5 rounded"
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
