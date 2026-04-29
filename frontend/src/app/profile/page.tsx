"use client";

import Link from "next/link";
import { ShieldCheck, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useAuth, useRequireRole } from "@/features/auth/AuthProvider";
import { deleteMyData } from "@/services/api";

export default function ProfilePage() {
  useRequireRole(["admin", "professor", "student", "curator", "guardian"]);
  const { user, logout } = useAuth();

  async function requestDeletion() {
    await deleteMyData().catch(() => undefined);
    await logout();
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-ocean dark:text-mint" aria-hidden="true" />
            <h1 className="text-3xl font-black text-ink dark:text-white">Meu perfil</h1>
          </div>
          <dl className="mt-6 grid gap-3 text-sm font-semibold text-ink/75 dark:text-white/75">
            <div className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
              <dt>Nome</dt>
              <dd className="text-lg font-black text-ink dark:text-white">{user?.name}</dd>
            </div>
            <div className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
              <dt>E-mail</dt>
              <dd className="text-lg font-black text-ink dark:text-white">{user?.email}</dd>
            </div>
            <div className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
              <dt>Perfil</dt>
              <dd className="text-lg font-black text-ink dark:text-white">{user?.role}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="focus-ring inline-flex min-h-12 items-center rounded-lg bg-ocean px-4 py-3 font-bold text-white" href="/data-rights">
              Direitos de dados
            </Link>
            <ActionButton tone="danger" onClick={requestDeletion}>
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              Apagar meus dados
            </ActionButton>
          </div>
        </div>
      </section>
    </main>
  );
}
