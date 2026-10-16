import "server-only";
import { PrismaClient } from "@prisma/client";
import { isDevMockMode } from "@backend/lib/dev-mode";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (isDevMockMode()) {
    throw new Error("O acesso ao banco de dados está desativado em DEV_MOCK_MODE.");
  }
  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
  set(_target, property, value) {
    return Reflect.set(getPrismaClient(), property, value);
  },
});
