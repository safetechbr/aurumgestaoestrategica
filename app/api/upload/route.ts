import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv-parser";
import { executarCruzamentoAutomatico } from "@/lib/matching-engine";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;
    const empresaId = formData.get("empresaId") as string | null;
    const origem = (formData.get("origem") as string | null) ?? "nao_informado";
    const tipoPadrao = (formData.get("tipo") as string | null) ?? "DESPESA"; // usado quando o CSV não distingue receita/despesa

    if (!arquivo || !empresaId) {
      return NextResponse.json(
        { erro: "Envie 'arquivo' (CSV) e 'empresaId' no form-data." },
        { status: 400 }
      );
    }

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let conteudo = "";
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      conteudo = new TextDecoder("utf-16le").decode(buffer);
    } else if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      conteudo = new TextDecoder("utf-16be").decode(buffer);
    } else {
      try {
        conteudo = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        conteudo = new TextDecoder("windows-1252").decode(buffer);
      }
    }

    // Remove BOM residual se houver
    if (conteudo.startsWith("\ufeff")) {
      conteudo = conteudo.slice(1);
    }

    const { transacoes, colunasDetectadas, linhasComErro } = parseCsv(conteudo);

    if (transacoes.length === 0) {
      return NextResponse.json(
        { erro: "Nenhuma transação válida encontrada no arquivo." },
        { status: 400 }
      );
    }

    const datas = transacoes.map((t) => t.data.getTime());
    const dataInicio = new Date(Math.min(...datas));
    const dataFim = new Date(Math.max(...datas));

    const importacao = await db.importacao.create({
      data: {
        nomeArquivo: arquivo.name,
        origem,
        empresaId,
        dataInicio,
        dataFim,
      },
    });

    await db.transacao.createMany({
      data: transacoes.map((t) => ({
        data: t.data,
        descricaoOriginal: t.descricaoOriginal,
        valor: t.valor,
        tipo: t.valor >= 0 ? "RECEITA" : "DESPESA",
        origemCategoria: "NAO_CATEGORIZADO",
        empresaId,
        importacaoId: importacao.id,
      })),
    });

    // Executa o cruzamento automático de transferências PJ ⇆ PF
    const paresConciliados = await executarCruzamentoAutomatico(empresaId);

    return NextResponse.json({
      importacaoId: importacao.id,
      transacoesImportadas: transacoes.length,
      paresConciliados,
      linhasComErro,
      colunasDetectadas,
    });
  } catch (erro) {
    console.error(erro);
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
