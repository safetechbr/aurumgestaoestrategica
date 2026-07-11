import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { nome, tipo, escopo } = await req.json();

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ erro: "Nome da categoria é obrigatório" }, { status: 400 });
    }
    if (!tipo || (tipo !== "RECEITA" && tipo !== "DESPESA")) {
      return NextResponse.json({ erro: "Tipo da categoria inválido" }, { status: 400 });
    }
    if (escopo && escopo !== "EMPRESA" && escopo !== "PESSOAL") {
      return NextResponse.json({ erro: "Escopo da categoria inválido" }, { status: 400 });
    }

    // Busca a categoria para obter a empresaId correspondente
    const categoria = await db.categoria.findUnique({
      where: { id: params.id },
    });

    if (!categoria) {
      return NextResponse.json({ erro: "Categoria não encontrada" }, { status: 404 });
    }

    // Verifica se já existe outra categoria com esse nome para esta empresa
    const duplicada = await db.categoria.findFirst({
      where: {
        nome: nome.trim(),
        empresaId: categoria.empresaId,
        NOT: { id: params.id },
      },
    });

    if (duplicada) {
      return NextResponse.json({ erro: "Já existe outra categoria com este nome nesta empresa." }, { status: 400 });
    }

    const updated = await db.categoria.update({
      where: { id: params.id },
      data: {
        nome: nome.trim(),
        tipo,
        escopo: escopo || undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json({ erro: "Erro ao atualizar categoria" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // A deleção cascade/setNull está configurada nas relações do prisma schema:
    // - RegraCategorizacao: onDelete: Cascade
    // - Transacao: onDelete: SetNull
    await db.categoria.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return NextResponse.json({ erro: "Erro ao excluir categoria" }, { status: 500 });
  }
}
