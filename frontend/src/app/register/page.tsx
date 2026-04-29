"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { useAuth } from "@/features/auth/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("professor");
  const [schoolName, setSchoolName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await register({
        name,
        email,
        password,
        role,
        school_name: schoolName,
        guardian_email: guardianEmail || undefined,
      });
      router.replace(response.user.role === "admin" || response.user.role === "curator" ? "/admin" : "/profile");
    } catch {
      setError("Nao foi possivel criar a conta. Use uma senha com 8 ou mais caracteres e confira o e-mail.");
    }
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto grid max-w-2xl gap-4 px-4 py-8">
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <h1 className="text-3xl font-black text-ink dark:text-white">Criar conta</h1>
          <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">
            O aluno pode entrar por codigo sem conta. Use cadastro para professor, curador, responsavel ou administracao.
          </p>
          {error && (
            <div role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">
              {error}
            </div>
          )}
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              Nome
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              E-mail
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              Senha
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              Perfil
              <select className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="professor">Professor</option>
                <option value="student">Aluno logado</option>
                <option value="guardian">Responsavel</option>
                <option value="curator">Curador</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              Escola
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} />
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              E-mail do responsavel, quando aplicavel
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} />
            </label>
            <p className="rounded-lg bg-teal-50 p-3 text-sm font-semibold text-ink/75 dark:bg-zinc-800 dark:text-white/75">
              Ao continuar, voce declara ciencia dos termos e da politica de privacidade educacional.
            </p>
            <ActionButton>
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              Cadastrar
            </ActionButton>
          </form>
        </div>
        <InstitutionalNotice />
      </section>
    </main>
  );
}
