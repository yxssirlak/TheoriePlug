"use client";

import { createContext, useContext } from "react";

export type PlatformUser = {
  id: string;
  email: string;
  name: string;
};

const UserContext = createContext<PlatformUser | null>(null);

export const UserProvider = UserContext.Provider;

export function useOptionalUser(): PlatformUser | null {
  return useContext(UserContext);
}

export function useUser(): PlatformUser {
  const user = useOptionalUser();
  if (!user) throw new Error("useUser moet binnen de leeromgeving gebruikt worden.");
  return user;
}
