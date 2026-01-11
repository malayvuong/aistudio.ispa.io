import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { buildChannelDefaults } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { withApiGuard } from "@/lib/security/guard";
import { ApiPolicies } from "@/lib/security/policies";
import { getOrCreateSid, getUnlockedProviders } from "@/lib/vault/session";
import { normalizeProviderId } from "@/services/ai/capabilities";
import { DEFAULT_PROVIDER_ID } from "@/services/ai/registry";
import { generatePackage } from "@/services/ai/providerService";
import type { AIProviderId } from "@/services/ai/types";
import type { SongInput } from "@/types";

// Allow long-running requests for AI generation (Vercel specific)
export const maxDuration = 60;
export const runtime = "nodejs";

type PendingCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "strict" | "lax" | "none";
    maxAge?: number;
    path: string;
    secure?: boolean;
  };
};

export async function POST(req: NextRequest) {
  return withApiGuard(req, ApiPolicies.generatePackage, async ({ userId }) => {
    let generationHistoryId: string | null = null;
    const pendingCookies: PendingCookie[] = [];

    const applyCookies = (response: NextResponse) => {
      pendingCookies.forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      });
      return response;
    };

    try {
      if (!userId) {
        return applyCookies(
          NextResponse.json(
            { error: "Not authenticated", code: "UNAUTHORIZED" },
            { status: 401 }
          )
        );
      }

      const sid = getOrCreateSid(req.cookies, (name, value, options) => {
        pendingCookies.push({ name, value, options });
      });

      const unlockedProviders = await getUnlockedProviders(sid);
      if (!unlockedProviders || Object.keys(unlockedProviders).length === 0) {
        return applyCookies(
          NextResponse.json(
            { error: "Vault is locked", code: "VAULT_LOCKED" },
            { status: 401 }
          )
        );
      }

      // Step 1: Parse request body
      let input: any;
      try {
        input = await req.json();
      } catch {
        return applyCookies(
          NextResponse.json(
            { error: "Invalid JSON payload.", code: "INVALID_JSON" },
            { status: 400 }
          )
        );
      }
      const {
        songName,
        stylePrompt,
        lyrics,
        userDescription,
        visualPromptOverride,
        channelId,
      } = input;

      if (
        (stylePrompt !== undefined && typeof stylePrompt !== "string") ||
        (lyrics !== undefined && typeof lyrics !== "string") ||
        (userDescription !== undefined && typeof userDescription !== "string") ||
        (visualPromptOverride !== undefined && typeof visualPromptOverride !== "string")
      ) {
        return applyCookies(
          NextResponse.json(
            { error: "Invalid input payload.", code: "INVALID_INPUT" },
            { status: 400 }
          )
        );
      }

      const providerFromBody =
        typeof input.providerId === "string"
          ? input.providerId
          : typeof input.provider === "string"
          ? input.provider
          : undefined;
      const providerFromHeader = req.headers.get("x-ai-provider");
      const providerRaw = providerFromBody ?? providerFromHeader;
      const providerNormalized = normalizeProviderId(providerRaw);

      if (providerRaw && !providerNormalized) {
        return applyCookies(
          NextResponse.json(
            { error: "Invalid providerId.", code: "INVALID_PROVIDER" },
            { status: 400 }
          )
        );
      }

      const providerId: AIProviderId = providerNormalized ?? DEFAULT_PROVIDER_ID;
      const providerKey = unlockedProviders[providerId];

      if (!providerKey) {
        return applyCookies(
          NextResponse.json(
            { error: "Provider not initialized", code: "PROVIDER_NOT_INITIALIZED" },
            { status: 400 }
          )
        );
      }

      const trimmedSongName =
        typeof songName === "string" ? songName.trim() : "";
      if (!trimmedSongName) {
        return applyCookies(
          NextResponse.json(
            { error: "Missing required fields: songName is required", code: "INVALID_INPUT" },
            { status: 400 }
          )
        );
      }

      if (typeof channelId !== "string" || !channelId.trim()) {
        return applyCookies(
          NextResponse.json(
            { error: "Channel profile is required.", code: "CHANNEL_REQUIRED" },
            { status: 400 }
          )
        );
      }

      const channelProfile = await prisma.channelProfile.findFirst({
        where: { id: channelId, userId },
      });

      if (!channelProfile) {
        return applyCookies(
          NextResponse.json(
            { error: "Channel profile not found.", code: "CHANNEL_NOT_FOUND" },
            { status: 404 }
          )
        );
      }

      const socialLinks = await prisma.socialLink.findMany({
        where: {
          userId,
          channels: { some: { channelId: channelProfile.id } },
        },
        orderBy: { createdAt: "asc" },
      });

      const songInput: SongInput = {
        songName: trimmedSongName,
        stylePrompt: typeof stylePrompt === "string" ? stylePrompt : "",
        lyrics: typeof lyrics === "string" ? lyrics : "",
        userDescription: typeof userDescription === "string" ? userDescription : "",
        visualPromptOverride:
          typeof visualPromptOverride === "string" ? visualPromptOverride : "",
        channelId: channelProfile.id,
        channelName: channelProfile.name,
        channelDefaults: buildChannelDefaults(channelProfile),
        socialLinks: socialLinks.map((link) => ({ type: link.type, url: link.url })),
      };

      // Step 2: Save to DB (Start) - Create GenerationHistory with PROCESSING status
      const inputPayload = {
        ...songInput,
        providerId,
      } as unknown as Prisma.InputJsonValue;

      try {
        const generationHistory = await prisma.generationHistory.create({
          data: {
            userId,
            feature: "YOUTUBE_PACKAGE",
            inputPayload,
            outputPayload: {},
            status: "PROCESSING",
          },
        });

        generationHistoryId = generationHistory.id;
      } catch {
        console.error("DB error: failed to persist generation history");
      }

      // Step 3: Call AI Text Generation
      let textResult;
      try {
        textResult = await generatePackage(songInput, providerId, providerKey);
      } catch (error: any) {
        throw new Error(`Text generation failed: ${error.message}`);
      }

      // Step 4: Save to DB (Finish) - Update GenerationHistory with text output
      const outputPayload = {
        tier: textResult.tier,
        tierReasoning: textResult.tierReasoning,
        youtubeTitle: textResult.youtubeTitle,
        youtubeDescription: textResult.youtubeDescription,
        tags: textResult.tags,
        imagePrompt: textResult.imagePrompt,
      } as unknown as Prisma.InputJsonValue;

      // Update GenerationHistory with SUCCESS status and outputPayload
      if (generationHistoryId) {
        try {
          await prisma.generationHistory.update({
            where: { id: generationHistoryId },
            data: {
              status: "SUCCESS",
              outputPayload,
            },
          });
        } catch {
          console.error("DB error: failed to finalize generation history");
        }
      }

      // Step 7: Return the final JSON to the client
      return applyCookies(
        NextResponse.json({
          ...textResult,
          generationId: generationHistoryId,
        })
      );
    } catch (error: any) {
      console.error("Package generation failed");

      // Update DB status to FAILED if we have a generationHistoryId
      if (generationHistoryId) {
        try {
          await prisma.generationHistory.update({
            where: { id: generationHistoryId },
            data: {
              status: "FAILED",
              outputPayload: {
                error: error.message || "Unknown error occurred",
              },
            },
          });
        } catch {
          console.error("Failed to update generation history status");
        }
      }

      return applyCookies(
        NextResponse.json(
          { error: error.message || "Failed to generate package", code: "GENERATION_FAILED" },
          { status: 500 }
        )
      );
    }
  });
}
