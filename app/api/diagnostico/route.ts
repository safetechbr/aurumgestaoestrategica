import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_LENGTH: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      DATABASE_URL_MASKED: maskConnectionString(process.env.DATABASE_URL),
    },
    prisma: {},
  };

  try {
    // Tenta executar uma consulta simples de banco
    const count = await db.empresa.count();
    diagnostics.prisma = {
      status: "SUCCESS",
      message: "Conexão com o banco estabelecida com sucesso.",
      empresasCount: count,
    };
  } catch (error: any) {
    diagnostics.prisma = {
      status: "ERROR",
      message: error.message || "Erro desconhecido ao conectar com o banco.",
      code: error.code,
      meta: error.meta,
      name: error.name,
      stack: error.stack ? error.stack.split("\n").slice(0, 3) : undefined,
    };
  }

  return NextResponse.json(diagnostics);
}

function maskConnectionString(url?: string): string {
  if (!url) return "NÃO DEFINIDA";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch (e) {
    // Se não for uma URL válida, mascara caracteres do meio
    if (url.length <= 8) return "***";
    return url.substring(0, 4) + "..." + url.substring(url.length - 4);
  }
}
