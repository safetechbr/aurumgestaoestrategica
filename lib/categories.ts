// Lista central de categorias. Ajuste livremente para o seu tipo de diagnóstico.
// Usada em três lugares: seed do banco, prompt da IA, e telas de revisão manual.

export const CATEGORIAS_DESPESA = [
  "Folha de pagamento",
  "Fornecedores",
  "Impostos e taxas",
  "Aluguel e ocupação",
  "Marketing e vendas",
  "Assinaturas e softwares",
  "Transporte e logística",
  "Alimentação",
  "Tarifas bancárias",
  "Empréstimos e financiamentos",
  "Pagamento de Fatura (Saída)",
  "Outras despesas",
] as const;

export const CATEGORIAS_RECEITA = [
  "Vendas de produtos",
  "Prestação de serviços",
  "Aportes de sócios",
  "Empréstimos recebidos",
  "Pagamento de Fatura (Entrada)",
  "Outras receitas",
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];
export type CategoriaReceita = (typeof CATEGORIAS_RECEITA)[number];
