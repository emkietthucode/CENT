"use client";

import Link from "next/link";
import { Search, ChevronDown, Plus, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogClick: () => void;
}

export function Header({ searchQuery, onSearchChange, onLogClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#14181c]/95 backdrop-blur supports-[backdrop-filter]:bg-[#14181c]/80">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="h-4 w-4 rounded-full bg-[#ff8000]" />
            <span className="h-4 w-4 rounded-full bg-[#00e054]" />
            <span className="h-4 w-4 rounded-full bg-[#40bcf4]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Filmboxd
          </span>
        </Link>

        {/* Center Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-[#9ab] hover:text-white transition-colors focus:outline-none">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#456]">
                <User className="h-3.5 w-3.5 text-[#9ab]" />
              </div>
              <span className="font-medium">FILMFAN_01</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 border-[#456] bg-[#2c3440]"
            >
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Home
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Films
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Diary
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Reviews
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Watchlist
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Likes
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Tags
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Network
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#456]" />
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#9ab] hover:bg-[#456] hover:text-white focus:bg-[#456] focus:text-white">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 pl-4">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-wider text-white hover:text-[#40bcf4] transition-colors"
            >
              Films
            </Link>
          </nav>
        </div>

        {/* Right side: Search + Log Button */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs uppercase tracking-wide">
              Find a film
            </span>
            <Input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[200px] rounded-sm border-none bg-[#2c3440] pl-[90px] pr-3 text-sm text-white placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#40bcf4] focus-visible:ring-offset-0"
            />
          </div>
          
          {/* Mobile search */}
          <button className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:text-white transition-colors md:hidden">
            <Search className="h-4 w-4" />
          </button>

          {/* Log Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onLogClick();
                }}
                className="flex items-center gap-1 rounded bg-[#00c030] px-3 py-1.5 font-semibold text-white hover:bg-[#00e054] transition-colors"
              >
                <Plus className="h-4 w-4" />
                LOG
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
