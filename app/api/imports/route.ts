import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId");

    if (!empresaId) {
      return NextResponse.json({ erro: "ID da empresa é obrigatório" }, { status: 400 });
    }

    const imports = await db.importacao.findMany({
      where: { empresaId },
      orderBy: { importadoEm: "desc" },
    });

    return NextResponse.json(imports);
  } catch (error) {
    console.error("Erro ao listar importações:", error);
    return NextResponse.json({ erro: "Erro ao buscar importações" }, { status: 500 });
  }
}
