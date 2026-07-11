import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // A deleção cascade no banco de dados cuidará de apagar todas as transações
    // associadas a esta importação automaticamente.
    await db.importacao.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir importação:", error);
    return NextResponse.json({ erro: "Erro ao excluir importação" }, { status: 500 });
  }
}
