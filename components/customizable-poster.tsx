"use client";

import { useState } from "react";
import Image from "next/image";
import { Edit2, Sparkles } from "lucide-react";
import { ArtworkCustomizer } from "./artwork-customizer";

interface CustomizablePosterProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  defaultPosterPath: string | null;
  defaultBackdropPath: string | null;
  currentPosterPath: string | null;
  currentBackdropPath: string | null;
  posterUrl: string;
}

export function CustomizablePoster({
  tmdbId,
  mediaType,
  title,
  defaultPosterPath,
  defaultBackdropPath,
  currentPosterPath,
  currentBackdropPath,
  posterUrl,
}: CustomizablePosterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="relative overflow-hidden rounded-md shadow-2xl shadow-black/85 border border-border/60 cursor-pointer group" 
        style={{ width: 200, height: 300 }}
      >
        <Image 
          src={posterUrl} 
          alt={title} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-500" 
          priority 
          sizes="200px" 
        />
        <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
          <div className="rounded-full bg-[#00e054]/90 p-2 text-[#14181c] shadow-lg shadow-[#00e054]/20 scale-90 group-hover:scale-100 transition-transform duration-300">
            <Edit2 className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00e054]">
            Edit Artwork
          </span>
        </div>
      </div>

      <ArtworkCustomizer
        tmdbId={tmdbId}
        mediaType={mediaType}
        defaultPosterPath={defaultPosterPath}
        defaultBackdropPath={defaultBackdropPath}
        currentPosterPath={currentPosterPath}
        currentBackdropPath={currentBackdropPath}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

