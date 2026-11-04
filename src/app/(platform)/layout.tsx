import type { ReactNode } from "react";
import DashboardShell from "../../components/dashboard/DashboardShell";

// De leeromgeving laadt de gebruiker client-side in, dus deze segmenten mogen blokkeren bij navigatie
export const instant = false;

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
