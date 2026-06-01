"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Heart } from "lucide-react";
import type { DiaryEntry } from "./log-modal";

interface DiarySectionProps {
  entries: DiaryEntry[];
}

export function DiarySection({ entries }: DiarySectionProps) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Diary
        </h2>
        <span className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {entries.map((entry, index) => (
          <Link
            key={`${entry.movie.id}-${index}`}
            href={`/movie/${entry.movie.id}`}
            className="group relative"
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] overflow-hidden rounded border-2 border-transparent transition-all duration-200 group-hover:border-[#00e054]">
              <Image
                src={entry.movie.posterUrl}
                alt={entry.movie.title}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              {/* Rating overlay on hover */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
                {entry.rating > 0 && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= entry.rating
                            ? "fill-[#00e054] text-[#00e054]"
                            : "fill-transparent text-[#678]"
                        }`}
                      />
                    ))}
                  </div>
                )}
                {entry.liked && (
                  <Heart className="h-4 w-4 fill-[#ff8000] text-[#ff8000]" />
                )}
              </div>
            </div>

            {/* Entry details below poster */}
            <div className="mt-2 space-y-1">
              <p className="truncate text-sm font-medium text-white">
                {entry.movie.title}
              </p>
              <p className="text-xs text-[#678]">{entry.watchedOn}</p>
              {entry.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= entry.rating
                          ? "fill-[#00e054] text-[#00e054]"
                          : "fill-transparent text-[#456]"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
