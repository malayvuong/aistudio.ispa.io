"use client";

import React, { useRef, useEffect } from 'react';
import { GenreTier } from '@/types';
import { useT } from "@/components/i18n/LanguageProvider";

interface CanvasPreviewProps {
  tier: GenreTier;
  text: string;
  ratio: '16:9' | '1:1';
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ tier, text, ratio }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useT();

  // Dimensions
  const width = 800;
  const height = ratio === '16:9' ? 450 : 800;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background Rendering (Simulating PIL Image.new & gradients)
    const gradient = ctx.createLinearGradient(0, 0, width, height);

    if (tier === GenreTier.TIER_1_EPIC) {
      // Warm: Red -> Orange -> Purple
      gradient.addColorStop(0, '#4a0404');
      gradient.addColorStop(0.5, '#9a1a1a');
      gradient.addColorStop(1, '#5b21b6');
    } else if (tier === GenreTier.TIER_2_LOFI) {
      // Cool: Slate -> Teal -> Soft Blue
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(0.6, '#334155');
      gradient.addColorStop(1, '#64748b');
    } else {
      // Default: Moody Dark Gray -> Deep Blue
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e1b4b');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Text Rendering (Simulating PIL ImageDraw.Draw)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Font Styling Logic
    if (tier === GenreTier.TIER_1_EPIC) {
      // Impact-style, Bold, Center
      const fontSize = ratio === '16:9' ? 80 : 100;
      ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillText(text.toUpperCase(), width / 2, height / 2);
      
      // Add a border accent
      ctx.strokeStyle = '#fbbf24'; // Amber
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, width - 40, height - 40);

    } else if (tier === GenreTier.TIER_2_LOFI) {
      // Serif, Elegant, Small, Bottom Right
      const fontSize = 48;
      ctx.font = `400 ${fontSize}px "Playfair Display", serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      
      // Add subtle decoration
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(text, width - 40, height - 40);
      
      // Draw a "moon" circle
      ctx.beginPath();
      ctx.arc(80, 80, 40, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 230, 0.9)';
      ctx.fill();

    } else {
      // Cinematic Standard
      const fontSize = 60;
      ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 10;
      ctx.fillText(text, width / 2, height / 2);
    }

  }, [tier, text, width, height, ratio]);

  return (
    <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">
          {ratio} {t("youtube.visuals.preview")}
        </span>
        <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto rounded-lg shadow-lg border border-gray-700"
        />
    </div>
  );
};

export default CanvasPreview;
