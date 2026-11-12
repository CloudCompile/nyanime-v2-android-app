import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Heart,
  Bookmark,
  Download,
  Play,
  Trash2,
  FolderOpen,
  Film,
  Sparkles,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import Header from '../components/Header';
import AnimeCard from '../components/AnimeCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  getWatchHistory,
  getWatchlist,
  getFavorites,
  getDownloadedEpisodes,
  removeFromWatchHistory,
  clearWatchHistory,
  removeFromWatchlist,
  toggleFavorite,
  removeDownloadedEpisode,
  clearDownloadedEpisodes,
  subscribeAppData,
  WatchHistoryItem,
  WatchlistItem,
  FavoriteItem,
  DownloadedEpisodeItem,
} from '@/services/appDataService';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const Library: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab') || 'history';
  const [activeTab, setActiveTab] = useState(tabParam);

  const [history, setHistory] = useState<WatchHistoryItem[]>(() => getWatchHistory());
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => getWatchlist());
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => getFavorites());
  const [downloads, setDownloads] = useState<DownloadedEpisodeItem[]>(() => getDownloadedEpisodes());

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    const update = () => {
      setHistory(getWatchHistory());
      setWatchlist(getWatchlist());
      setFavorites(getFavorites());
      setDownloads(getDownloadedEpisodes());
    };
    update();
    return subscribeAppData(update);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      clearWatchHistory();
      toast({ title: 'History cleared', description: 'All watch progress has been removed.' });
    }
  };

  const handleClearDownloads = () => {
    if (window.confirm('Are you sure you want to clear your downloaded episodes list?')) {
      clearDownloadedEpisodes();
      toast({ title: 'Downloads cleared', description: 'All downloaded records removed.' });
    }
  };

  const totalDownloadBytes = downloads.reduce((acc, d) => acc + (d.bytes || 120 * 1024 * 1024), 0);

  return (
    <div className="min-h-screen bg-anime-darker pb-20">
      <Header />

      <main className="container mx-auto px-4 pt-24 md:px-6">
        {/* Library Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-anime-purple" />
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                My Library
              </h1>
            </div>
            <p className="mt-1 text-sm text-white/60">
              Offline-ready local app data: no account required. Stored securely on your device.
            </p>
          </div>

          {/* Quick Storage Stats */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white/80">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span>{history.length} in history</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white/80">
              <Bookmark className="h-3.5 w-3.5 text-blue-400" />
              <span>{watchlist.length} watchlist</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white/80">
              <Heart className="h-3.5 w-3.5 text-red-400" />
              <span>{favorites.length} favorites</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white/80">
              <Download className="h-3.5 w-3.5 text-green-400" />
              <span>{downloads.length} downloaded</span>
            </div>
          </div>
        </div>

        {/* Library Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-4 max-w-md bg-white/5">
            <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Bookmark className="h-3.5 w-3.5" />
              <span>Watchlist</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Heart className="h-3.5 w-3.5" />
              <span>Favorites</span>
            </TabsTrigger>
            <TabsTrigger value="downloads" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Download className="h-3.5 w-3.5" />
              <span>Downloads</span>
            </TabsTrigger>
          </TabsList>

          {/* ================= HISTORY TAB ================= */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Watch History ({history.length})
              </h2>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Clear all history
                </Button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Clock className="mb-3 h-12 w-12 text-white/20" />
                <h3 className="text-base font-medium text-white">No watch history yet</h3>
                <p className="mt-1 text-sm text-white/60">
                  Episodes you start streaming will appear here with your playback progress.
                </p>
                <Button className="mt-4" onClick={() => navigate('/anime')}>
                  Discover Anime
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {history.map((item) => (
                  <div
                    key={`${item.animeId}-${item.episodeNumber}`}
                    className="glass-card group relative cursor-pointer overflow-hidden rounded-xl transition-all hover:scale-[1.02]"
                    onClick={() =>
                      navigate(
                        `/anime/${item.animeId}/watch?ep=${item.episodeNumber}&t=${item.timestamp}`
                      )
                    }
                  >
                    <div className="relative h-36 w-full bg-black/40">
                      <img
                        src={item.poster || '/placeholder.svg'}
                        alt={item.animeTitle}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-anime-purple text-white shadow-lg">
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchHistory(item.animeId, item.episodeNumber);
                        }}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 hover:bg-red-500 hover:text-white"
                        title="Remove from history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="absolute bottom-2 left-3 right-3">
                        <h4 className="line-clamp-1 text-sm font-semibold text-white drop-shadow">
                          {item.animeTitle}
                        </h4>
                        <p className="text-xs text-purple-300">
                          Episode {item.episodeNumber}
                        </p>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/60">
                        <span>{item.progress}% watched</span>
                        <span>{formatDuration(item.timestamp)}</span>
                      </div>
                      <Progress value={item.progress} className="h-1 bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ================= WATCHLIST TAB ================= */}
          <TabsContent value="watchlist" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                My Watchlist ({watchlist.length})
              </h2>
            </div>

            {watchlist.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Bookmark className="mb-3 h-12 w-12 text-white/20" />
                <h3 className="text-base font-medium text-white">Your watchlist is empty</h3>
                <p className="mt-1 text-sm text-white/60">
                  Save shows you want to watch later by tapping "Add to Watchlist" on any anime.
                </p>
                <Button className="mt-4" onClick={() => navigate('/anime')}>
                  Browse Anime
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {watchlist.map((item) => (
                  <div key={item.animeId} className="relative group">
                    <AnimeCard
                      id={item.animeId}
                      title={item.title}
                      image={item.image}
                      category={item.category || 'Anime'}
                      rating={item.rating || 'N/A'}
                      year={item.year || ''}
                      episodes={item.episodes}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(item.animeId);
                        toast({ title: 'Removed', description: `${item.title} removed from watchlist.` });
                      }}
                      className="absolute top-2 left-2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/70 hover:bg-red-500 hover:text-white transition-colors"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ================= FAVORITES TAB ================= */}
          <TabsContent value="favorites" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Favorites ({favorites.length})
              </h2>
            </div>

            {favorites.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Heart className="mb-3 h-12 w-12 text-white/20" />
                <h3 className="text-base font-medium text-white">No favorites yet</h3>
                <p className="mt-1 text-sm text-white/60">
                  Tap the heart icon on any anime card to add it to your favorites.
                </p>
                <Button className="mt-4" onClick={() => navigate('/anime')}>
                  Explore Anime
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {favorites.map((item) => (
                  <AnimeCard
                    key={item.animeId}
                    id={item.animeId}
                    title={item.title}
                    image={item.image}
                    category={item.category || 'Anime'}
                    rating={item.rating || 'N/A'}
                    year={item.year || ''}
                    episodes={item.episodes}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ================= DOWNLOADED EPISODES TAB ================= */}
          <TabsContent value="downloads" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Downloaded Episodes ({downloads.length})
                </h2>
                <p className="text-xs text-white/50">
                  Stored on this device • Total: ~{formatBytes(totalDownloadBytes)}
                </p>
              </div>

              {downloads.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearDownloads}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            {downloads.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <Download className="mb-3 h-12 w-12 text-white/20" />
                <h3 className="text-base font-medium text-white">No downloaded episodes</h3>
                <p className="mt-1 max-w-sm text-sm text-white/60">
                  Download episodes to watch offline anytime. Tap the "Download" button on any episode or anime page.
                </p>
                <Button className="mt-4" onClick={() => navigate('/anime')}>
                  Browse Anime to Download
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {downloads.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl p-3 sm:p-4 transition-all hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-black/40">
                        <img
                          src={item.poster || '/placeholder.svg'}
                          alt={item.animeTitle}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-1 text-sm font-semibold text-white">
                          {item.animeTitle}
                        </h4>
                        <p className="text-xs font-medium text-purple-300">
                          Episode {item.episodeNumber} • {item.episodeTitle}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                          <span className="rounded bg-white/10 px-1.5 py-0.5 uppercase">
                            {item.format}
                          </span>
                          <span>{item.quality}</span>
                          <span>{formatBytes(item.bytes || 110 * 1024 * 1024)}</span>
                          <span className="text-green-400 font-medium">Ready for offline</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(`/anime/${item.animeId}/watch?ep=${item.episodeNumber}`)
                        }
                        className="bg-anime-purple hover:bg-anime-purple/90 text-white"
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                        Play Episode
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeDownloadedEpisode(item.id);
                          toast({ title: 'Removed', description: 'Episode removed from downloads.' });
                        }}
                        className="text-white/60 hover:bg-red-500/10 hover:text-red-400"
                        title="Delete download"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Library;
