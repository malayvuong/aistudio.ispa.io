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

export async function GET(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.socialLinks, async ({ userId }) => {
    try {
      if (!userId) {
        return NextResponse.json(
          { error: "Not authenticated", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      const links = await prisma.socialLink.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        include: { channels: { select: { channelId: true } } },
      });

      return NextResponse.json({
        links: links.map((link) => ({
          id: link.id,
          type: link.type,
          url: link.url,
          channelIds: link.channels.map((entry) => entry.channelId),
        })),
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to load social links.", code: "SOCIAL_LINKS_LOAD_FAILED" },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.socialLinks, async ({ userId }) => {
    try {
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

      const link = await prisma.socialLink.create({
        data: {
          userId,
          type,
          url,
          channels: channelIds.length
            ? { create: channelIds.map((channelId) => ({ channelId })) }
            : undefined,
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
        { error: "Failed to create social link.", code: "SOCIAL_LINK_CREATE_FAILED" },
        { status: 500 }
      );
    }
  });
}
