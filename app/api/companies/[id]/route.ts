import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { nome, cnpj, regimeTributario, segmento } = await req.json();

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json({ erro: "Nome da empresa é obrigatório" }, { status: 400 });
    }

    const updated = await db.empresa.update({
      where: { id: params.id },
      data: {
        nome: nome.trim(),
        cnpj: cnpj ? cnpj.trim() : null,
        regimeTributario: regimeTributario ? regimeTributario.trim() : null,
        segmento: segmento ? segmento.trim() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar empresa:", error);
    return NextResponse.json({ erro: "Erro ao atualizar empresa" }, { status: 500 });
  }
}
