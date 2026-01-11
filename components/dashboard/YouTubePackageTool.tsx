
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from "next/link";
import type { AIProviderId } from '@/services/ai/types';
import { AI_PROVIDER_OPTIONS, DEFAULT_PROVIDER_ID, getProviderLabel, normalizeAIProviderId } from '@/lib/ai-provider';
import { generatePackage, generateVisualAssets } from '@/services/geminiService';
import { SongInput, PackagingResult, GenreTier, VisualAssets } from '@/types';
import { useChannelProfiles } from "@/lib/hooks/useChannelProfiles";
import { consumeRerunPayload } from "@/lib/rerun";
import { useVaultStatus } from "@/lib/hooks/useVaultStatus";
import { useT } from "@/components/i18n/LanguageProvider";
import CanvasPreview from './CanvasPreview';
import { Music, Sparkles, Youtube, Image as ImageIcon, Loader2, Copy, FileText, Tag, RefreshCw, ImagePlus, Download, Layers, Check, X, Maximize2, AlertTriangle } from 'lucide-react';

const YouTubePackageTool: React.FC = () => {
  // Provider State
  const [providerId, setProviderId] = useState<AIProviderId>(DEFAULT_PROVIDER_ID);
  const t = useT();
  const { initializedProviders, capabilities, loading: providersLoading } = useVaultStatus();

  // App State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackagingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [generatingVisuals, setGeneratingVisuals] = useState(false);
  const [visualStep, setVisualStep] = useState<string>("");
  const [visuals, setVisuals] = useState<VisualAssets | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const safeTags = Array.isArray(result?.tags) ? result.tags : [];
  const isTextOnlyProvider = capabilities[providerId]?.image === false;
  
  // Input State
  const [inputs, setInputs] = useState<SongInput>({
    songName: '',
    stylePrompt: '',
    lyrics: '',
    userDescription: '',
    visualPromptOverride: '',
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

  // Provider Initialization
  useEffect(() => {
    const storedProvider = localStorage.getItem('ai_provider');
    const normalized = normalizeAIProviderId(storedProvider);
    if (normalized) {
      setProviderId(normalized);
    }
  }, []);

  useEffect(() => {
    const rerun = consumeRerunPayload("YOUTUBE_PACKAGE");
    if (!rerun) return;

    const input = rerun.input;
    const asString = (value: unknown) => (typeof value === "string" ? value : "");

    setInputs((prev) => ({
      ...prev,
      songName: asString(input.songName),
      stylePrompt: asString(input.stylePrompt),
      lyrics: asString(input.lyrics),
      userDescription: asString(input.userDescription),
      visualPromptOverride: asString(input.visualPromptOverride),
    }));

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
    if (!pendingChannelId || channels.length === 0) return;
    if (channels.some((channel) => channel.id === pendingChannelId)) {
      setSelectedChannelId(pendingChannelId);
    }
    setPendingChannelId(null);
  }, [channels, pendingChannelId, setSelectedChannelId]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    if (!inputs.songName || !inputs.stylePrompt) return;
    if (!selectedChannelId) {
      setErrorMsg(t("error.channelRequired"));
      return;
    }
    
    setLoading(true);
    setResult(null);
    setVisuals(null);
    setErrorMsg(null);

    try {
      const data = await generatePackage({ ...inputs, channelId: selectedChannelId }, providerId);
      setResult(data);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || t("error.generatePackageFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVisuals = async () => {
    if (!result?.imagePrompt) return;
    if (isTextOnlyProvider) {
      setErrorMsg(t("error.providerTextOnly"));
      return;
    }
    if (!selectedChannelId) {
      setErrorMsg(t("error.channelRequiredVisuals"));
      return;
    }
    setGeneratingVisuals(true);
    setVisualStep(t("youtube.visuals.init"));
    setErrorMsg(null);
    
    try {
      setVisualStep(t("youtube.visuals.step"));
      
      const assets = await generateVisualAssets(
        result.imagePrompt,
        inputs.songName,
        providerId,
        selectedChannelId
      );
      
      setVisuals(assets);
    } catch (error: any) {
      console.error("Visual Generation Error:", error);
      if (error?.code === "PROVIDER_TEXT_ONLY") {
        setErrorMsg(t("error.providerTextOnly"));
      } else {
        setErrorMsg(error?.message || t("error.imageGenerationFailed"));
      }
    } finally {
      setGeneratingVisuals(false);
      setVisualStep("");
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyTags = () => {
    if (!result) return;
    copyToClipboard(safeTags.join(', '), 'tags');
  };

  const copyFullPackage = () => {
    if (!result) return;
    const fullText = `TITLE:\n${result.youtubeTitle}\n\nDESCRIPTION:\n${result.youtubeDescription}\n\nTAGS:\n${safeTags.join(', ')}`;
    copyToClipboard(fullText, 'full');
  };

  const getTierColor = (tier: GenreTier) => {
    switch (tier) {
        case GenreTier.TIER_1_EPIC: return "text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30 bg-orange-100 dark:bg-orange-500/10";
        case GenreTier.TIER_2_LOFI: return "text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30 bg-teal-100 dark:bg-teal-500/10";
        default: return "text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 bg-indigo-100 dark:bg-indigo-500/10";
    }
  };

  const getTierLabel = (tier: GenreTier) => {
    switch (tier) {
        case GenreTier.TIER_1_EPIC: return t("youtube.tier.epic");
        case GenreTier.TIER_2_LOFI: return t("youtube.tier.lofi");
        default: return t("youtube.tier.cinematic");
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: MAIN APP
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen transition-colors duration-500 bg-gray-50 dark:bg-gray-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-gray-800 dark:via-gray-950 dark:to-gray-950 text-gray-900 dark:text-gray-200">
      <div className="w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-6 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Music className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {t("tool.youtube.title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("tool.youtube.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 text-xs text-gray-600 dark:text-gray-500 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                {t("label.poweredBy")} {getProviderLabel(providerId)}
             </div>
          </div>
        </div>

        {/* Left Column: Input Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl transition-colors duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              {t("label.songDetails")}
            </h2>
            
            <div className="space-y-4">
              
              {/* Channel Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {t("label.channelProfile")}
                </label>
                {channelsLoading ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t("label.loadingChannels")}</div>
                ) : channels.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm text-gray-600 dark:text-gray-300">
                    <p>{t("label.noChannelProfiles")}</p>
                    <Link
                      href="/dashboard/channels"
                      className="mt-2 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
                    >
                      {t("label.createChannelProfile")}
                    </Link>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedChannelId}
                      onChange={(event) => setSelectedChannelId(event.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
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

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {t("label.aiProvider")}
                </label>
                <select
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value as AIProviderId)}
                  disabled={!hasProviders || providersLoading}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
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

              <div>
                <label htmlFor="songName" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  {t("label.songName")}
                </label>
                <input
                  id="songName"
                  type="text"
                  name="songName"
                  value={inputs.songName}
                  onChange={handleInputChange}
                  placeholder={t("youtube.song.placeholder")}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="stylePrompt" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  {t("youtube.style.label")}
                </label>
                <input
                  id="stylePrompt"
                  type="text"
                  name="stylePrompt"
                  value={inputs.stylePrompt}
                  onChange={handleInputChange}
                  placeholder={t("youtube.style.placeholder")}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="lyrics" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    {t("youtube.lyrics.label")}{" "}
                    <span className="text-gray-400 dark:text-gray-600 normal-case tracking-normal">
                      ({t("label.lyricsOptional")})
                    </span>
                </label>
                <textarea
                  id="lyrics"
                  name="lyrics"
                  value={inputs.lyrics}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder={t("youtube.lyrics.placeholder")}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label htmlFor="userDescription" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  {t("youtube.extra.label")}
                </label>
                <input
                  id="userDescription"
                  type="text"
                  name="userDescription"
                  value={inputs.userDescription}
                  onChange={handleInputChange}
                  placeholder={t("youtube.context.placeholder")}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                />
              </div>
              
              <div>
                <label htmlFor="visualPromptOverride" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  {t("youtube.visual.label")}
                </label>
                <input
                  id="visualPromptOverride"
                  type="text"
                  name="visualPromptOverride"
                  value={inputs.visualPromptOverride}
                  onChange={handleInputChange}
                  placeholder={t("youtube.visual.placeholder")}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !inputs.songName || !inputs.stylePrompt || !selectedChannelId || !hasProviders}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 dark:shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {t("tool.youtube.generate")}
                </>
              )}
            </button>

            {errorMsg && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="text-sm text-red-600 dark:text-red-200">
                  <p className="font-semibold">{t("youtube.error.title")}</p>
                  <p className="break-words">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-8">
          {!result && !loading && !errorMsg && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-gray-400 dark:text-gray-600 transition-colors">
               <Music className="w-16 h-16 mb-4 opacity-20" />
               <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{t("youtube.ready.title")}</p>
               <p className="text-sm text-gray-400 dark:text-gray-500">{t("youtube.ready.subtitle")}</p>
            </div>
          )}
          
          {loading && (
             <div className="h-full flex flex-col items-center justify-center p-12">
               <div className="relative">
                 <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                 </div>
               </div>
               <p className="mt-4 text-indigo-600 dark:text-indigo-300 font-medium animate-pulse">{t("youtube.loading")}</p>
             </div>
          )}

          {result && (
            <>
              {/* Classification Banner */}
              <div className={`p-4 rounded-xl border ${getTierColor(result.tier)} flex items-start gap-4 transition-colors`}>
                <div className="mt-1">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{getTierLabel(result.tier)}</h3>
                  <p className="text-sm opacity-90 mt-1">{result.tierReasoning}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* SEO Section */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm dark:shadow-none transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Youtube className="w-5 h-5 text-red-500" />
                            {t("label.youtubeTitle")}
                        </h3>
                        <button onClick={() => copyToClipboard(result.youtubeTitle, 'title')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500 dark:text-gray-400">
                            {copiedSection === 'title' ? <Check className="w-4 h-4 text-green-500 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-lg font-medium text-gray-800 dark:text-white break-words">{result.youtubeTitle}</p>
                  </div>

                  <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm dark:shadow-none transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                            {t("label.description")}
                        </h3>
                        <button onClick={() => copyToClipboard(result.youtubeDescription, 'description')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500 dark:text-gray-400">
                            {copiedSection === 'description' ? <Check className="w-4 h-4 text-green-500 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded-lg border border-gray-200 dark:border-gray-800 h-40 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap transition-colors">
                        {result.youtubeDescription}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm dark:shadow-none transition-colors">
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Tag className="w-5 h-5 text-green-500 dark:text-green-400" />
                            {t("label.tags")}
                        </h3>
                        <button
                          onClick={copyTags}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500 dark:text-gray-400"
                          title={t("youtube.copy.tagsTitle")}
                        >
                            {copiedSection === 'tags' ? <Check className="w-4 h-4 text-green-500 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {safeTags.map((tag, idx) => (
                            <span key={idx} className="max-w-full break-words px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-md border border-gray-200 dark:border-gray-700 transition-colors">
                                #{tag}
                            </span>
                        ))}
                    </div>
                  </div>

                  <button 
                    onClick={copyFullPackage}
                    className="w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 transition shadow-sm dark:shadow-none"
                  >
                    {copiedSection === 'full' ? <Check className="w-5 h-5 text-green-500 dark:text-green-400" /> : <Copy className="w-5 h-5 text-gray-400" />}
                    <span className="font-medium text-gray-700 dark:text-gray-200">{t("youtube.copyFull")}</span>
                  </button>
                </div>

                {/* Visuals Section */}
                <div className="space-y-6">
                   <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm dark:shadow-none transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                {t("label.imagePrompt")}
                            </h3>
                             <button onClick={() => copyToClipboard(result.imagePrompt, 'prompt')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-gray-500 dark:text-gray-400">
                                {copiedSection === 'prompt' ? <Check className="w-4 h-4 text-green-500 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-950 p-3 rounded border border-gray-200 dark:border-gray-800 transition-colors">
                            &quot;{result.imagePrompt}&quot;
                        </p>
                   </div>

                   {/* AI Image Generation Area */}
                   <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm dark:shadow-none transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                          {t("label.visualAssets")} ({getProviderLabel(providerId)})
                        </h3>
                      </div>
                      
                      {!visuals ? (
                         <>
                           <button
                              onClick={handleGenerateVisuals}
                              disabled={generatingVisuals || isTextOnlyProvider}
                              className="w-full py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-purple-500 hover:text-purple-500 dark:hover:text-purple-400 transition group bg-gray-50 dark:bg-gray-900/20"
                           >
                              {generatingVisuals ? (
                                  <>
                                      <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                      <span className="text-sm">{t("youtube.visuals.count")}</span>
                                      <span className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 font-medium animate-pulse">{visualStep}</span>
                                  </>
                              ) : (
                                  <>
                                      <ImagePlus className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                                      <span className="text-sm font-medium">{t("tool.youtube.generateVisuals")}</span>
                                      <span className="text-xs text-gray-600 mt-1">{t("youtube.visuals.sizes")}</span>
                                  </>
                              )}
                           </button>
                           {isTextOnlyProvider && (
                             <p className="mt-3 text-xs text-purple-500 dark:text-purple-400">
                               {t("provider.textOnlyNote")}
                             </p>
                           )}
                         </>
                      ) : (
                          <div className="space-y-6 animate-in fade-in duration-500">
                            
                             {/* 1. Base Image */}
                             <div className="group relative">
                                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-mono z-10 pointer-events-none">
                                  {t("youtube.visuals.base")}
                                </div>
                                <div className="relative overflow-hidden rounded-lg cursor-pointer shadow-lg border border-gray-200 dark:border-gray-700 group-hover:border-indigo-500/50 transition" onClick={() => setSelectedImage(visuals.baseImage)}>
                                  <img src={visuals.baseImage} alt={t("youtube.visuals.baseAlt")} className="w-full transition-transform duration-300 group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                     <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                                  </div>
                                </div>
                                <a href={visuals.baseImage} download="base-16-9.png" className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg shadow-lg transition flex items-center gap-2 z-20">
                                    <Download className="w-4 h-4 text-white" />
                                    <span className="text-xs font-bold text-white">{t("youtube.visuals.download")}</span>
                                </a>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                {/* 2. Square with Text */}
                                <div className="group relative">
                                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-mono z-10 pointer-events-none">
                                      {t("youtube.visuals.cover")}
                                    </div>
                                    <div className="relative overflow-hidden rounded-lg cursor-pointer shadow-lg border border-gray-200 dark:border-gray-700 group-hover:border-indigo-500/50 transition" onClick={() => setSelectedImage(visuals.squareWithText)}>
                                      <img src={visuals.squareWithText} alt={t("youtube.visuals.coverAlt")} className="w-full transition-transform duration-300 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                         <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                                      </div>
                                    </div>
                                    <a href={visuals.squareWithText} download="cover-1-1.png" className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg shadow-lg transition flex items-center gap-2 z-20">
                                        <Download className="w-4 h-4 text-white" />
                                        <span className="text-xs font-bold text-white hidden sm:inline">{t("youtube.visuals.download")}</span>
                                    </a>
                                </div>

                                {/* 3. Landscape with Text */}
                                <div className="group relative">
                                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-mono z-10 pointer-events-none">
                                      {t("youtube.visuals.video")}
                                    </div>
                                    <div className="relative overflow-hidden rounded-lg cursor-pointer shadow-lg border border-gray-200 dark:border-gray-700 group-hover:border-indigo-500/50 transition" onClick={() => setSelectedImage(visuals.landscapeWithText)}>
                                      <img src={visuals.landscapeWithText} alt={t("youtube.visuals.videoAlt")} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                         <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                                      </div>
                                    </div>
                                    <a href={visuals.landscapeWithText} download="video-cover-16-9.png" className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg shadow-lg transition flex items-center gap-2 z-20">
                                        <Download className="w-4 h-4 text-white" />
                                        <span className="text-xs font-bold text-white hidden sm:inline">{t("youtube.visuals.download")}</span>
                                    </a>
                                </div>
                             </div>

                             <button 
                                onClick={() => setVisuals(null)} 
                                className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 transition"
                             >
                                {t("youtube.visuals.clear")}
                             </button>
                          </div>
                      )}
                   </div>

                   {/* The "PIL" Mockups using Canvas (Legacy/Preview) */}
                   <div className="space-y-4 opacity-60 hover:opacity-100 transition">
                        <h3 className="font-semibold text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider text-center">
                          {t("youtube.visuals.structure")}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <CanvasPreview tier={result.tier} text={inputs.songName} ratio="16:9" />
                        </div>
                   </div>
                </div>

              </div>
            </>
          )}
        </div>
        </div>
      </div>
      
      {/* Lightbox / Image Preview Modal */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-7xl max-h-screen w-full flex items-center justify-center">
                <img 
                    src={selectedImage} 
                    alt={t("youtube.visuals.previewAlt")}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-gray-800"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                />
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-12 right-0 md:top-4 md:right-4 p-2 bg-gray-800/50 hover:bg-red-500/80 rounded-full text-white transition backdrop-blur-md"
                >
                    <X className="w-8 h-8" />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default YouTubePackageTool;
