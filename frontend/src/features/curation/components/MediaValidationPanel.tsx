import { Button } from "@/components/ui/Button";
import { InlineFeedback } from "@/components/ui/Feedback";
import type { MediaValidationResult } from "@/services/mediaApi";

export function MediaValidationPanel({ result, onValidate }: { result: MediaValidationResult | null; onValidate: () => void }) {
  return <section className="rounded-lg border border-ink/10 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800" aria-labelledby="media-validation-title"><div className="flex flex-wrap items-center justify-between gap-2"><h3 id="media-validation-title" className="text-sm font-extrabold text-ink dark:text-white">Validação da mídia animada</h3><Button variant="secondary" size="sm" onClick={onValidate}>Testar mídia</Button></div>{result ? <InlineFeedback className="mt-3" variant={result.valid ? "success" : "error"} title={result.valid ? "Mídia validada" : "Mídia inválida"}><p>HTTP: {result.status_code ?? "-"} · Content-Type: {result.content_type ?? "-"}</p><p className="break-all">URL final: {result.final_url || result.url}</p><p>{result.reason}</p>{!result.valid ? <p className="mt-2 font-extrabold">Não aprove esta URL como mídia do Avatar.</p> : null}</InlineFeedback> : <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">Teste URLs novas de vídeo, GIF ou animação antes de salvar e aprovar.</p>}</section>;
}
