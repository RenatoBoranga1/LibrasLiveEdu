import { Button } from "@/components/ui/Button";

export function BulkActionsBar({ selectedCount, onClear, onReview }: { selectedCount: number; onClear: () => void; onReview: () => void }) {
  if (!selectedCount) return null;
  return <div role="status" className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink px-4 py-3 text-white shadow-elevated"><p className="text-sm font-extrabold">{selectedCount} {selectedCount === 1 ? "sinal selecionado" : "sinais selecionados"}</p><div className="flex gap-2"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" onClick={onClear}>Limpar</Button><Button variant="success" size="sm" onClick={onReview}>Revisar seleção</Button></div></div>;
}
