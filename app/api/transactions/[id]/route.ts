import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { criarRegraApartirDeManual } from "@/lib/categorization/rules-engine";

// PUT: Atualiza valor, data e categoria de uma transação
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const { valor, data, categoriaId } = body;

    if (valor === undefined || !data) {
      return NextResponse.json({ erro: "Campos 'valor' e 'data' são obrigatórios." }, { status: 400 });
    }

    const transacao = await db.transacao.update({
      where: { id },
      data: {
        valor: parseFloat(valor),
        data: new Date(data),
        categoriaId: categoriaId || null,
        tipo: parseFloat(valor) >= 0 ? "RECEITA" : "DESPESA",
        origemCategoria: "MANUAL",
      },
      include: { categoria: true },
    });

    if (categoriaId) {
      try {
        await criarRegraApartirDeManual(transacao.descricaoOriginal, categoriaId, transacao.empresaId);
      } catch (e) {
        console.error("Erro ao criar regra a partir da categorização manual:", e);
      }
    }

    return NextResponse.json(transacao);
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}

// DELETE: Exclui uma transação
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await db.transacao.delete({
      where: { id },
    });
    return NextResponse.json({ sucesso: true });
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
