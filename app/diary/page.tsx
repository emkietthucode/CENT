"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { DiarySection } from "@/components/diary-section";
import { getDiaryEntries } from "@/lib/supabase";
import { LogModal } from "@/components/log-modal";
import type { DiaryEntry } from "@/types";

export default function DiaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDiary = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await getDiaryEntries();
      setDiaryEntries(entries);
    } catch (err) {
      console.error("Failed to load diary entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiary();
  }, [loadDiary]);

  const handleEdit = (entry: DiaryEntry) => {
    setEditEntry(entry);
    setLogModalOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setLogModalOpen(open);
    if (!open) {
      setEditEntry(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          // Khi gõ tìm kiếm từ trang Nhật ký, chuyển hướng về trang chủ kèm query parameter
          window.location.href = `/?search=${encodeURIComponent(q)}`;
        }}
        onLogClick={() => setLogModalOpen(true)}
      />

      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="mb-6 flex items-baseline justify-between border-b border-border pb-4">
          <h1 className="text-xl font-black text-white tracking-widest uppercase">DIARY</h1>
          <span className="text-xs text-muted-foreground font-semibold">
            {diaryEntries.length} {diaryEntries.length === 1 ? "ENTRY" : "ENTRIES"} LOGGED
          </span>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <span className="animate-pulse text-sm text-[#9ab]">Loading movie diary...</span>
          </div>
        ) : diaryEntries.length > 0 ? (
          <div className="bg-[#1c242c]/20 p-6 rounded-lg border border-border/40">
            <DiarySection
              entries={diaryEntries}
              onDelete={loadDiary}
              onEdit={handleEdit}
              onRefresh={loadDiary}
            />
          </div>
        ) : (
          <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center bg-card/10">
            <p className="text-[#9ab] mb-4">You haven't logged any movies in your personal diary yet.</p>
            <button
              onClick={() => setLogModalOpen(true)}
              className="rounded bg-[#00c030] px-6 py-2.5 font-semibold text-white hover:bg-[#00e054] active:scale-95 transition-all"
            >
              Log your first movie
            </button>
          </div>
        )}
      </main>

      <LogModal
        open={logModalOpen}
        onOpenChange={handleOpenChange}
        onSaved={loadDiary}
        editEntry={editEntry}
      />
    </div>
  );
}
