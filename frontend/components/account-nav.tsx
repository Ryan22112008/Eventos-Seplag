"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AccountNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return <nav className="account-nav" aria-label="Navegação principal">
    {links.map((item) => {
      const exactOnly = ["/participante", "/organizador", "/admin"].includes(item.href);
      const current = pathname === item.href || (!exactOnly && pathname.startsWith(`${item.href}/`));
      return <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>{item.label}</Link>;
    })}
  </nav>;
}
