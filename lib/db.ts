import { PrismaClient } from "@prisma/client";

// Evita criar uma nova conexão a cada hot-reload em desenvolvimento.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
