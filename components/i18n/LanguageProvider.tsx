"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const resolveDictionary = (lang: Lang) => dictionaries[lang] ?? dictionaries.en;

export const LanguageProvider = ({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) => {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = useMemo(() => {
    const dict = resolveDictionary(lang);
    return (key: string) => dict[key] ?? dictionaries.en[key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return context;
};

export const useT = () => {
  const { t } = useI18n();
  return t;
};
