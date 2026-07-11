import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executarCruzamentoAutomatico } from "@/lib/matching-engine";

export const dynamic = "force-dynamic";

// Lista as transações que ainda precisam de categorização manual
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");

  if (!empresaId) {
    return NextResponse.json({ erro: "Informe 'empresaId'." }, { status: 400 });
  }

  // Executa o cruzamento automático de transferências antes de listar para garantir dados sempre limpos
  await executarCruzamentoAutomatico(empresaId);

  const transacoes = await db.transacao.findMany({
    where: { empresaId, origemCategoria: "NAO_CATEGORIZADO" },
    include: {
      importacao: {
        select: {
          nomeArquivo: true,
          origem: true,
        }
      }
    },
    orderBy: { data: "desc" },
  });

  const categorias = await db.categoria.findMany({
    where: { empresaId },
    orderBy: { nome: "asc" },
  });

  const empresa = await db.empresa.findUnique({
    where: { id: empresaId },
    select: { nome: true },
  });

  return NextResponse.json({
    nomeEmpresa: empresa?.nome ?? "Empresa",
    transacoes,
    categorias,
  });
}
