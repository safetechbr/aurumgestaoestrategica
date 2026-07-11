import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Lista as transações da empresa no período selecionado
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const importacaoId = searchParams.get("importacaoId");
  const onlyCategorized = searchParams.get("onlyCategorized");

  if (!empresaId) {
    return NextResponse.json({ erro: "Informe 'empresaId'." }, { status: 400 });
  }

  const where: any = {
    empresaId,
    ...(importacaoId ? { importacaoId } : {}),
    ...(onlyCategorized === "true" ? { categoriaId: { not: null } } : {}),
    ...(!importacaoId && dataInicio && dataFim
      ? { data: { gte: new Date(dataInicio), lte: new Date(dataFim) } }
      : {}),
  };

  try {
    const transacoes = await db.transacao.findMany({
      where,
      include: { categoria: true },
      orderBy: { data: "desc" },
    });

    return NextResponse.json(transacoes);
  } catch (error: any) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
}
