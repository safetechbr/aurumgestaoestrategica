import Papa from "papaparse";

export interface TransacaoBruta {
  data: Date;
  descricaoOriginal: string;
  valor: number;
}

// Cada banco usa nomes de coluna diferentes. Esses são os candidatos mais comuns
// em extratos de bancos e cartões brasileiros. Adicione novos conforme for
// importando arquivos de bancos que ainda não estão na lista.
const CANDIDATOS_DATA = ["data lancamento", "data transacao", "data", "date", "dt"];
const CANDIDATOS_DESCRICAO = ["descricao", "historico", "lancamento", "title", "description"];
const CANDIDATOS_VALOR = ["valor", "value", "amount", "montante"];

function normalizarCabecalho(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos pra comparar
    .replace(/['"“”\ufeff]/g, ""); // remove aspas e BOM pra comparar
}

function encontrarLinhaCabecalho(linhas: string[]): number {
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    // Detectar possível separador
    let separador = ",";
    if (linha.includes(";")) separador = ";";
    else if (linha.includes("\t")) separador = "\t";

    // Dividir e normalizar colunas da linha
    const colunas = linha.split(separador).map(normalizarCabecalho);

    // Verificar se esta linha tem candidatos de data, descrição e valor
    const temData = colunas.some(col => CANDIDATOS_DATA.some(cand => col.includes(cand)));
    const temDescricao = colunas.some(col => CANDIDATOS_DESCRICAO.some(cand => col.includes(cand)));
    const temValor = colunas.some(col => CANDIDATOS_VALOR.some(cand => col.includes(cand)));

    if (temData && temDescricao && temValor) {
      return i;
    }
  }
  return -1;
}

function encontrarColuna(cabecalhos: string[], candidatos: string[]): string | null {
  const normalizados = cabecalhos.map((h) => ({ original: h, norm: normalizarCabecalho(h) }));
  for (const candidato of candidatos) {
    const encontrado = normalizados.find((h) => h.norm.includes(candidato));
    if (encontrado) return encontrado.original;
  }
  return null;
}

function parseValor(bruto: string): number {
  // Trata formatos "1.234,56" (BR) e "1234.56" (US)
  const limpo = bruto.replace(/[^\d,.-]/g, "");
  const temVirgulaDecimal = /,\d{1,2}$/.test(limpo);
  const normalizado = temVirgulaDecimal
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo.replace(/,/g, "");
  return parseFloat(normalizado);
}

function parseData(bruto: string): Date {
  // Tenta DD/MM/AAAA primeiro (padrão BR), cai pro Date nativo se não bater
  const match = bruto.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const [, dia, mes, ano] = match;
    const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
    return new Date(Number(anoCompleto), Number(mes) - 1, Number(dia));
  }
  return new Date(bruto);
}

export interface ResultadoParse {
  transacoes: TransacaoBruta[];
  colunasDetectadas: { data: string; descricao: string; valor: string };
  linhasComErro: number;
}

export function parseCsv(conteudoCsv: string): ResultadoParse {
  const linhas = conteudoCsv.split(/\r?\n/);
  const indiceCabecalho = encontrarLinhaCabecalho(linhas);
  
  const conteudoParaParse = indiceCabecalho !== -1
    ? linhas.slice(indiceCabecalho).join("\n")
    : conteudoCsv;

  const parsed = Papa.parse<Record<string, string>>(conteudoParaParse, {
    header: true,
    skipEmptyLines: true,
  });

  const cabecalhos = parsed.meta.fields ?? [];
  const colData = encontrarColuna(cabecalhos, CANDIDATOS_DATA);
  const colDescricao = encontrarColuna(cabecalhos, CANDIDATOS_DESCRICAO);
  const colValor = encontrarColuna(cabecalhos, CANDIDATOS_VALOR);

  if (!colData || !colDescricao || !colValor) {
    throw new Error(
      `Não consegui identificar todas as colunas necessárias no CSV. ` +
      `Encontradas: data="${colData}", descrição="${colDescricao}", valor="${colValor}". ` +
      `Colunas disponíveis no arquivo: ${cabecalhos.join(", ")}`
    );
  }

  const transacoes: TransacaoBruta[] = [];
  let linhasComErro = 0;

  for (const linha of parsed.data) {
    try {
      const data = parseData(linha[colData]);
      const valor = parseValor(linha[colValor]);
      const descricaoOriginal = linha[colDescricao]?.trim();

      if (isNaN(data.getTime()) || isNaN(valor) || !descricaoOriginal) {
        linhasComErro++;
        continue;
      }

      transacoes.push({ data, descricaoOriginal, valor });
    } catch {
      linhasComErro++;
    }
  }

  return {
    transacoes,
    colunasDetectadas: { data: colData, descricao: colDescricao, valor: colValor },
    linhasComErro,
  };
}

export function resumirDescricao(descricao: string): string {
  if (!descricao) return "";

  // 1. PIX enviada/recebida pelo Pix
  if (descricao.toLowerCase().includes("pelo pix")) {
    const partes = descricao.split(" - ");
    if (partes.length >= 2) {
      const tipoPix = partes[0].toLowerCase().includes("recebida") ? "PIX Recebido" : "PIX Enviado";
      const nome = partes[1].trim();
      
      // Busca o banco na última parte se houver
      let banco = "";
      if (partes.length >= 4) {
        const detBanco = partes[3];
        const matchBanco = detBanco.match(/^([^\(]+)/);
        if (matchBanco) {
          banco = matchBanco[1].trim();
        }
      } else if (partes.length === 3) {
        // Sem CNPJ/CPF no meio
        const detBanco = partes[2];
        const matchBanco = detBanco.match(/^([^\(]+)/);
        if (matchBanco) {
          banco = matchBanco[1].trim();
        }
      }

      if (banco) {
        return `${tipoPix}: ${nome} (${banco})`;
      }
      return `${tipoPix}: ${nome}`;
    }
  }

  // 2. Outras transferências gerais (TED, DOC, PIX, etc)
  if (descricao.includes(" - ")) {
    const partes = descricao.split(" - ");
    const term = partes[0].toLowerCase();
    if (term.includes("transferencia") || term.includes("ted") || term.includes("doc") || term.includes("pix")) {
      const tipo = partes[0].trim();
      const nome = partes[1].trim();
      let banco = "";
      if (partes[2]) {
        const candidate = partes[2].split("(")[0].trim();
        const isNumericOrDocument = /^[0-9\.\-\/]+$/.test(candidate);
        if (!isNumericOrDocument) {
          banco = candidate;
        }
      }
      if (banco) {
        return `${tipo}: ${nome} (${banco})`;
      }
      return `${tipo}: ${nome}`;
    }
  }

  return descricao;
}
