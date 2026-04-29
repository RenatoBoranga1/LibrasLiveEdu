"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/features/auth/AuthProvider";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout().finally(() => router.replace("/"));
  }, [logout, router]);

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto max-w-lg px-4 py-10">
        <div role="status" className="rounded-lg bg-white p-6 text-lg font-black text-ink shadow-soft dark:bg-zinc-900 dark:text-white">
          Saindo com seguranca...
        </div>
      </div>
    </main>
  );
}
