import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export const runtime = "nodejs";

const getObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiGuard(req, ApiPolicies.historyItem, async ({ userId }) => {
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const pathId = req.nextUrl.pathname.split("/").filter(Boolean).at(-1);
    const id = resolvedParams?.id ?? pathId;
    if (!id || id === "history") {
      return NextResponse.json(
        { error: "History id is required", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const history = await prisma.generationHistory.findFirst({
      where: { id, userId },
      include: {
        assets: true,
        user: true,
      },
    });

    if (!history) {
      return NextResponse.json(
        { error: "History record not found", code: "HISTORY_NOT_FOUND" },
        { status: 404 }
      );
    }

    const inputPayload = history.inputPayload;
    const outputPayload = history.outputPayload;
    const inputObj = getObject(inputPayload);
    const providerId = typeof inputObj?.providerId === "string" ? inputObj.providerId : null;

    return NextResponse.json({
      id: history.id,
      userId: history.userId,
      userEmail: history.user?.email ?? null,
      feature: history.feature,
      status: history.status,
      createdAt: history.createdAt,
      providerId,
      inputPayload,
      outputPayload,
      assets: history.assets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        type: asset.type,
        historyId: asset.historyId,
      })),
    });
  });
}
