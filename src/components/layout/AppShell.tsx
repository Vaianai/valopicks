import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
