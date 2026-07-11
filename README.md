# Diagnóstico Financeiro

Ferramenta interna para gerar diagnósticos financeiros de empresas a partir de
extratos bancários e de cartão de crédito em CSV.

## Como funciona a categorização

1. **Regras** (`lib/categorization/rules-engine.ts`) — dicionário de palavras-chave,
   custo zero, roda primeiro. Cobre a maior parte dos gastos recorrentes.
2. **IA (fallback)** (`lib/categorization/ai-classifier.ts`) — só para o que não bateu
   regra. Usa a API da Anthropic (modelo Haiku, barato) para classificar em lote.
3. **Revisão manual** (`app/review`) — o que sobrou. Toda categorização manual vira
   uma regra nova automaticamente, então a lista manual encolhe com o uso.

## Setup

### 1. Pré-requisitos
- Node.js 18+
- Uma conta no [Supabase](https://supabase.com) ou [Neon](https://neon.tech) (ambos têm
  plano gratuito) para o banco Postgres
- Uma chave de API da Anthropic em https://console.anthropic.com/settings/keys

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Edite o `.env` e preencha `DATABASE_URL` (pegue no painel do Supabase/Neon,
em "Connection string") e `ANTHROPIC_API_KEY`.

### 4. Criar as tabelas no banco
```bash
npm run db:generate
npm run db:push
```

### 5. Popular categorias iniciais e criar uma empresa de teste
```bash
npm run db:seed
```
Isso vai imprimir no terminal o **ID da empresa de teste** — copie esse ID,
você vai usar nas telas de upload, revisão e relatório.

### 6. Rodar o projeto
```bash
npm run dev
```
Acesse http://localhost:3000

## Fluxo de uso

1. Vá em **Importar CSV**, cole o ID da empresa, escolha o arquivo e envie.
   O sistema já roda a categorização automaticamente (regras + IA) na sequência.
2. Vá em **Revisão manual** para categorizar o que sobrou. Cada categorização
   sua cria uma regra nova — da próxima vez, transações parecidas já caem sozinhas.
3. Vá em **Relatórios** para ver o consolidado por categoria.

## Estrutura do projeto

```
app/
  api/
    upload/            → recebe o CSV e salva as transações cruas
    categorize/         → roda o pipeline: regras -> IA -> pendente
    transactions/
      pending/          → lista transações sem categoria
      [id]/categorize-manual/ → categoriza manualmente e cria regra nova
    reports/            → agrega os dados por categoria
  upload/               → tela de importação
  review/                → tela de revisão manual
  reports/               → tela de relatório
lib/
  csv-parser.ts          → detecta colunas e normaliza datas/valores de diferentes bancos
  categories.ts           → lista de categorias usada em todo o sistema
  categorization/
    rules-engine.ts       → motor de regras
    ai-classifier.ts       → fallback de IA
prisma/
  schema.prisma           → modelo do banco (Empresa, Transacao, Categoria, RegraCategorizacao)
  seed.ts                  → popula categorias iniciais
```

## Ajustando as categorias

As categorias ficam centralizadas em `lib/categories.ts`. Se quiser mudar,
edite lá e rode `npm run db:seed` de novo (categorias já existentes não são duplicadas).

## Ajustando o parser de CSV

Cada banco exporta CSV com nomes de coluna diferentes. O parser em
`lib/csv-parser.ts` tenta detectar automaticamente colunas de data, descrição
e valor por uma lista de nomes comuns. Se um banco novo não for reconhecido,
adicione o nome da coluna dele nas listas `CANDIDATOS_DATA`, `CANDIDATOS_DESCRICAO`
ou `CANDIDATOS_VALOR` no topo do arquivo.

## Próximos passos sugeridos

- Adicionar autenticação simples (ex: Supabase Auth) antes de publicar fora do localhost
- Popular o dicionário de regras com os padrões mais comuns dos seus extratos
  (evita gastar chamadas de IA logo nas primeiras importações)
- Exportar o relatório em PDF/Excel, se for enviar para clientes
