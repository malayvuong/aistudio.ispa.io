import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { normalizeHashtags } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export const runtime = "nodejs";

const parseHashtags = (value: unknown): string[] => {
  if (!value) return [];
  return normalizeHashtags(value);
};

export async function GET(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.channels, async ({ userId }) => {
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const channels = await prisma.channelProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        defaultLanguage: channel.defaultLanguage,
        defaultTone: channel.defaultTone,
        defaultHashtags: parseHashtags(channel.defaultHashtags),
      })),
    });
  });
}

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.channels, async ({ userId }) => {
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Channel name is required.", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const defaultLanguage =
      typeof payload?.defaultLanguage === "string" && payload.defaultLanguage.trim()
        ? payload.defaultLanguage.trim()
        : null;
    const defaultTone =
      typeof payload?.defaultTone === "string" && payload.defaultTone.trim()
        ? payload.defaultTone.trim()
        : null;
    const defaultHashtags = parseHashtags(payload?.defaultHashtags);

    try {
      const channel = await prisma.channelProfile.create({
        data: {
          userId,
          name,
          defaultLanguage,
          defaultTone,
          defaultHashtags: defaultHashtags.length ? defaultHashtags : Prisma.DbNull,
        },
      });

      return NextResponse.json({
        id: channel.id,
        name: channel.name,
        defaultLanguage: channel.defaultLanguage,
        defaultTone: channel.defaultTone,
        defaultHashtags: parseHashtags(channel.defaultHashtags),
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json(
          { error: "Channel name already exists.", code: "CHANNEL_EXISTS" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create channel.", code: "CHANNEL_CREATE_FAILED" },
        { status: 500 }
      );
    }
  });
}
