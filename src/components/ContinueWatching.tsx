import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, X, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  getContinueWatching,
  removeFromWatchHistory,
  subscribeAppData,
  WatchHistoryItem,
} from '@/services/appDataService';
import { toast } from '@/hooks/use-toast';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const ContinueWatching: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchHistoryItem[]>(() => getContinueWatching(8));

  useEffect(() => {
    const update = () => {
      setItems(getContinueWatching(8));
    };
    update();
    const unsubscribe = subscribeAppData(update);
    return unsubscribe;
  }, []);

  const handleRemove = (e: React.MouseEvent, item: WatchHistoryItem) => {
    e.stopPropagation();
    removeFromWatchHistory(item.animeId, item.episodeNumber);
    toast({
      title: 'Removed from history',
      description: `${item.animeTitle} (Ep ${item.episodeNumber}) removed.`,
    });
  };

  const handleResume = (item: WatchHistoryItem) => {
    navigate(`/anime/${item.animeId}/watch?ep=${item.episodeNumber}&t=${item.timestamp}`);
  };

  if (items.length === 0) return null;

  return (
    <section className="py-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3 h-6 w-2 rounded-full bg-anime-purple" />
            <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Continue Watching
            </h2>
          </div>
          <button
            onClick={() => navigate('/library?tab=history')}
            className="flex items-center text-sm font-medium text-anime-purple hover:underline"
          >
            All History <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={`${item.animeId}-${item.episodeNumber}`}
              className="glass-card group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              onClick={() => handleResume(item)}
            >
              {/* Thumbnail Container */}
              <div className="relative h-36 w-full overflow-hidden bg-black/40">
                <img
                  src={item.poster || '/placeholder.svg'}
                  alt={item.animeTitle}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Top overlay buttons */}
                <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => handleRemove(e, item)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/80 transition-colors hover:bg-red-600 hover:text-white"
                    title="Remove from history"
                    aria-label="Remove from history"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Play button hover badge */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-anime-purple text-white shadow-lg">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom title & ep info on thumbnail */}
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="line-clamp-1 text-sm font-semibold text-white drop-shadow">
                    {item.animeTitle}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span className="font-medium text-purple-300">
                      Episode {item.episodeNumber}
                    </span>
                    <span className="flex items-center text-[11px] text-white/60">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatRelativeTime(item.lastWatched)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress details */}
              <div className="p-3 pt-2.5">
                <div className="mb-1.5 flex items-center justify-between text-xs text-white/70">
                  <span>{item.progress}% completed</span>
                  <span className="font-mono text-[11px] text-white/50">
                    {formatTime(item.timestamp)} / {formatTime(item.duration)}
                  </span>
                </div>
                <Progress value={item.progress} className="h-1.5 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContinueWatching;
