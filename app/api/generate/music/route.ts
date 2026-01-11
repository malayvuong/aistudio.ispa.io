import { GenerationFeature, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { buildChannelDefaults } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import { getOrCreateSid, getUnlockedProviders } from "@/lib/vault/session";
import { normalizeProviderId } from "@/services/ai/capabilities";
import { DEFAULT_PROVIDER_ID } from "@/services/ai/registry";
import { generateMusicPrompt } from "@/services/ai/providerService";
import type { AIProviderId } from "@/services/ai/types";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.generateMusic, async ({ userId }) => {
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

    const isNonEmptyStringArray = (value: unknown) =>
      Array.isArray(value) &&
      value.every((item) => typeof item === "string" && item.trim().length > 0);

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

      if (
        (input.lyrics !== undefined && typeof input.lyrics !== "string") ||
        (input.customContext !== undefined && typeof input.customContext !== "string")
      ) {
        return NextResponse.json(
          { error: "Invalid input payload.", code: "INVALID_INPUT" },
          { status: 400 }
        );
      }

      const lyrics = typeof input.lyrics === "string" ? input.lyrics : "";
      const customContext =
        typeof input.customContext === "string" ? input.customContext : "";

      if (
        !isNonEmptyStringArray(input.genres) ||
        !isNonEmptyStringArray(input.vibes) ||
        !isNonEmptyStringArray(input.instruments) ||
        !isNonEmptyStringArray(input.vocals)
      ) {
        return NextResponse.json(
          { error: "Invalid input payload.", code: "INVALID_INPUT" },
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
        lyrics,
        customContext,
        channelId: channelProfile.id,
        channelName: channelProfile.name,
        channelDefaults: buildChannelDefaults(channelProfile),
      };

      const data = await generateMusicPrompt(promptInput, providerId, providerKey);
      const responsePayload = NextResponse.json(data);

      try {
        const inputPayload: Prisma.JsonObject = { ...promptInput, providerId };
        const outputPayload = data as unknown as Prisma.JsonObject;

        await prisma.generationHistory.create({
          data: {
            userId,
            feature: GenerationFeature.MUSIC_PROMPT,
            inputPayload,
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
      console.error("Music prompt generation failed");
      const msg = error.message || "Failed to generate music prompt";
      const responsePayload = NextResponse.json(
        { error: msg, code: "GENERATION_FAILED" },
        { status: 500 }
      );

      try {
        if (userId) {
          const inputPayload: Prisma.JsonObject = { ...(input ?? {}), providerId };
          const outputPayload: Prisma.JsonObject = { error: "Failed to generate music prompt." };

          await prisma.generationHistory.create({
            data: {
              userId,
              feature: GenerationFeature.MUSIC_PROMPT,
              inputPayload,
              outputPayload,
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
