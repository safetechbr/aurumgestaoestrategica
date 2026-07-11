import { db } from "./db";

/**
 * Motor de Conciliação e Cruzamento Automático (Match Engine)
 * Identifica e vincula transferências internas entre a conta da empresa (PJ) e a conta do sócio (PF).
 * 
 * Critérios de correspondência:
 * 1. Uma saída (DESPESA) e uma entrada (RECEITA) de valores absolutos idênticos.
 * 2. Ambas as transações ocorrem na mesma data ou com diferença de até 2 dias.
 * 3. As descrições contêm palavras-chave típicas de transferências (PIX, TED, DOC, TRANSF, etc.).
 * 4. Ambas estão atualmente como NAO_CATEGORIZADO.
 */
export async function executarCruzamentoAutomatico(empresaId: string): Promise<number> {
  // 1. Garante que as categorias de transferência/retirada existam
  let catSaida = await db.categoria.findFirst({
    where: { nome: "Transferência Sócio (Saída)", empresaId },
  });
  if (!catSaida) {
    catSaida = await db.categoria.create({
      data: {
        nome: "Transferência Sócio (Saída)",
        tipo: "DESPESA",
        escopo: "PESSOAL", // Retirada para o sócio é do escopo Pessoal
        empresaId,
      },
    });
  }

  let catEntrada = await db.categoria.findFirst({
    where: { nome: "Transferência Sócio (Entrada)", empresaId },
  });
  if (!catEntrada) {
    catEntrada = await db.categoria.create({
      data: {
        nome: "Transferência Sócio (Entrada)",
        tipo: "RECEITA",
        escopo: "PESSOAL",
        empresaId,
      },
    });
  }

  // 2. Busca todas as transações não categorizadas da empresa
  const transacoes = await db.transacao.findMany({
    where: {
      empresaId,
      origemCategoria: "NAO_CATEGORIZADO",
    },
    orderBy: { data: "asc" },
  });

  const despesas = transacoes.filter((t) => t.tipo === "DESPESA");
  const receitas = transacoes.filter((t) => t.tipo === "RECEITA");

  const keywords = ["pix", "ted", "doc", "transf", "transfer", "retirada", "pro-labore", "pró-labore", "socio", "sócio", "lucro", "distribuição"];

  function indicaTransferencia(descricao: string): boolean {
    const descLower = descricao.toLowerCase();
    return keywords.some((kw) => descLower.includes(kw));
  }

  let paresConciliados = 0;
  const receitasJaConciliadas = new Set<string>();

  for (const despesa of despesas) {
    // A despesa precisa parecer uma transferência
    if (!indicaTransferencia(despesa.descricaoOriginal)) continue;

    const valorAbsoluto = Math.abs(despesa.valor);

    // Encontra uma receita candidata correspondente
    const receitaCorrespondente = receitas.find((rec) => {
      if (receitasJaConciliadas.has(rec.id)) return false;
      
      // Mesmo valor absoluto
      if (Math.abs(rec.valor) !== valorAbsoluto) return false;

      // Diferença de data de no máximo 2 dias (172800000 ms)
      const diffMs = Math.abs(new Date(rec.data).getTime() - new Date(despesa.data).getTime());
      if (diffMs > 172800000) return false;

      // Descrição também precisa indicar transferência/pix/ted
      return indicaTransferencia(rec.descricaoOriginal);
    });

    if (receitaCorrespondente) {
      // Concilia o par!
      receitasJaConciliadas.add(receitaCorrespondente.id);

      // Atualiza despesa
      await db.transacao.update({
        where: { id: despesa.id },
        data: {
          categoriaId: catSaida.id,
          origemCategoria: "REGRA",
        },
      });

      // Atualiza receita
      await db.transacao.update({
        where: { id: receitaCorrespondente.id },
        data: {
          categoriaId: catEntrada.id,
          origemCategoria: "REGRA",
        },
      });

      paresConciliados++;
    }
  }

  return paresConciliados;
}
