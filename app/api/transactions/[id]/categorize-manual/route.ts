import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { criarRegraApartirDeManual } from "@/lib/categorization/rules-engine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { categoriaId, criarRegra } = await req.json();

    if (!categoriaId) {
      return NextResponse.json({ erro: "Informe 'categoriaId'." }, { status: 400 });
    }

    const transacao = await db.transacao.update({
      where: { id: params.id },
      data: { categoriaId, origemCategoria: "MANUAL" },
      select: { descricaoOriginal: true, empresaId: true },
    });

    // Por padrão, toda categorização manual vira uma regra nova —
    // é assim que o sistema aprende e reduz a lista manual com o tempo.
    if (criarRegra !== false) {
      await criarRegraApartirDeManual(transacao.descricaoOriginal, categoriaId, transacao.empresaId);
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
