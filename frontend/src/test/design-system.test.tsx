import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/FormControls";
import { Table } from "@/components/ui/Table";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}>Abrir detalhes</Button><Dialog open={open} title="Detalhes do sinal" onClose={() => setOpen(false)}><Button>Primeira ação</Button><a href="/admin">Última ação</a></Dialog></>;
}

describe("design system", () => {
  it("renders typed button, badge and labeled field variants", () => {
    render(<><Button variant="danger" size="lg">Excluir</Button><Badge variant="approved">Aprovado</Badge><Input label="Palavra" name="word" /></>);
    expect(screen.getByRole("button", { name: "Excluir" })).toHaveClass("bg-red-700", "min-h-12");
    expect(screen.getByText("Aprovado")).toHaveClass("bg-ocean");
    expect(screen.getByRole("textbox", { name: "Palavra" })).toBeInTheDocument();
  });

  it("traps dialog focus, closes with Escape and restores focus", () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Abrir detalhes" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog", { name: "Detalhes do sinal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar Detalhes do sinal" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("renders table loading, empty, error and data states", () => {
    const columns = [{ key: "name", header: "Nome", cell: (row: { id: number; name: string }) => row.name }];
    const { rerender } = render(<Table columns={columns} rows={[]} rowKey={(row) => row.id} caption="Sinais" loading />);
    expect(screen.getByRole("status", { name: "Carregando tabela" })).toBeInTheDocument();
    rerender(<Table columns={columns} rows={[]} rowKey={(row) => row.id} caption="Sinais" />);
    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
    rerender(<Table columns={columns} rows={[]} rowKey={(row) => row.id} caption="Sinais" error="Falha ao carregar" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao carregar");
    rerender(<Table columns={columns} rows={[{ id: 1, name: "aprender" }]} rowKey={(row) => row.id} caption="Sinais" />);
    expect(screen.getByRole("table", { name: "Sinais" })).toHaveTextContent("aprender");
  });
});
