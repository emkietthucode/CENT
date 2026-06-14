"use client";

import Link from "next/link";
import { Heart, Github, Film } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-border bg-[#0b0e11] text-muted-foreground select-none">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff8000] via-[#00e054] to-[#40bcf4]" />

      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="flex items-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
                <span className="h-3.5 w-3.5 rounded-full bg-[#ff8000] shadow-[0_0_8px_rgba(255,128,0,0.5)]" />
                <span className="h-3.5 w-3.5 rounded-full bg-[#00e054] shadow-[0_0_8px_rgba(0,224,84,0.5)]" />
                <span className="h-3.5 w-3.5 rounded-full bg-[#40bcf4] shadow-[0_0_8px_rgba(64,188,244,0.5)]" />
              </div>
              <span className="text-lg font-black text-white tracking-widest uppercase transition-colors duration-200 group-hover:text-[#00e054]">
                CEnt
              </span>
            </Link>
            <p className="text-sm max-w-sm leading-relaxed text-muted-foreground/80">
              Your personal cinematic dashboard. Track, review, and customize your movie and TV series journey with rich data integration and artwork customization.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">Navigation</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors duration-200">
                  Discover Movies
                </Link>
              </li>
              <li>
                <Link href="/tv-series" className="hover:text-white transition-colors duration-200">
                  TV Series
                </Link>
              </li>
              <li>
                <Link href="/diary" className="hover:text-white transition-colors duration-200">
                  Diary
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="hover:text-white transition-colors duration-200">
                  Watchlist
                </Link>
              </li>
              <li>
                <Link href="/top-250-imdb" className="hover:text-white transition-colors duration-200">
                  IMDb Top 250
                </Link>
              </li>
            </ul>
          </div>

          {/* Integration & Tech Info Column */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">API Sources</h4>
            <div className="space-y-3 text-xs leading-relaxed">
              <p>
                Film data and images are powered by{" "}
                <a
                  href="https://www.themoviedb.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-[#00e054] underline decoration-border hover:decoration-[#00e054] transition-all duration-200"
                >
                  TMDB
                </a>.
              </p>
              <p>
                Ratings and extra metadata are dynamically fetched from the{" "}
                <a
                  href="http://www.omdbapi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-[#40bcf4] underline decoration-border hover:decoration-[#40bcf4] transition-all duration-200"
                >
                  OMDb API
                </a>.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1 select-none">
            <span>© {new Date().getFullYear()} CEnt. Made with</span>
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 animate-pulse" />
            <span>for film lovers.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors duration-200"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <span className="text-border/40">|</span>
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50">
              <Film className="h-3 w-3" />
              <span>Version 0.1.1</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
