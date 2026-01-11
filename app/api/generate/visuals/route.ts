import { GenerationFeature, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { buildChannelDefaults } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import { getOrCreateSid, getUnlockedProviders } from "@/lib/vault/session";
import { PROVIDER_CAPABILITIES, normalizeProviderId } from "@/services/ai/capabilities";
import { DEFAULT_PROVIDER_ID } from "@/services/ai/registry";
import { generateVisualAssets } from "@/services/ai/providerService";
import type { AIProviderId } from "@/services/ai/types";

// Allow long-running requests for image generation
export const maxDuration = 60;
export const runtime = "nodejs";

const summarizeImage = (value: string) => ({
  prefix: value.slice(0, 32),
  length: value.length,
});

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.generateVisuals, async ({ userId }) => {
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

      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      if (!prompt) {
        return NextResponse.json(
          { error: "Visual prompt is required.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      const songName = typeof input.songName === "string" ? input.songName.trim() : "";
      if (!songName) {
        return NextResponse.json(
          { error: "Song name is required.", code: "INVALID_INPUT" },
          { status: 400 }
        );
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

      if (!PROVIDER_CAPABILITIES[providerId]?.image) {
        const responsePayload = NextResponse.json(
          { error: "Provider does not support image generation", code: "PROVIDER_TEXT_ONLY" },
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

      const promptInput = {
        ...input,
        prompt,
        songName,
        channelId: channelProfile.id,
        channelName: channelProfile.name,
        channelDefaults: buildChannelDefaults(channelProfile),
      };

      const data = await generateVisualAssets(
        { prompt, songName },
        providerId,
        providerKey
      );

      const responsePayload = NextResponse.json(data);

      const outputPayload: Prisma.JsonObject = {
        images: {
          baseImage: summarizeImage(data.baseImage),
          squareWithText: summarizeImage(data.squareWithText),
          landscapeWithText: summarizeImage(data.landscapeWithText),
        },
        providerId,
        // TODO: Upload to S3 and store URLs instead of data URLs.
        note: "Images returned as data URLs or URLs; full payloads omitted from DB to avoid large blobs.",
      };

      try {
        await prisma.generationHistory.create({
          data: {
            userId,
            feature: GenerationFeature.YOUTUBE_PACKAGE,
            inputPayload: { ...promptInput, providerId } as Prisma.JsonObject,
            outputPayload,
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
      console.error("Visual generation failed", error);
      const msg = error?.message || "Failed to generate visuals";
      const responsePayload = NextResponse.json(
        { error: msg, code: "GENERATION_FAILED" },
        { status: 500 }
      );

      try {
        if (userId) {
          await prisma.generationHistory.create({
            data: {
              userId,
              feature: GenerationFeature.YOUTUBE_PACKAGE,
              inputPayload: { ...(input ?? {}), providerId } as Prisma.JsonObject,
              outputPayload: { error: "Failed to generate visuals." } as Prisma.JsonObject,
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
