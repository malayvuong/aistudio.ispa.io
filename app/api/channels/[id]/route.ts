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

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Params) {
  return withApiGuard(req, ApiPolicies.channel, async ({ userId }) => {
    const { id } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const channel = await prisma.channelProfile.findFirst({
      where: { id, userId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found.", code: "CHANNEL_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: channel.id,
      name: channel.name,
      defaultLanguage: channel.defaultLanguage,
      defaultTone: channel.defaultTone,
      defaultHashtags: parseHashtags(channel.defaultHashtags),
    });
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiGuard(req, ApiPolicies.channel, async ({ userId }) => {
    const { id } = await params;
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

    const existing = await prisma.channelProfile.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Channel not found.", code: "CHANNEL_NOT_FOUND" },
        { status: 404 }
      );
    }

    try {
      const channel = await prisma.channelProfile.update({
        where: { id },
        data: {
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
        { error: "Failed to update channel.", code: "CHANNEL_UPDATE_FAILED" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiGuard(req, ApiPolicies.channel, async ({ userId }) => {
    const { id } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const deleted = await prisma.channelProfile.deleteMany({
      where: { id, userId },
    });

    if (!deleted.count) {
      return NextResponse.json(
        { error: "Channel not found.", code: "CHANNEL_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  });
}
