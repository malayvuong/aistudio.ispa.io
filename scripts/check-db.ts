import nextEnv from "@next/env";
import type { PrismaClient } from "@prisma/client";

type ExistsRow = { exists: boolean };
type TableRow = { table_name: string };

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const getResult = (hasMigrations: boolean, hasBusinessTables: boolean) => {
  if (hasMigrations) return "PRISMA_MANAGED_DB";
  if (hasBusinessTables) return "NON_PRISMA_DB";
  return "EMPTY_DB";
};

async function main() {
  const { prisma: prismaClient } = await import(new URL("../lib/prisma.ts", import.meta.url).href);
  const prisma = prismaClient;

  try {
    await prisma.$connect();

    const migrationRows = await prisma.$queryRaw<ExistsRow[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS "exists"
    `;
    const hasMigrations = migrationRows[0]?.exists ?? false;

    const businessRows = await prisma.$queryRaw<TableRow[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'generation_history', 'assets')
    `;
    const hasBusinessTables = businessRows.length > 0;

    const result = getResult(hasMigrations, hasBusinessTables);
    console.log(result);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error("DB check failed:", error);
    process.exitCode = 1;
  });
