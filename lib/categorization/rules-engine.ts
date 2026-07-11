import { db } from "@/lib/db";

export interface ResultadoRegra {
  categoriaId: string;
  categoriaNome: string;
}

// Cache de regras em memória particionado por empresa
let cacheRegrasPorEmpresa = new Map<string, { padrao: string; categoriaId: string; categoriaNome: string }[]>();

async function carregarRegras(empresaId: string) {
  let cache = cacheRegrasPorEmpresa.get(empresaId);
  if (cache) return cache;

  const regras = await db.regraCategorizacao.findMany({
    where: { empresaId },
    include: { categoria: true },
  });

  const mapped = regras.map((r) => ({
    padrao: r.padrao.toUpperCase(),
    categoriaId: r.categoriaId,
    categoriaNome: r.categoria.nome,
  }));

  cacheRegrasPorEmpresa.set(empresaId, mapped);
  return mapped;
}

export function invalidarCacheRegras(empresaId: string) {
  cacheRegrasPorEmpresa.delete(empresaId);
}

// Aplica as regras de uma determinada empresa a uma descrição de transação.
export async function aplicarRegras(descricao: string, empresaId: string): Promise<ResultadoRegra | null> {
  const regras = await carregarRegras(empresaId);
  const descricaoUpper = descricao.toUpperCase();

  const encontrada = regras.find((r) => descricaoUpper.includes(r.padrao));
  if (!encontrada) return null;

  return {
    categoriaId: encontrada.categoriaId,
    categoriaNome: encontrada.categoriaNome,
  };
}

// Cria uma regra nova para a empresa, vinculando o padrão de texto à categoria.
export async function criarRegraApartirDeManual(descricao: string, categoriaId: string, empresaId: string) {
  const padrao = descricao.trim().split(/\s+/)[0].toUpperCase();

  if (!padrao || padrao.length < 3) return; // padrão curto demais gera falso-positivo

  await db.regraCategorizacao.upsert({
    where: {
      padrao_empresaId: {
        padrao,
        empresaId,
      },
    },
    update: { categoriaId },
    create: { padrao, categoriaId, empresaId },
  });

  invalidarCacheRegras(empresaId);
}
