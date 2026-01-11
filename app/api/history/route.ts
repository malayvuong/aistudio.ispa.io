import { GenerationFeature } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export const runtime = "nodejs";

const STATUS_OPTIONS = new Set(["SUCCESS", "FAILED", "PROCESSING"]);
const FEATURE_OPTIONS = new Set([
  GenerationFeature.YOUTUBE_PACKAGE,
  GenerationFeature.MUSIC_PROMPT,
  GenerationFeature.ALBUM_CONCEPT,
]);

const getObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const summarizeOutput = (outputPayload: unknown): string => {
  const data = getObject(outputPayload);
  if (!data) return "No output payload";
  if (typeof data.youtubeTitle === "string") return data.youtubeTitle;
  if (typeof data.albumTitle === "string") return data.albumTitle;
  if (typeof data.prompt === "string") return data.prompt;
  if (typeof data.imagePrompt === "string") return data.imagePrompt;
  if (typeof data.error === "string") return `Error: ${data.error}`;
  return "Output available";
};

export async function GET(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.history, async ({ userId }) => {
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize") ?? "20")));
    const statusParam = (searchParams.get("status") ?? "").toUpperCase();
    const featureParam = searchParams.get("feature") ?? "";
    const userIdParam = searchParams.get("userId") ?? "";

    if (userIdParam.trim() && userIdParam.trim() !== userId) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const where: {
      status?: string;
      feature?: GenerationFeature;
      userId: string;
    } = { userId };

    if (STATUS_OPTIONS.has(statusParam)) {
      where.status = statusParam;
    }

    if (FEATURE_OPTIONS.has(featureParam as GenerationFeature)) {
      where.feature = featureParam as GenerationFeature;
    }

    const [total, rows] = await prisma.$transaction([
      prisma.generationHistory.count({ where }),
      prisma.generationHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          userId: true,
          feature: true,
          status: true,
          createdAt: true,
          inputPayload: true,
          outputPayload: true,
        },
      }),
    ]);

    const items = rows.map((row) => {
      const inputPayload = getObject(row.inputPayload);
      const providerId =
        typeof inputPayload?.providerId === "string" ? inputPayload.providerId : null;
      return {
        id: row.id,
        userId: row.userId,
        feature: row.feature,
        status: row.status,
        createdAt: row.createdAt,
        providerId,
        summary: summarizeOutput(row.outputPayload),
      };
    });

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
    });
  });
}
