import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const companies = await db.empresa.findMany({
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Erro ao listar empresas:", error);
    return NextResponse.json({ erro: "Erro ao buscar empresas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nome } = await req.json();

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ erro: "Nome da empresa é obrigatório" }, { status: 400 });
    }

    const company = await db.empresa.create({
      data: { nome: nome.trim() },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    return NextResponse.json({ erro: "Erro ao criar empresa" }, { status: 500 });
  }
}
