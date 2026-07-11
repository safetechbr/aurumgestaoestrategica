import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  if (!empresaId) {
    return NextResponse.json({ erro: "Informe 'empresaId'." }, { status: 400 });
  }

  const where = {
    empresaId,
    ...(dataInicio && dataFim
      ? { data: { gte: new Date(dataInicio), lte: new Date(dataFim) } }
      : {}),
  };

  const transacoes = await db.transacao.findMany({
    where,
    include: { categoria: true },
  });

  const totalReceitas = transacoes
    .filter((t) => t.tipo === "RECEITA" && t.categoria?.nome !== "Transferência Sócio (Entrada)")
    .reduce((soma, t) => soma + t.valor, 0);

  const totalDespesas = transacoes
    .filter((t) => t.tipo === "DESPESA" && t.categoria?.nome !== "Transferência Sócio (Saída)")
    .reduce((soma, t) => soma + Math.abs(t.valor), 0);

  // Segmentados por escopo (Empresarial vs Pessoal)
  const totalReceitasEmpresa = transacoes
    .filter((t) => t.tipo === "RECEITA" && (!t.categoria || t.categoria.escopo === "EMPRESA"))
    .reduce((soma, t) => soma + t.valor, 0);

  const totalDespesasEmpresa = transacoes
    .filter((t) => t.tipo === "DESPESA" && (!t.categoria || t.categoria.escopo === "EMPRESA"))
    .reduce((soma, t) => soma + Math.abs(t.valor), 0);

  const totalReceitasPessoal = transacoes
    .filter((t) => t.tipo === "RECEITA" && t.categoria && t.categoria.escopo === "PESSOAL")
    .reduce((soma, t) => soma + t.valor, 0);

  const totalDespesasPessoal = transacoes
    .filter((t) => t.tipo === "DESPESA" && t.categoria && t.categoria.escopo === "PESSOAL")
    .reduce((soma, t) => soma + Math.abs(t.valor), 0);

  const porCategoria = new Map<string, { categoria: string; tipo: string; escopo: string; total: number; quantidade: number }>();

  for (const t of transacoes) {
    const nomeCategoria = t.categoria?.nome ?? "Não categorizado";
    const escopoCategoria = t.categoria?.escopo ?? "EMPRESA";
    const chave = `${t.tipo}:${nomeCategoria}`;
    const atual = porCategoria.get(chave) ?? { categoria: nomeCategoria, tipo: t.tipo, escopo: escopoCategoria, total: 0, quantidade: 0 };
    atual.total += Math.abs(t.valor);
    atual.quantidade += 1;
    porCategoria.set(chave, atual);
  }

  // Busca histórico de transações para o gráfico de evolução mensal (últimos 6 meses até dataFim)
  const dataFimObj = dataFim ? new Date(dataFim) : new Date();
  const dataInicioHistorico = new Date(dataFimObj.getFullYear(), dataFimObj.getMonth() - 5, 1);

  const transacoesHistorico = await db.transacao.findMany({
    where: {
      empresaId,
      data: { gte: dataInicioHistorico, lte: dataFimObj },
    },
  });

  // Agrupamento por mês (evolução de 6 meses)
  const porMes = new Map<string, { mesAno: string; receitas: number; despesas: number }>();
  for (const t of transacoesHistorico) {
    const dataTransacao = new Date(t.data);
    const ano = dataTransacao.getFullYear();
    const mes = String(dataTransacao.getMonth() + 1).padStart(2, "0");
    const chaveMes = `${ano}-${mes}`;

    const atualMes = porMes.get(chaveMes) ?? {
      mesAno: chaveMes,
      receitas: 0,
      despesas: 0,
    };

    if (t.tipo === "RECEITA") {
      atualMes.receitas += t.valor;
    } else {
      atualMes.despesas += Math.abs(t.valor);
    }
    porMes.set(chaveMes, atualMes);
  }

  // Agrupamento por dia para o calendário (somente do período solicitado)
  const porDia = new Map<string, { data: string; receitas: number; despesas: number }>();
  for (const t of transacoes) {
    const dataTransacao = new Date(t.data);
    const ano = dataTransacao.getFullYear();
    const mes = String(dataTransacao.getMonth() + 1).padStart(2, "0");
    const dia = String(dataTransacao.getDate()).padStart(2, "0");
    const chaveDia = `${ano}-${mes}-${dia}`;

    const atualDia = porDia.get(chaveDia) ?? {
      data: chaveDia,
      receitas: 0,
      despesas: 0,
    };

    if (t.tipo === "RECEITA") {
      atualDia.receitas += t.valor;
    } else {
      atualDia.despesas += Math.abs(t.valor);
    }
    porDia.set(chaveDia, atualDia);
  }

  const listPorMes = Array.from(porMes.values()).sort((a, b) => a.mesAno.localeCompare(b.mesAno));
  const listPorDia = Array.from(porDia.values());
  const naoCategorizadas = transacoes.filter((t) => t.origemCategoria === "NAO_CATEGORIZADO").length;

  return NextResponse.json({
    periodo: { dataInicio, dataFim },
    resumo: {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      totalReceitasEmpresa,
      totalDespesasEmpresa,
      saldoEmpresa: totalReceitasEmpresa - totalDespesasEmpresa,
      totalReceitasPessoal,
      totalDespesasPessoal,
      saldoPessoal: totalReceitasPessoal - totalDespesasPessoal,
      transacoesNaoCategorizadas: naoCategorizadas,
      totalTransacoes: transacoes.length,
    },
    porCategoria: Array.from(porCategoria.values()).sort((a, b) => b.total - a.total),
    porMes: listPorMes,
    porDia: listPorDia,
  });
}
