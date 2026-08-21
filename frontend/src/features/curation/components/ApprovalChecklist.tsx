import { CheckCircle2, Circle } from "lucide-react";
import type { SignRecord } from "@/types/live";

export function ApprovalChecklist({ sign }: { sign: SignRecord }) {
  const animatedMedia = Boolean(sign.avatar_video_url || sign.video_url || sign.avatar_gif_url || sign.avatar_animation_url);
  const items = [
    { label: "Palavra ou glosa identificada", complete: Boolean(sign.word && (sign.gloss || animatedMedia)) },
    { label: "Fonte registrada", complete: Boolean(sign.source_name && sign.source_url) },
    { label: "Licença e observações registradas", complete: Boolean(sign.license && sign.license_notes) },
    { label: "Mídia animada disponível para o Avatar", complete: animatedMedia },
  ];
  return <section aria-labelledby="approval-checklist-title" className="rounded-lg border border-ink/10 bg-teal-50 p-4 dark:border-white/10 dark:bg-zinc-800"><h3 id="approval-checklist-title" className="text-sm font-extrabold text-ink dark:text-white">Checklist de aprovação</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item.label} className="flex items-start gap-2 text-sm font-semibold text-ink/75 dark:text-white/75">{item.complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ocean dark:text-mint" aria-hidden="true" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-strong" aria-hidden="true" />}<span>{item.label}<span className="sr-only">: {item.complete ? "concluído" : "pendente"}</span></span></li>)}</ul>{!animatedMedia && sign.image_url ? <p className="mt-3 rounded-lg bg-amber/25 p-3 text-xs font-extrabold text-ink dark:text-white">Imagem estática é apoio visual. Ela não torna o sinal pronto para o Avatar Libras.</p> : null}</section>;
}
