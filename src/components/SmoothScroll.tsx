"use client";

import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./dashboard/nav";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const portalPath = pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/beheer" || pathname.startsWith("/beheer/") ||
    NAV_ITEMS.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  if (portalPath) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.2, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}