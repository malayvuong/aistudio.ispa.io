"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";

type TurnstileWidgetProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  resetSignal?: number;
};

const TurnstileWidget = ({ siteKey, onVerify, resetSignal }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || widgetIdRef.current) return;
    const turnstile = (window as typeof window & { turnstile?: any }).turnstile;
    if (!turnstile) return;
    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token: string) => onVerifyRef.current(token),
      "expired-callback": () => onVerifyRef.current(""),
      "error-callback": () => onVerifyRef.current(""),
    });
  }, [siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      const turnstile = (window as typeof window & { turnstile?: any }).turnstile;
      if (turnstile && widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [renderWidget]);

  useEffect(() => {
    if (resetSignal === undefined) return;
    const turnstile = (window as typeof window & { turnstile?: any }).turnstile;
    if (turnstile && widgetIdRef.current) {
      turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div ref={containerRef} />
    </>
  );
};

export default TurnstileWidget;
