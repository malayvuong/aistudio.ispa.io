import { prisma } from "@/lib/prisma";

type EnsurePrismaUserInput = {
  id: string;
  email?: string | null;
};

export const ensurePrismaUser = async ({ id, email }: EnsurePrismaUserInput) => {
  try {
    await prisma.user.upsert({
      where: { id },
      update: { email: email ?? null },
      create: { id, email: email ?? null },
    });
    return id;
  } catch (error) {
    console.error("DB error: failed to ensure prisma user");
    return null;
  }
};
