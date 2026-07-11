import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId");

    if (!empresaId) {
      return NextResponse.json({ erro: "ID da empresa é obrigatório" }, { status: 400 });
    }

    const categories = await db.categoria.findMany({
      where: { empresaId },
      include: {
        _count: {
          select: { transacoes: true }
        }
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    return NextResponse.json({ erro: "Erro ao buscar categorias" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nome, tipo, empresaId, escopo } = await req.json();

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ erro: "Nome da categoria é obrigatório" }, { status: 400 });
    }
    if (!tipo || (tipo !== "RECEITA" && tipo !== "DESPESA")) {
      return NextResponse.json({ erro: "Tipo da categoria inválido" }, { status: 400 });
    }
    if (escopo && escopo !== "EMPRESA" && escopo !== "PESSOAL") {
      return NextResponse.json({ erro: "Escopo da categoria inválido" }, { status: 400 });
    }
    if (!empresaId) {
      return NextResponse.json({ erro: "ID da empresa é obrigatório" }, { status: 400 });
    }

    // Verifica se já existe categoria com esse nome para esta empresa
    const existente = await db.categoria.findUnique({
      where: {
        nome_empresaId: {
          nome: nome.trim(),
          empresaId,
        },
      },
    });

    if (existente) {
      return NextResponse.json({ erro: "Já existe uma categoria com este nome nesta empresa." }, { status: 400 });
    }

    const category = await db.categoria.create({
      data: {
        nome: nome.trim(),
        tipo,
        empresaId,
        escopo: escopo || "EMPRESA",
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json({ erro: "Erro ao criar categoria" }, { status: 500 });
  }
}
