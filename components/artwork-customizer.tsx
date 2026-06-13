"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Check, Loader2, Image as ImageIcon, Sparkles, RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";

interface ArtworkCustomizerProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  defaultPosterPath: string | null;
  defaultBackdropPath: string | null;
  currentPosterPath: string | null;
  currentBackdropPath: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TMDBImageItem {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
  vote_count: number;
}

export function ArtworkCustomizer({
  tmdbId,
  mediaType,
  defaultPosterPath,
  defaultBackdropPath,
  currentPosterPath,
  currentBackdropPath,
  isOpen,
  onClose,
}: ArtworkCustomizerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posters, setPosters] = useState<TMDBImageItem[]>([]);
  const [backdrops, setBackdrops] = useState<TMDBImageItem[]>([]);

  // The active custom paths (null if using default TMDB ones)
  const [selectedPoster, setSelectedPoster] = useState<string | null>(currentPosterPath);
  const [selectedBackdrop, setSelectedBackdrop] = useState<string | null>(currentBackdropPath);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchImages() {
      setLoading(true);
      try {
        const res = await fetch(`/api/media/${mediaType}/${tmdbId}/images`);
        if (!res.ok) throw new Error("Failed to fetch images");
        const data = await res.json();
        
        // Sort images by popularity/votes
        const sortedPosters = (data.posters || []).sort(
          (a: any, b: any) => (b.vote_average * b.vote_count) - (a.vote_average * a.vote_count)
        );
        const sortedBackdrops = (data.backdrops || []).sort(
          (a: any, b: any) => (b.vote_average * b.vote_count) - (a.vote_average * a.vote_count)
        );

        setPosters(sortedPosters);
        setBackdrops(sortedBackdrops);
      } catch (err) {
        console.error("Error fetching TMDB images:", err);
        toast.error("Failed to load images from TMDB");
      } finally {
        setLoading(false);
      }
    }

    // Initialize states with current values
    setSelectedPoster(currentPosterPath);
    setSelectedBackdrop(currentBackdropPath);
    fetchImages();
  }, [isOpen, tmdbId, mediaType, currentPosterPath, currentBackdropPath]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/media/${mediaType}/${tmdbId}/customize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_poster_path: selectedPoster,
          custom_backdrop_path: selectedBackdrop,
        }),
      });

      if (!res.ok) throw new Error("Failed to save customization");

      toast.success("Artwork updated successfully!");
      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error saving customization:", err);
      toast.error("Failed to save customization");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedPoster(null);
    setSelectedBackdrop(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[850px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden bg-[#1c2228] border border-border/60 text-white rounded-lg shadow-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 bg-[#14181c]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#00e054]" />
            <DialogTitle className="text-lg font-black tracking-tight text-white uppercase">
              Customize Artwork
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#9ab] hover:bg-secondary hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Tabs */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#00e054]" />
            <p className="text-sm text-muted-foreground animate-pulse">Fetching artwork from TMDB...</p>
          </div>
        ) : (
          <Tabs defaultValue="posters" className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="bg-[#161b20] border-b border-border/30 px-6 py-2">
              <TabsList className="bg-[#1c2228] border border-border/40">
                <TabsTrigger value="posters" className="text-xs uppercase tracking-wider font-bold">
                  Posters ({posters.length})
                </TabsTrigger>
                <TabsTrigger value="backdrops" className="text-xs uppercase tracking-wider font-bold">
                  Backdrops ({backdrops.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {/* Posters Tab */}
              <TabsContent value="posters" className="m-0 h-full">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {/* Default Poster option */}
                  <div
                    onClick={() => setSelectedPoster(null)}
                    className={`relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 group flex flex-col items-center justify-center bg-[#14181c] ${
                      selectedPoster === null
                        ? "border-[#00e054] shadow-lg shadow-[#00e054]/10"
                        : "border-border/40 hover:border-white"
                    }`}
                  >
                    {defaultPosterPath ? (
                      <Image
                        src={getPosterUrl(defaultPosterPath, "w185")}
                        alt="Default TMDB Poster"
                        fill
                        sizes="135px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-xs font-black uppercase text-white tracking-widest">Default Poster</span>
                    </div>
                    {selectedPoster === null && (
                      <div className="absolute top-2 right-2 bg-[#00e054] text-[#14181c] rounded-full p-1 shadow-md">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/85 py-1 text-center text-[9px] font-black uppercase tracking-wider border-t border-border/20 text-[#00e054]">
                      TMDB Default
                    </div>
                  </div>

                  {/* Other Posters */}
                  {posters.map((img) => {
                    const isSelected = selectedPoster === img.file_path;
                    return (
                      <div
                        key={img.file_path}
                        onClick={() => setSelectedPoster(img.file_path)}
                        className={`relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 group ${
                          isSelected
                            ? "border-[#00e054] shadow-lg shadow-[#00e054]/10"
                            : "border-border/40 hover:border-white"
                        }`}
                      >
                        <Image
                          src={getPosterUrl(img.file_path, "w185")}
                          alt="Alternative Poster"
                          fill
                          sizes="135px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#00e054] text-[#14181c] rounded-full p-1 shadow-md">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Backdrops Tab */}
              <TabsContent value="backdrops" className="m-0 h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Default Backdrop option */}
                  <div
                    onClick={() => setSelectedBackdrop(null)}
                    className={`relative aspect-[16/9] rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 group flex flex-col items-center justify-center bg-[#14181c] ${
                      selectedBackdrop === null
                        ? "border-[#00e054] shadow-lg shadow-[#00e054]/10"
                        : "border-border/40 hover:border-white"
                    }`}
                  >
                    {defaultBackdropPath ? (
                      <Image
                        src={getBackdropUrl(defaultBackdropPath, "w780")}
                        alt="Default TMDB Backdrop"
                        fill
                        sizes="240px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-xs font-black uppercase text-white tracking-widest">Default Backdrop</span>
                    </div>
                    {selectedBackdrop === null && (
                      <div className="absolute top-2 right-2 bg-[#00e054] text-[#14181c] rounded-full p-1 shadow-md">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/85 py-1 text-center text-[9px] font-black uppercase tracking-wider border-t border-border/20 text-[#00e054]">
                      TMDB Default
                    </div>
                  </div>

                  {/* Other Backdrops */}
                  {backdrops.map((img) => {
                    const isSelected = selectedBackdrop === img.file_path;
                    return (
                      <div
                        key={img.file_path}
                        onClick={() => setSelectedBackdrop(img.file_path)}
                        className={`relative aspect-[16/9] rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200 group ${
                          isSelected
                            ? "border-[#00e054] shadow-lg shadow-[#00e054]/10"
                            : "border-border/40 hover:border-white"
                        }`}
                      >
                        <Image
                          src={getBackdropUrl(img.file_path, "w780")}
                          alt="Alternative Backdrop"
                          fill
                          sizes="240px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#00e054] text-[#14181c] rounded-full p-1 shadow-md">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/40 px-6 py-4 bg-[#14181c]">
          <button
            onClick={handleReset}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border/60 hover:bg-[#2c3440] hover:text-white text-muted-foreground disabled:opacity-50 transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset to Default
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-transparent hover:bg-secondary text-muted-foreground hover:text-white disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-[#00e054] text-[#14181c] hover:bg-[#00c030] disabled:opacity-50 shadow-md shadow-[#00e054]/10 transition-colors"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
