
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from "next/link";
import type { AIProviderId } from '@/services/ai/types';
import { AI_PROVIDER_OPTIONS, DEFAULT_PROVIDER_ID, getProviderLabel, normalizeAIProviderId } from '@/lib/ai-provider';
import { generateMusicPrompt } from '@/services/geminiService';
import { MusicInput, MusicResult } from '@/types';
import { useChannelProfiles } from "@/lib/hooks/useChannelProfiles";
import { consumeRerunPayload } from "@/lib/rerun";
import { useVaultStatus } from "@/lib/hooks/useVaultStatus";
import { useT } from "@/components/i18n/LanguageProvider";
import { Mic2, Sparkles, Copy, Check, Loader2, Wand2, Music2 } from 'lucide-react';

const OPTIONS = {
  genres: [
    "Pop", "R&B", "Hip-Hop", "Rap", "EDM", "House", "Techno", "Rock", "Metal",
    "Acoustic", "Folk", "Jazz", "Blues", "Classical", "Cinematic", "Reggae", "Latin", "K-Pop", "V-Pop", "Indie"
  ],
  vibes: [
    "Emotional", "High Energy", "Chill", "Dark", "Epic", "Dreamy", "Nostalgic",
    "Hopeful", "Aggressive", "Romantic", "Melancholic", "Uplifting", "Mysterious", "Sexy", "Groovy"
  ],
  instruments: [
    "Piano", "Synth", "Electric Piano", "Organ",
    "Acoustic Guitar", "Electric Guitar", "Violin", "Cello", "Bass Guitar", "Upright Bass",
    "Flute", "Bamboo Flute", "Saxophone", "Trumpet",
    "Drums", "Heavy Drums", "Electronic Drums", "Percussion", "808"
  ],
  vocals: [
    "Male Vocals", "Female Vocals", "Duet", "Choir", "Auto-tune", "Spoken Word", "Rap", "Instrumental (No Vocals)"
  ]
};

const MusicGenerator: React.FC = () => {
  const [providerId, setProviderId] = useState<AIProviderId>(DEFAULT_PROVIDER_ID);
  const t = useT();
  const { initializedProviders, capabilities, loading: providersLoading } = useVaultStatus();

  const [inputs, setInputs] = useState<MusicInput>({
    lyrics: '',
    genres: [],
    vibes: [],
    instruments: [],
    vocals: [],
    customContext: ''
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
  const [result, setResult] = useState<MusicResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem('ai_provider');
    const normalized = normalizeAIProviderId(storedProvider);
    if (normalized) {
      setProviderId(normalized);
    }
  }, []);

  useEffect(() => {
    const rerun = consumeRerunPayload("MUSIC_PROMPT");
    if (!rerun) return;

    const input = rerun.input;
    const asString = (value: unknown) => (typeof value === "string" ? value : "");
    const asStringArray = (value: unknown) =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

    setInputs((prev) => ({
      ...prev,
      lyrics: asString(input.lyrics),
      genres: asStringArray(input.genres),
      vibes: asStringArray(input.vibes),
      instruments: asStringArray(input.instruments),
      vocals: asStringArray(input.vocals),
      customContext: asString(input.customContext),
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

  type MultiSelectField = "genres" | "vibes" | "instruments" | "vocals";

  const toggleSelection = (field: MultiSelectField, value: string) => {
    setInputs(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      if (!selectedChannelId) {
        alert(t("error.channelRequired"));
        return;
      }
      const data = await generateMusicPrompt(
        { ...inputs, channelId: selectedChannelId },
        providerId
      );
      setResult(data);
    } catch (err) {
      console.error(err);
      alert(t("error.generateMusicFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
            <div className="p-2 bg-pink-600 rounded-lg shadow-lg shadow-pink-500/20">
                <Music2 className="w-6 h-6 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                {t("tool.music.title")}
            </span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t("tool.music.subtitle")}</p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {t("label.poweredBy")} {getProviderLabel(providerId)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-800 space-y-6">
            <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                    {t("label.channelProfile")}
                </label>
                {channelsLoading ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t("label.loadingChannels")}</div>
                ) : channels.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm text-gray-600 dark:text-gray-300">
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
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                    {t("label.aiProvider")}
                </label>
                <select
                    value={providerId}
                    onChange={(event) => setProviderId(event.target.value as AIProviderId)}
                    disabled={!hasProviders || providersLoading}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
            
            {/* Genre */}
            <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                    {t("music.genre.label")}
                </label>
                <div className="flex flex-wrap gap-2">
                    {OPTIONS.genres.map(g => (
                        <button 
                            key={g} 
                            onClick={() => toggleSelection('genres', g)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${inputs.genres.includes(g) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vibe */}
            <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                    {t("music.vibe.label")}
                </label>
                <div className="flex flex-wrap gap-2">
                    {OPTIONS.vibes.map(v => (
                        <button 
                            key={v} 
                            onClick={() => toggleSelection('vibes', v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${inputs.vibes.includes(v) ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-400'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

             {/* Vocals */}
             <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                    {t("music.vocals.label")}
                </label>
                <div className="flex flex-wrap gap-2">
                    {OPTIONS.vocals.map(v => (
                        <button 
                            key={v} 
                            onClick={() => toggleSelection('vocals', v)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${inputs.vocals.includes(v) ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-teal-400'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

             {/* Instruments */}
             <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                    {t("music.instruments.label")}
                </label>
                <div className="flex flex-wrap gap-2">
                    {OPTIONS.instruments.map(i => (
                        <button 
                            key={i} 
                            onClick={() => toggleSelection('instruments', i)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${inputs.instruments.includes(i) ? 'bg-pink-600 text-white border-pink-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-pink-400'}`}
                        >
                            {i}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom & Lyrics */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="customContext" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                        {t("music.context.label")}
                    </label>
                    <input 
                        id="customContext"
                        name="customContext"
                        type="text" 
                        value={inputs.customContext}
                        onChange={(e) => setInputs({...inputs, customContext: e.target.value})}
                        placeholder={t("music.context.placeholder")}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label htmlFor="lyrics" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs">
                        {t("music.lyrics.label")}
                    </label>
                    <textarea 
                        id="lyrics"
                        name="lyrics"
                        value={inputs.lyrics}
                        onChange={(e) => setInputs({...inputs, lyrics: e.target.value})}
                        placeholder={t("music.lyrics.placeholder")}
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading || !selectedChannelId || !hasProviders}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                {t("tool.music.generate")}
            </button>
        </div>

        {/* Right: Output */}
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800/50 h-full flex flex-col shadow-inner">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-5 h-5" />
                {t("tool.music.generated")}
                </h3>
                
                {result ? (
                    <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="bg-white dark:bg-black/40 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex-1 relative group">
                            <p className="text-lg font-mono text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                                {result.prompt}
                            </p>
                        </div>
                        
                        <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                             <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
                                {t("music.reasoning.label")}:
                             </p>
                             <p className="text-sm text-gray-600 dark:text-gray-300 italic">&quot;{result.explanation}&quot;</p>
                        </div>

                        <button
                            onClick={handleCopy}
                            className="w-full py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
                        >
                            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                            <span className="font-medium">
                              {copied ? t("music.copied") : t("music.copy")}
                            </span>
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Mic2 className="w-8 h-8 opacity-20" />
                        </div>
                        <p>{t("music.empty")}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MusicGenerator;
