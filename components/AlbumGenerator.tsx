
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from "next/link";
import type { AIProviderId } from '@/services/ai/types';
import { AI_PROVIDER_OPTIONS, DEFAULT_PROVIDER_ID, getProviderLabel, normalizeAIProviderId } from '@/lib/ai-provider';
import { generateAlbum, generateVisualAssets } from '@/services/geminiService';
import { AlbumInput, AlbumResult, AlbumTier, VisualAssets } from '@/types';
import { TIER_DEFINITIONS } from '@/lib/tiers';
import { useChannelProfiles } from "@/lib/hooks/useChannelProfiles";
import { consumeRerunPayload } from "@/lib/rerun";
import { useVaultStatus } from "@/lib/hooks/useVaultStatus";
import { useT } from "@/components/i18n/LanguageProvider";
import { Disc, Layers, Loader2, Play, Download, Maximize2, X, RefreshCw, Copy, Check } from 'lucide-react';

const AlbumGenerator: React.FC = () => {
  const [providerId, setProviderId] = useState<AIProviderId>(DEFAULT_PROVIDER_ID);
  const t = useT();
  const { initializedProviders, capabilities, loading: providersLoading } = useVaultStatus();

  const [inputs, setInputs] = useState<AlbumInput>({
    subject: '',
    musicalElements: '',
    trackCount: 8,
    tier: 1,
    vocalTrackNumber: 0,
  });
  const {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    loading: channelsLoading,
    error: channelsError,
  } = useChannelProfiles();
  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [result, setResult] = useState<AlbumResult | null>(null);
  const [visuals, setVisuals] = useState<VisualAssets | null>(null);
  const [loading, setLoading] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copiedTrackIndex, setCopiedTrackIndex] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const isTextOnlyProvider = capabilities[providerId]?.image === false;

  useEffect(() => {
    const storedProvider = localStorage.getItem('ai_provider');
    const normalized = normalizeAIProviderId(storedProvider);
    if (normalized) {
      setProviderId(normalized);
    }
  }, []);

  useEffect(() => {
    const rerun = consumeRerunPayload("ALBUM_CONCEPT");
    if (!rerun) return;

    const input = rerun.input;
    const asString = (value: unknown) => (typeof value === "string" ? value : "");
    const asNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    setInputs((prev) => {
      const nextTrackCount = asNumber(input.trackCount) ?? prev.trackCount;
      const nextTier = asNumber(input.tier) ?? prev.tier;
      const nextVocal = asNumber(input.vocalTrackNumber) ?? prev.vocalTrackNumber ?? 0;
      const clampedVocal = Math.min(Math.max(nextVocal, 0), nextTrackCount);

      return {
        ...prev,
        subject: asString(input.subject),
        musicalElements: asString(input.musicalElements),
        trackCount: nextTrackCount,
        tier: nextTier as AlbumTier,
        vocalTrackNumber: clampedVocal,
      };
    });

    const provider = normalizeAIProviderId(asString(input.providerId));
    if (provider) {
      setProviderId(provider);
    }

    const channelId = asString(input.channelId);
    if (channelId) {
      setPendingChannelId(channelId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_provider', providerId);
  }, [providerId]);

  const availableProviders = useMemo(
    () => AI_PROVIDER_OPTIONS.filter((option) => initializedProviders.includes(option.id)),
    [initializedProviders]
  );
  const hasProviders = availableProviders.length > 0;

  useEffect(() => {
    if (providersLoading || !hasProviders) return;
    if (!availableProviders.some((option) => option.id === providerId)) {
      setProviderId(availableProviders[0].id);
    }
  }, [availableProviders, hasProviders, providerId, providersLoading]);

  useEffect(() => {
    if (!pendingChannelId || channels.length === 0) return;
    if (channels.some((channel) => channel.id === pendingChannelId)) {
      setSelectedChannelId(pendingChannelId);
    }
    setPendingChannelId(null);
  }, [channels, pendingChannelId, setSelectedChannelId]);

  const handleGenerate = async () => {
    if (!inputs.subject) return;
    if (!selectedChannelId) {
      alert(t("error.channelRequired"));
      return;
    }
    setLoading(true);
    setResult(null);
    setVisuals(null);
    try {
      const data = await generateAlbum({ ...inputs, channelId: selectedChannelId }, providerId);
      setResult(data);
    } catch (err) {
      alert(t("error.generateAlbumFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArt = async () => {
    if (!result) return;
    if (isTextOnlyProvider) {
      alert(t("error.providerTextOnly"));
      return;
    }
    if (!selectedChannelId) {
      alert(t("error.channelRequiredVisuals"));
      return;
    }
    setVisualLoading(true);
    try {
      // Reuse the visual generator from the main app, using Album title as song name
      const data = await generateVisualAssets(
        result.imagePrompt,
        result.albumTitle,
        providerId,
        selectedChannelId
      );
      setVisuals(data);
    } catch (err: any) {
      if (err?.code === "PROVIDER_TEXT_ONLY") {
        alert(t("error.providerTextOnly"));
      } else {
        alert(t("error.generateArtFailed"));
      }
    } finally {
      setVisualLoading(false);
    }
  };

  const copyTrackPrompt = (prompt: string, index: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedTrackIndex(index);
    setTimeout(() => setCopiedTrackIndex(null), 2000);
  };

  const copySection = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg shadow-lg shadow-teal-500/20">
                <Disc className="w-6 h-6 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-emerald-500">
                {t("tool.album.title")}
            </span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t("tool.album.subtitle")}</p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {t("label.poweredBy")} {getProviderLabel(providerId)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                    <label className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.channelProfile")}
                    </label>
                    {channelsLoading ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{t("label.loadingChannels")}</div>
                    ) : channels.length === 0 ? (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm text-gray-600 dark:text-gray-300">
                            <p>{t("label.noChannelProfiles")}</p>
                            <Link
                              href="/dashboard/channels"
                              className="mt-2 inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-300"
                            >
                              {t("label.createChannelProfile")}
                            </Link>
                        </div>
                    ) : (
                        <>
                            <select
                                value={selectedChannelId}
                                onChange={(event) => setSelectedChannelId(event.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                            >
                                {channels.map((channel) => (
                                    <option key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </option>
                                ))}
                            </select>
                            {selectedChannel && (
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1 break-words">
                                    {selectedChannel.defaultLanguage && (
                                        <div>{t("label.language")}: {selectedChannel.defaultLanguage}</div>
                                    )}
                                    {selectedChannel.defaultTone && (
                                      <div>{t("label.tone")}: {selectedChannel.defaultTone}</div>
                                    )}
                                    {selectedChannel.defaultHashtags?.length ? (
                                        <div>
                                            {t("label.hashtags")}: {selectedChannel.defaultHashtags.map((tag) => `#${tag}`).join(", ")}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </>
                    )}
                    {channelsError && (
                        <div className="mt-2 text-xs text-red-500">{channelsError}</div>
                    )}
                </div>
                <div className="md:col-span-3">
                    <label htmlFor="providerId" className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.aiProvider")}
                    </label>
                    <select
                        id="providerId"
                        name="providerId"
                        value={providerId}
                        onChange={(event) => setProviderId(event.target.value as AIProviderId)}
                        disabled={!hasProviders || providersLoading}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    >
                        {providersLoading ? (
                            <option value="">{t("provider.loading")}</option>
                        ) : hasProviders ? (
                            availableProviders.map((option) => {
                                const capability = capabilities[option.id];
                                const capabilityLabel = capability
                                  ? capability.image
                                    ? t("provider.capability.textImage")
                                    : t("provider.capability.textOnly")
                                  : t("provider.capability.unknown");
                                return (
                                    <option key={option.id} value={option.id}>
                                        {option.label} - {capabilityLabel}
                                    </option>
                                );
                            })
                        ) : (
                            <option value="">{t("provider.noneInitialized")}</option>
                        )}
                    </select>
                    {!providersLoading && !hasProviders && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {t("provider.noneHint")}
                        </p>
                    )}
                    {hasProviders && (
                        <div className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                                {capabilities[providerId]
                                  ? capabilities[providerId].image
                                    ? t("provider.capability.textImage")
                                    : t("provider.capability.textOnly")
                                  : t("provider.capability.unknown")}
                            </span>
                        </div>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="albumSubject" className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.albumSubject")}
                    </label>
                    <input 
                        id="albumSubject"
                        name="subject"
                        type="text" 
                        value={inputs.subject}
                        onChange={(e) => setInputs({...inputs, subject: e.target.value})}
                        placeholder={t("album.subject.placeholder")}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
                <div>
                    <label htmlFor="trackCount" className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.trackCount")}
                    </label>
                    <select 
                        id="trackCount"
                        name="trackCount"
                        value={inputs.trackCount}
                        onChange={(e) => {
                          const trackCount = Number(e.target.value);
                          setInputs((prev) => ({
                            ...prev,
                            trackCount,
                            vocalTrackNumber: Math.min(prev.vocalTrackNumber ?? 0, trackCount),
                          }));
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    >
                        {[4, 6, 8, 10, 12, 16, 20].map(n => (
                          <option key={n} value={n}>
                            {n} {t("label.tracks")}
                          </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="albumTier" className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.tier")}
                    </label>
                    <select
                        id="albumTier"
                        name="tier"
                        value={inputs.tier}
                        onChange={(e) => setInputs((prev) => ({
                          ...prev,
                          tier: Number(e.target.value) as AlbumTier,
                        }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    >
                        {TIER_DEFINITIONS.map((tier) => (
                            <option key={tier.id} value={tier.id}>
                                {tier.id} - {tier.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="vocalTrackNumber" className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.vocalTrack")}
                    </label>
                    <select
                        id="vocalTrackNumber"
                        name="vocalTrackNumber"
                        value={inputs.vocalTrackNumber}
                        onChange={(e) => setInputs((prev) => ({
                          ...prev,
                          vocalTrackNumber: Number(e.target.value),
                        }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    >
                        <option value={0}>{t("album.trackCount.none")}</option>
                        {Array.from({ length: inputs.trackCount }, (_, index) => index + 1).map((n) => (
                            <option key={n} value={n}>{t("album.trackCount.track")} {n}</option>
                        ))}
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label htmlFor="musicalElements" className="block text-sm font-semibold mb-2 uppercase tracking-wider text-xs text-gray-500">
                      {t("label.musicalElements")}
                    </label>
                    <input 
                        id="musicalElements"
                        name="musicalElements"
                        type="text" 
                        value={inputs.musicalElements}
                        onChange={(e) => setInputs({...inputs, musicalElements: e.target.value})}
                        placeholder={t("album.musicalElements.placeholder")}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
            </div>
            <button
                onClick={handleGenerate}
                disabled={loading || !inputs.subject || !selectedChannelId || !hasProviders}
                className="mt-6 w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                {loading ? <Loader2 className="animate-spin" /> : <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />}
                {t("tool.album.generate")}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Result Section */}
          {result ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-4 tracking-tight">{result.albumTitle}</h2>
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                          {t("label.albumPrompt")}
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap border border-gray-100 dark:border-gray-800">
                            {result.albumPrompt}
                        </div>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                          {t("label.tracklist")}
                        </h3>
                        <ul className="space-y-2">
                            {result.tracks.map((track, i) => (
                                <li key={i} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition space-y-2">
                                    <div className="flex flex-wrap items-center gap-3 text-gray-700 dark:text-gray-300">
                                        <span className="text-xs font-mono text-gray-400 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                                        <Play className="w-3 h-3 text-teal-500" />
                                        <span className="font-medium min-w-0 break-words">{track.title}</span>
                                        {track.isVocal && (
                                            <span className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                                {t("album.vocalBadge")}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => copyTrackPrompt(track.prompt, i)}
                                            className="ml-auto p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                            title={t("album.copyTrackPrompt")}
                                        >
                                            {copiedTrackIndex === i ? (
                                                <Check className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-9 whitespace-pre-wrap break-words">
                                        {track.prompt}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {t("label.description")}
                            </h3>
                            <button
                                type="button"
                                onClick={() => copySection(result.youtubeDescription, 'description')}
                                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                title={t("album.copyDescription")}
                            >
                                {copiedSection === 'description' ? (
                                    <Check className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap h-32 overflow-y-auto border border-gray-100 dark:border-gray-800">
                            {result.youtubeDescription}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              {t("label.tags")}
                            </h3>
                            <button
                                type="button"
                                onClick={() => copySection(result.tags.join(', '), 'tags')}
                                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                title={t("album.copyTags")}
                            >
                                {copiedSection === 'tags' ? (
                                    <Check className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {result.tags.map((tag, i) => (
                                <span key={i} className="max-w-full break-words px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">#{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-500" />
                            {t("label.visualAssets")}
                        </h3>
                    </div>

                    {!visuals ? (
                         <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-gray-900/50">
                            <p className="text-sm text-gray-500 mb-4 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 italic">
                              {t("album.visualPromptReady")}: &quot;{result.imagePrompt.slice(0, 50)}...&quot;
                            </p>
                            <button
                                onClick={handleGenerateArt}
                                disabled={visualLoading || isTextOnlyProvider}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg transition flex items-center gap-2 group"
                            >
                                {visualLoading ? <Loader2 className="animate-spin" /> : <Layers className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                {t("tool.album.generateArt")}
                            </button>
                            {isTextOnlyProvider && (
                              <p className="mt-3 text-xs text-purple-600 dark:text-purple-300">
                                {t("provider.textOnlyNote")}
                              </p>
                            )}
                         </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Base Image */}
                            <div className="col-span-2 group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer shadow-md" onClick={() => setSelectedImage(visuals.baseImage)}>
                                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white z-10 font-mono">
                                  {t("album.art.clean")}
                                </div>
                                <img src={visuals.baseImage} alt={t("album.art.baseAlt")} className="w-full h-auto transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Maximize2 className="text-white drop-shadow-lg" />
                                </div>
                                <a href={visuals.baseImage} download="album-clean.png" className="absolute bottom-2 right-2 bg-purple-600 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition hover:bg-purple-500 z-20" onClick={(e) => e.stopPropagation()}><Download className="w-4 h-4" /></a>
                            </div>

                             {/* Square Artwork */}
                             <div className="col-span-1 group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer shadow-md" onClick={() => setSelectedImage(visuals.squareWithText)}>
                                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white z-10 font-mono">
                                  {t("album.art.square")}
                                </div>
                                <img src={visuals.squareWithText} alt={t("album.art.coverAlt")} className="w-full h-auto transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Maximize2 className="text-white drop-shadow-lg" />
                                </div>
                                <a href={visuals.squareWithText} download="album-cover.png" className="absolute bottom-2 right-2 bg-purple-600 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition hover:bg-purple-500 z-20" onClick={(e) => e.stopPropagation()}><Download className="w-4 h-4" /></a>
                            </div>

                             {/* Video Cover */}
                             <div className="col-span-1 group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer shadow-md" onClick={() => setSelectedImage(visuals.landscapeWithText)}>
                                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white z-10 font-mono">
                                  {t("album.art.video")}
                                </div>
                                <img src={visuals.landscapeWithText} alt={t("album.art.videoAlt")} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Maximize2 className="text-white drop-shadow-lg" />
                                </div>
                                <a href={visuals.landscapeWithText} download="album-video.png" className="absolute bottom-2 right-2 bg-purple-600 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition hover:bg-purple-500 z-20" onClick={(e) => e.stopPropagation()}><Download className="w-4 h-4" /></a>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              {t("album.empty")}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-7xl w-full flex items-center justify-center">
                <img src={selectedImage} alt={t("album.art.previewAlt")} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border border-gray-800" onClick={(e) => e.stopPropagation()}/>
                <button 
                    onClick={() => setSelectedImage(null)} 
                    className="absolute -top-12 right-0 md:top-4 md:right-4 p-2 bg-gray-800/50 hover:bg-red-500 rounded-full text-white transition backdrop-blur"
                >
                    <X className="w-8 h-8" />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AlbumGenerator;
