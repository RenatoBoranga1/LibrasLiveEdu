import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/AsyncStates";

export type TableColumn<Row> = { key: string; header: ReactNode; cell: (row: Row) => ReactNode; className?: string };

export function Table<Row>({ columns, rows, rowKey, caption, loading = false, error, emptyMessage = "Nenhum registro encontrado." }: {
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  caption: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}) {
  if (loading) return <div role="status" aria-label="Carregando tabela" className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>;
  if (error) return <div role="alert" className="flex items-center gap-3 rounded-lg bg-red-100 p-4 font-bold text-red-900"><AlertCircle className="h-5 w-5" aria-hidden="true" />{error}</div>;
  if (!rows.length) return <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-ink/15 p-5 text-center text-sm font-semibold text-ink/65 dark:border-white/15 dark:text-white/65"><Inbox className="mb-2 h-7 w-7" aria-hidden="true" />{emptyMessage}</div>;
  return <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[680px] border-separate border-spacing-y-1 text-left text-sm"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-3 py-2 text-xs font-extrabold uppercase text-ink/55 dark:text-white/55 ${column.className ?? ""}`}>{column.header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(row)} className="bg-white dark:bg-zinc-950">{columns.map((column) => <td key={column.key} className={`border-y border-ink/8 px-3 py-3 first:rounded-l-lg first:border-l last:rounded-r-lg last:border-r dark:border-white/10 ${column.className ?? ""}`}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div>;
}
