"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LogOut, Menu, X } from "lucide-react";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";
import { Button, buttonClassName } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRoleHome, getRoleNavigationLabel, normalizeAuthRole } from "@/features/auth/roles";

type NavigationItem = { href: string; label: string };

function navigationForRole(role?: string | null): NavigationItem[] {
  const publicItems = [{ href: "/about", label: "Projeto" }];
  switch (normalizeAuthRole(role)) {
    case "admin":
      return [...publicItems, { href: "/admin", label: "Administração" }, { href: "/admin/add-words", label: "Adicionar palavras" }];
    case "curator":
      return [...publicItems, { href: "/admin", label: "Curadoria" }, { href: "/admin/add-words", label: "Adicionar palavras" }];
    case "professor":
      return [...publicItems, { href: "/teacher", label: "Sala do professor" }];
    case "student":
      return [...publicItems, { href: "/aluno", label: "Área do aluno" }];
    default:
      return [...publicItems, { href: "/aluno", label: "Aluno" }, { href: "/teacher", label: "Professor" }];
  }
}

function SessionActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) {
    return <span aria-label="Verificando sessão" className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-ink/5 px-3 text-sm font-bold text-ink/55 dark:bg-white/10 dark:text-white/60" role="status">Verificando...</span>;
  }
  if (isAuthenticated && user) {
    return <div className="flex flex-wrap items-center gap-2">
      <Link className={buttonClassName({ variant: "secondary", size: "sm" })} href={getRoleHome(user.role)} onClick={onNavigate} title={user.name}>
        <span className="max-w-36 truncate">{getRoleNavigationLabel(user.role)}</span>
      </Link>
      <Link aria-label={`Sair da conta de ${user.name}`} className={buttonClassName({ variant: "ghost", size: "sm" })} href="/logout" onClick={onNavigate}>
        <LogOut className="h-4 w-4" aria-hidden="true" /><span>Sair</span>
      </Link>
    </div>;
  }
  return <Link className={buttonClassName({ variant: "primary", size: "sm" })} href="/login" onClick={onNavigate}>Entrar<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>;
}

function NavigationLinks({ items, onNavigate }: { items: NavigationItem[]; onNavigate?: () => void }) {
  return <>{items.map((item) => <Link key={item.href} className="focus-ring touch-target inline-flex items-center rounded-lg px-3 py-2 text-sm font-bold text-ink/70 hover:bg-ink/5 hover:text-ocean dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-mint" href={item.href} onClick={onNavigate}>{item.label}</Link>)}</>;
}

export function AppHeader() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigation = navigationForRole(user?.role);

  return <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <Link href="/" className="focus-ring rounded-lg" aria-label="Início do LibrasLive Edu"><LibrasLiveLogo /></Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
        <NavigationLinks items={navigation} /><SessionActions />
      </nav>
      <Button className="md:hidden" variant="ghost" size="sm" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((value) => !value)}>
        {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </Button>
    </div>
    {mobileOpen ? <nav id="mobile-navigation" className="border-t border-ink/10 px-4 py-3 dark:border-white/10 md:hidden" aria-label="Navegação principal no celular">
      <div className="mx-auto grid max-w-7xl gap-1"><NavigationLinks items={navigation} onNavigate={() => setMobileOpen(false)} /><div className="mt-2 border-t border-ink/10 pt-3 dark:border-white/10"><SessionActions onNavigate={() => setMobileOpen(false)} /></div></div>
    </nav> : null}
  </header>;
}
