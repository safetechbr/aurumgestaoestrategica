import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA } from "@/lib/categories";

interface TransacaoParaClassificar {
  id: string;
  descricaoOriginal: string;
  tipo: "RECEITA" | "DESPESA";
}

export interface ClassificacaoIA {
  id: string;
  categoria: string;
  confianca: "alta" | "media" | "baixa";
}

const TAMANHO_LOTE = 80; // transações por chamada — equilibra custo e nº de chamadas

// Divide um array em lotes menores
function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

async function classificarLote(lote: TransacaoParaClassificar[]): Promise<ClassificacaoIA[]> {
  const listaDespesas = CATEGORIAS_DESPESA.join(", ");
  const listaReceitas = CATEGORIAS_RECEITA.join(", ");

  const linhas = lote
    .map((t) => `${t.id} | ${t.tipo} | ${t.descricaoOriginal}`)
    .join("\n");

  const prompt = `Você vai categorizar transações financeiras de uma empresa brasileira.

Categorias válidas para DESPESA: ${listaDespesas}
Categorias válidas para RECEITA: ${listaReceitas}

Cada linha abaixo tem o formato: id | tipo | descrição original do extrato bancário.
Use o tipo (RECEITA/DESPESA) para saber de qual lista escolher a categoria.

${linhas}

Responda APENAS um array JSON, sem nenhum texto antes ou depois, no formato:
[{"id": "...", "categoria": "...", "confianca": "alta" | "media" | "baixa"}]

Regras:
- "confianca" deve ser "alta" só quando o nome do estabelecimento/descrição deixa claro o tipo de gasto (ex: "UBER", "IFOOD", "NETFLIX").
- Use "media" quando é uma dedução razoável mas não certa.
- Use "baixa" quando a descrição é genérica demais (ex: "PIX", "TED", "TRANSFERENCIA") — nesses casos, ainda assim escolha a categoria mais provável.
- A categoria escolhida DEVE ser exatamente uma das da lista correspondente ao tipo.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Erro na API da Anthropic: ${response.status} - ${erro}`);
  }

  const data = await response.json();
  const textoResposta: string = data.content[0].text;

  // Defesa extra: às vezes o modelo pode envolver o JSON em blocos de código
  const jsonLimpo = textoResposta.replace(/```json\n?|\n?```/g, "").trim();

  try {
    return JSON.parse(jsonLimpo) as ClassificacaoIA[];
  } catch {
    throw new Error(`Não consegui interpretar a resposta da IA como JSON: ${textoResposta.slice(0, 200)}`);
  }
}

// Classifica uma lista de transações em lotes, chamando a IA sequencialmente.
// Se um lote falhar, os outros continuam — a transação problemática fica sem categoria.
export async function classificarComIA(
  transacoes: TransacaoParaClassificar[]
): Promise<ClassificacaoIA[]> {
  const lotes = emLotes(transacoes, TAMANHO_LOTE);
  const resultados: ClassificacaoIA[] = [];

  for (const lote of lotes) {
    try {
      const classificacoes = await classificarLote(lote);
      resultados.push(...classificacoes);
    } catch (erro) {
      console.error("Falha ao classificar lote via IA:", erro);
      // segue pros próximos lotes; as transações desse lote ficam sem categoria
      // e vão parar na lista de revisão manual
    }
  }

  return resultados;
}
