"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/layout/LanguageContext";

export function Providers({ children, session }: { children: ReactNode; session?: Session | null }) {
  return (
    <SessionProvider session={session}>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}
