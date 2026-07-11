import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aplicarRegras } from "@/lib/categorization/rules-engine";
import { classificarComIA } from "@/lib/categorization/ai-classifier";
import { resumirDescricao } from "@/lib/csv-parser";

// Confiança mínima da IA para aceitar a categorização automaticamente.
// Abaixo disso, a transação vai para revisão manual mesmo com sugestão da IA.
const CONFIANCA_MINIMA_AUTOMATICA = "media"; // aceita "alta" e "media", rejeita "baixa"

export async function POST(req: NextRequest) {
  try {
    const { importacaoId } = await req.json();

    if (!importacaoId) {
      return NextResponse.json({ erro: "Informe 'importacaoId'." }, { status: 400 });
    }

    const importacao = await db.importacao.findUnique({
      where: { id: importacaoId },
      select: { empresaId: true },
    });

    if (!importacao) {
      return NextResponse.json({ erro: "Importação não encontrada." }, { status: 404 });
    }
    const empresaId = importacao.empresaId;

    const transacoesPendentes = await db.transacao.findMany({
      where: { importacaoId, origemCategoria: "NAO_CATEGORIZADO" },
    });

    // ETAPA 0 — Histórico de categorizações anteriores (exata e resumida)
    let categorizadasPorHistorico = 0;
    const pendentesAposHistorico: typeof transacoesPendentes = [];

    const transacoesCategorizadasAnteriores = await db.transacao.findMany({
      where: {
        empresaId,
        categoriaId: { not: null },
      },
      select: {
        descricaoOriginal: true,
        categoriaId: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const mapaDescricaoExata = new Map<string, string>();
    const mapaDescricaoResumida = new Map<string, string>();

    for (const prev of transacoesCategorizadasAnteriores) {
      if (prev.categoriaId) {
        const descExataUpper = prev.descricaoOriginal.trim().toUpperCase();
        const descResumidaUpper = resumirDescricao(prev.descricaoOriginal).trim().toUpperCase();

        if (!mapaDescricaoExata.has(descExataUpper)) {
          mapaDescricaoExata.set(descExataUpper, prev.categoriaId);
        }
        if (!mapaDescricaoResumida.has(descResumidaUpper)) {
          mapaDescricaoResumida.set(descResumidaUpper, prev.categoriaId);
        }
      }
    }

    for (const t of transacoesPendentes) {
      const descExataUpper = t.descricaoOriginal.trim().toUpperCase();
      const descResumidaUpper = resumirDescricao(t.descricaoOriginal).trim().toUpperCase();

      const categoriaIdVinculada = mapaDescricaoExata.get(descExataUpper) || mapaDescricaoResumida.get(descResumidaUpper);

      if (categoriaIdVinculada) {
        await db.transacao.update({
          where: { id: t.id },
          data: { categoriaId: categoriaIdVinculada, origemCategoria: "REGRA" },
        });
        categorizadasPorHistorico++;
      } else {
        pendentesAposHistorico.push(t);
      }
    }

    // ETAPA 1 — regras (custo zero)
    let categorizadasPorRegra = 0;
    const semRegra: typeof transacoesPendentes = [];

    for (const t of pendentesAposHistorico) {
      const resultado = await aplicarRegras(t.descricaoOriginal, empresaId);
      if (resultado) {
        await db.transacao.update({
          where: { id: t.id },
          data: { categoriaId: resultado.categoriaId, origemCategoria: "REGRA" },
        });
        categorizadasPorRegra++;
      } else {
        semRegra.push(t);
      }
    }

    // ETAPA 2 — Fallback de IA desativado. Conforme a regra de negócios solicitada pelo usuário:
    // "se não for exatamente igual ao lançamento anterior cadastrado manualmente, não seja categorizado."
    // Portanto, todas as transações que não bateram no histórico exato ou nas regras de exatidão vão direto para a revisão manual.
    let categorizadasPorIA = 0;
    let enviadasParaRevisaoManual = semRegra.length;

    return NextResponse.json({
      totalProcessadas: transacoesPendentes.length,
      categorizadasPorRegra: categorizadasPorRegra + categorizadasPorHistorico,
      categorizadasPorIA,
      enviadasParaRevisaoManual,
    });
  } catch (erro) {
    console.error(erro);
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
