"use client";

import Link from "next/link";
import { Search, Plus, User } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogClick: () => void;
}

export function Header({ searchQuery, onSearchChange, onLogClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#14181c]/95 backdrop-blur supports-[backdrop-filter]:bg-[#14181c]/80">
      <div className="mx-auto flex h-15 max-w-[1200px] items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="CEnt"
            className="h-30 w-auto group-hover:opacity-90 transition-opacity"
          />
        </Link>

        {/* Center Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Static Account Indicator */}
          <div className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[#9ab] select-none">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#456]">
              <User className="h-3.5 w-3.5 text-[#9ab]" />
            </div>
            <span className="font-medium text-white">FILMFAN_01</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 pl-4">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors"
            >
              Films
            </Link>
            <Link
              href="/tv-series"
              className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors"
            >
              TV Series
            </Link>
            <Link
              href="/watchlist"
              className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors"
            >
              Watchlist
            </Link>
            <Link
              href="/diary"
              className="text-sm font-semibold uppercase tracking-wider text-[#9ab] hover:text-[#40bcf4] transition-colors"
            >
              Diary
            </Link>
          </nav>
        </div>

        {/* Right side: Search + Log Button */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search films..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[200px] rounded-sm border-none bg-[#2c3440] pl-8 pr-3 text-sm text-white placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#40bcf4] focus-visible:ring-offset-0"
            />
          </div>

          {/* Mobile search */}
          <button className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:text-white transition-colors md:hidden">
            <Search className="h-4 w-4" />
          </button>

          {/* Log Button */}
          <button
            onClick={onLogClick}
            className="flex items-center gap-1.5 rounded bg-[#00c030] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#00e054] active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            LOG
          </button>
        </div>
      </div>
    </header>
  );
}
