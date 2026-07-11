import { db } from "@/lib/db";
import { resumirDescricao } from "@/lib/csv-parser";

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
  const descricaoUpper = descricao.trim().toUpperCase();
  const descResumidaUpper = resumirDescricao(descricao).trim().toUpperCase();

  // O padrão precisa ser EXATAMENTE igual à descrição original ou à descrição resumida
  const encontrada = regras.find((r) => 
    descricaoUpper === r.padrao || descResumidaUpper === r.padrao
  );
  if (!encontrada) return null;

  return {
    categoriaId: encontrada.categoriaId,
    categoriaNome: encontrada.categoriaNome,
  };
}

// Cria uma regra nova para a empresa, vinculando o padrão de texto à categoria.
export async function criarRegraApartirDeManual(descricao: string, categoriaId: string, empresaId: string) {
  // Salva a descrição original (exata)
  const padraoExato = descricao.trim().toUpperCase();
  if (padraoExato && padraoExato.length >= 3) {
    await db.regraCategorizacao.upsert({
      where: {
        padrao_empresaId: {
          padrao: padraoExato,
          empresaId,
        },
      },
      update: { categoriaId },
      create: { padrao: padraoExato, categoriaId, empresaId },
    });
  }

  // Salva a descrição resumida
  const padraoResumido = resumirDescricao(descricao).trim().toUpperCase();
  if (padraoResumido && padraoResumido.length >= 3 && padraoResumido !== padraoExato) {
    await db.regraCategorizacao.upsert({
      where: {
        padrao_empresaId: {
          padrao: padraoResumido,
          empresaId,
        },
      },
      update: { categoriaId },
      create: { padrao: padraoResumido, categoriaId, empresaId },
    });
  }

  invalidarCacheRegras(empresaId);
}
