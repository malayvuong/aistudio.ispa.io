import { GenerationFeature, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { buildChannelDefaults } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import { getOrCreateSid, getUnlockedProviders } from "@/lib/vault/session";
import { normalizeProviderId } from "@/services/ai/capabilities";
import { DEFAULT_PROVIDER_ID } from "@/services/ai/registry";
import { generateAlbum } from "@/services/ai/providerService";
import type { AIProviderId } from "@/services/ai/types";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.generateAlbum, async ({ userId }) => {
    let input: any;
    let providerId: AIProviderId = DEFAULT_PROVIDER_ID;
    const pendingCookies: Array<{
      name: string;
      value: string;
      options: {
        httpOnly: boolean;
        sameSite: "strict";
        path: string;
        secure?: boolean;
      };
    }> = [];

    const isValidTier = (value: number) =>
      Number.isInteger(value) && value >= 1 && value <= 6;
    const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0;

    try {
      input = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    try {
      if (!userId) {
        return NextResponse.json(
          { error: "Not authenticated", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      const subject = typeof input.subject === "string" ? input.subject.trim() : "";
      if (!subject) {
        return NextResponse.json(
          { error: "Album subject is required.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      if (typeof input.musicalElements !== "string") {
        return NextResponse.json(
          { error: "Invalid input payload.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      const trackCount = Number(input.trackCount);
      if (!isPositiveInteger(trackCount)) {
        return NextResponse.json(
          { error: "Invalid trackCount.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      const tier = Number(input.tier);
      if (!Number.isFinite(tier) || !isValidTier(tier)) {
        return NextResponse.json(
          { error: "Invalid tier.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      let vocalTrackNumber: number | undefined;
      if (input.vocalTrackNumber !== undefined) {
        const vocal = Number(input.vocalTrackNumber);
        if (!Number.isInteger(vocal) || vocal < 0 || vocal > trackCount) {
          return NextResponse.json(
            { error: "Invalid vocalTrackNumber.", code: "INVALID_INPUT" },
            { status: 400 }
          );
        }
        vocalTrackNumber = vocal;
      }

      const sid = getOrCreateSid(req.cookies, (name, value, options) => {
        pendingCookies.push({ name, value, options });
      });

      const unlockedProviders = await getUnlockedProviders(sid);
      if (!unlockedProviders || Object.keys(unlockedProviders).length === 0) {
        const responsePayload = NextResponse.json(
          { error: "Vault is locked", code: "VAULT_LOCKED" },
          { status: 401 }
        );
        pendingCookies.forEach((cookie) => {
          responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
        });
        return responsePayload;
      }

      const providerFromBody =
        typeof input.providerId === "string" ? input.providerId : undefined;
      const providerFromHeader = req.headers.get("x-ai-provider");
      const providerRaw = providerFromBody ?? providerFromHeader;
      const providerNormalized = normalizeProviderId(providerRaw);

      if (providerRaw && !providerNormalized) {
        const responsePayload = NextResponse.json(
          { error: "Invalid providerId.", code: "INVALID_PROVIDER" },
          { status: 400 }
        );
        pendingCookies.forEach((cookie) => {
          responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
        });
        return responsePayload;
      }

      providerId = providerNormalized ?? DEFAULT_PROVIDER_ID;
      const providerKey = unlockedProviders[providerId];

      if (!providerKey) {
        const responsePayload = NextResponse.json(
          { error: "Provider not initialized", code: "PROVIDER_NOT_INITIALIZED" },
          { status: 400 }
        );
        pendingCookies.forEach((cookie) => {
          responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
        });
        return responsePayload;
      }

      const channelId = typeof input.channelId === "string" ? input.channelId.trim() : "";
      if (!channelId) {
        const responsePayload = NextResponse.json(
          { error: "Channel profile is required.", code: "CHANNEL_REQUIRED" },
          { status: 400 }
        );
        pendingCookies.forEach((cookie) => {
          responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
        });
        return responsePayload;
      }

      const channelProfile = await prisma.channelProfile.findFirst({
        where: { id: channelId, userId },
      });

      if (!channelProfile) {
        const responsePayload = NextResponse.json(
          { error: "Channel profile not found.", code: "CHANNEL_NOT_FOUND" },
          { status: 404 }
        );
        pendingCookies.forEach((cookie) => {
          responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
        });
        return responsePayload;
      }

      const socialLinks = await prisma.socialLink.findMany({
        where: {
          userId,
          channels: { some: { channelId: channelProfile.id } },
        },
        orderBy: { createdAt: "asc" },
      });

      const promptInput = {
        ...input,
        subject,
        musicalElements: input.musicalElements,
        trackCount,
        tier,
        vocalTrackNumber,
        channelId: channelProfile.id,
        channelName: channelProfile.name,
        channelDefaults: buildChannelDefaults(channelProfile),
        socialLinks: socialLinks.map((link) => ({ type: link.type, url: link.url })),
      };

      const data = await generateAlbum(promptInput, providerId, providerKey);
      const responsePayload = NextResponse.json(data);

      try {
        await prisma.generationHistory.create({
          data: {
            userId,
            feature: GenerationFeature.ALBUM_CONCEPT,
            inputPayload: { ...promptInput, providerId } as Prisma.JsonObject,
            outputPayload: data as unknown as Prisma.JsonObject,
            status: "SUCCESS",
          },
        });
      } catch {
        console.error("DB error: failed to persist generation history");
      }

      pendingCookies.forEach((cookie) => {
        responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
      });

      return responsePayload;
    } catch (error: any) {
      console.error("Album generation failed");
      const msg = error.message || "Failed to generate album";
      const responsePayload = NextResponse.json(
        { error: msg, code: "GENERATION_FAILED" },
        { status: 500 }
      );

      try {
        if (userId) {
          await prisma.generationHistory.create({
            data: {
              userId,
              feature: GenerationFeature.ALBUM_CONCEPT,
              inputPayload: { ...(input ?? {}), providerId } as Prisma.JsonObject,
              outputPayload: { error: "Failed to generate album." } as Prisma.JsonObject,
              status: "FAILED",
            },
          });
        }
      } catch {
        // ignore
      }

      pendingCookies.forEach((cookie) => {
        responsePayload.cookies.set(cookie.name, cookie.value, cookie.options);
      });

      return responsePayload;
    }
  });
}
