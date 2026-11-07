"use client";

import type { ReactNode } from "react";
import { useOptionalUser } from "./user-context";

export default function AuthenticatedPage({ children }: { children: ReactNode }) {
  return useOptionalUser() ? children : null;
}
