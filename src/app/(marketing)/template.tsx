import type { ReactNode } from "react";

// Een template wordt bij elke navigatie opnieuw opgebouwd, waardoor de pagina-overgang steeds afspeelt.
export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
