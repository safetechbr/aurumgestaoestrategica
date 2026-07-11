import { PrismaClient } from "@prisma/client";
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA } from "../lib/categories";

const db = new PrismaClient();

async function main() {
  const empresaId = "empresa-teste";

  const empresa = await db.empresa.upsert({
    where: { id: empresaId },
    update: {},
    create: { id: empresaId, nome: "Empresa de teste" },
  });

  for (const nome of CATEGORIAS_DESPESA) {
    await db.categoria.upsert({
      where: { nome_empresaId: { nome, empresaId } },
      update: {},
      create: { nome, tipo: "DESPESA", empresaId },
    });
  }

  for (const nome of CATEGORIAS_RECEITA) {
    await db.categoria.upsert({
      where: { nome_empresaId: { nome, empresaId } },
      update: {},
      create: { nome, tipo: "RECEITA", empresaId },
    });
  }

  console.log("Seed concluído.");
  console.log(`ID da empresa de teste: ${empresa.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
