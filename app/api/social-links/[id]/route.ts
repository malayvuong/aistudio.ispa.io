import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";

export const runtime = "nodejs";

const normalizeValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeChannelIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean);
};

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  return withApiGuard(req, ApiPolicies.socialLink, async ({ userId }) => {
    try {
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

      const type = normalizeValue(payload?.type);
      const url = normalizeValue(payload?.url);
      const requestedChannelIds = normalizeChannelIds(payload?.channelIds);
      if (!type || !url) {
        return NextResponse.json(
          { error: "Type and URL are required.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      const channelIds = requestedChannelIds.length
        ? (
            await prisma.channelProfile.findMany({
              where: { userId, id: { in: requestedChannelIds } },
              select: { id: true },
            })
          ).map((channel) => channel.id)
        : [];

      const existing = await prisma.socialLink.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Social link not found.", code: "SOCIAL_LINK_NOT_FOUND" },
          { status: 404 }
        );
      }

      const link = await prisma.socialLink.update({
        where: { id },
        data: {
          type,
          url,
          channels: {
            deleteMany: {},
            ...(channelIds.length
              ? { create: channelIds.map((channelId) => ({ channelId })) }
              : {}),
          },
        },
        include: { channels: { select: { channelId: true } } },
      });

      return NextResponse.json({
        id: link.id,
        type: link.type,
        url: link.url,
        channelIds: link.channels.map((entry) => entry.channelId),
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to update social link.", code: "SOCIAL_LINK_UPDATE_FAILED" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withApiGuard(req, ApiPolicies.socialLink, async ({ userId }) => {
    try {
      const { id } = await params;
      if (!userId) {
        return NextResponse.json(
          { error: "Not authenticated", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      const deleted = await prisma.socialLink.deleteMany({
        where: { id, userId },
      });

      if (!deleted.count) {
        return NextResponse.json(
          { error: "Social link not found.", code: "SOCIAL_LINK_NOT_FOUND" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json(
        { error: "Failed to delete social link.", code: "SOCIAL_LINK_DELETE_FAILED" },
        { status: 500 }
      );
    }
  });
}
