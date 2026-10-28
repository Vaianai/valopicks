"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useTranslation } from "@/components/layout/LanguageContext";
import { LANGUAGES, type Lang } from "@/lib/i18n";

const navLinks = [
  { key: "nav.home", href: "/" },
  { key: "nav.fantasy", href: "/fantasy" },
  { key: "nav.events", href: "/events" },
  { key: "nav.matches", href: "/matches" },
  { key: "nav.players", href: "/players" },
  { key: "nav.social", href: "/social" },
  { key: "nav.tournaments", href: "/tournaments" },
];

export function Navbar() {
  const { t, lang, setLang } = useTranslation();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === lang);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--vp-border)] bg-[#080e16]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--vp-accent)]">
            <span className="font-title text-sm font-black text-[#0f1923]">VP</span>
          </div>
          <span className="font-title text-lg font-bold uppercase tracking-widest text-[var(--vp-text)] group-hover:text-[var(--vp-accent)] transition-colors">
            ValoPicks
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                pathname === link.href
                  ? "text-[var(--vp-accent)] bg-[var(--vp-accent-dim)]"
                  : "text-[var(--vp-text-muted)] hover:text-[var(--vp-text)]"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <button
              id="lang-switcher-btn"
              onClick={() => setLangOpen((v) => !v)}
              className="vp-btn vp-btn-ghost text-sm px-2 py-1.5 gap-1"
            >
              <span>{currentLang?.flag}</span>
              <span className="hidden sm:inline text-xs font-bold">{currentLang?.code.toUpperCase()}</span>
              <svg className="w-3 h-3 opacity-50" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6z" />
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 vp-card-static p-1 min-w-[140px] shadow-2xl z-50 animate-fade-in">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    id={`lang-${l.code}`}
                    onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5 transition-colors ${
                      lang === l.code
                        ? "text-[var(--vp-accent)] bg-[var(--vp-accent-dim)]"
                        : "text-[var(--vp-text-muted)] hover:text-[var(--vp-text)]"
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auth */}
          {session?.user ? (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-[var(--vp-border)]" />
              )}
              <span className="hidden sm:block text-sm text-[var(--vp-text-muted)] max-w-[100px] truncate">{session.user.name}</span>
              <button onClick={() => signOut()} className="vp-btn vp-btn-ghost text-xs px-2.5 py-1.5">
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <button
              id="discord-login-btn"
              onClick={() => signIn("discord")}
              className="vp-btn vp-btn-discord text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              {t("nav.login")}
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-btn"
            className="lg:hidden vp-btn vp-btn-ghost px-2"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--vp-border)] bg-[#080e16] px-4 py-3 animate-fade-in">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-semibold ${
                  pathname === link.href ? "text-[var(--vp-accent)] bg-[var(--vp-accent-dim)]" : "text-[var(--vp-text-muted)]"
                }`}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
