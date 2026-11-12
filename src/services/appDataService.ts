/**
 * App Data Service
 * 
 * Provides purely local, account-free persistent storage for:
 * - Watch History & Continue Watching
 * - Watchlist
 * - Favorites
 * - Downloaded Episodes
 * - App Preferences & Playback Settings
 * 
 * Backed by browser localStorage (and offline-ready app storage)
 * with atomic writes and instant event-driven updates.
 */

export interface WatchHistoryItem {
  animeId: string;
  animeTitle: string;
  poster: string;
  episodeNumber: number;
  episodeKey: string;
  episodeTitle: string;
  progress: number; // 0 - 100 percentage
  timestamp: number; // position in seconds
  duration: number; // total length in seconds
  lastWatched: string; // ISO date string
}

export interface WatchlistItem {
  animeId: string;
  title: string;
  image: string;
  category?: string;
  rating?: string;
  episodes?: number;
  year?: string;
  addedAt: string;
}

export interface FavoriteItem {
  animeId: string;
  title: string;
  image: string;
  category?: string;
  rating?: string;
  episodes?: number;
  year?: string;
  addedAt: string;
}

export interface DownloadedEpisodeItem {
  id: string; // unique download id, e.g. "animeId-epNumber"
  animeId: string;
  animeTitle: string;
  poster: string;
  episodeNumber: number;
  episodeKey: string;
  episodeTitle: string;
  format: 'mp4' | 'ts';
  quality: string;
  bytes: number;
  downloadedAt: string;
  status: 'completed' | 'downloading' | 'failed';
  localUrl?: string; // object URL or file reference if cached
}

export interface AppPreferences {
  autoPlayNext: boolean;
  autoSkipIntro: boolean;
  preferredServer: string;
  defaultTrack: 'sub' | 'dub';
  preferredQuality: string;
}

interface StoredAppData {
  version: number;
  history: WatchHistoryItem[];
  watchlist: WatchlistItem[];
  favorites: FavoriteItem[];
  downloads: DownloadedEpisodeItem[];
  preferences: AppPreferences;
}

const STORAGE_KEY = 'nyanime_app_data_v1';
const UPDATE_EVENT = 'nyanime:appdata_updated';

const DEFAULT_PREFERENCES: AppPreferences = {
  autoPlayNext: true,
  autoSkipIntro: false,
  preferredServer: 'Vidplay',
  defaultTrack: 'sub',
  preferredQuality: '1080p',
};

function readStorage(): StoredAppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        version: 1,
        history: [],
        watchlist: [],
        favorites: [],
        downloads: [],
        preferences: { ...DEFAULT_PREFERENCES },
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredAppData>;
    return {
      version: parsed.version || 1,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
      preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
    };
  } catch (err) {
    console.error('Failed to parse app data from localStorage', err);
    return {
      version: 1,
      history: [],
      watchlist: [],
      favorites: [],
      downloads: [],
      preferences: { ...DEFAULT_PREFERENCES },
    };
  }
}

function writeStorage(data: StoredAppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: data }));
  } catch (err) {
    console.error('Failed to save app data to localStorage', err);
  }
}

// Subscribe to app data updates
export function subscribeAppData(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(UPDATE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

/* ==========================================================================
   WATCH HISTORY & CONTINUE WATCHING
   ========================================================================== */

export function saveWatchProgress(item: {
  animeId: string;
  animeTitle?: string;
  poster?: string;
  episodeNumber: number;
  episodeKey?: string;
  episodeTitle?: string;
  progress: number;
  timestamp: number;
  duration: number;
}): void {
  if (!item.animeId || !item.episodeNumber) return;
  // Ignore opening 3 seconds if not already progressed
  if (item.timestamp < 3 && item.progress < 2) return;

  const data = readStorage();
  const existingIndex = data.history.findIndex(
    (h) => String(h.animeId) === String(item.animeId) && h.episodeNumber === item.episodeNumber
  );

  const prev = existingIndex >= 0 ? data.history[existingIndex] : null;

  const updatedItem: WatchHistoryItem = {
    animeId: String(item.animeId),
    animeTitle: item.animeTitle || prev?.animeTitle || `Anime ${item.animeId}`,
    poster: item.poster || prev?.poster || '/placeholder.svg',
    episodeNumber: item.episodeNumber,
    episodeKey: item.episodeKey || prev?.episodeKey || `${item.animeId}_${item.episodeNumber}`,
    episodeTitle: item.episodeTitle || prev?.episodeTitle || `Episode ${item.episodeNumber}`,
    progress: Math.min(100, Math.max(0, Math.round(item.progress))),
    timestamp: Math.round(item.timestamp),
    duration: Math.round(item.duration),
    lastWatched: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    data.history.splice(existingIndex, 1);
  }
  
  // Also remove older entries of the same anime if we only want 1 continue watching card per series
  const sameSeriesIndex = data.history.findIndex(
    (h) => String(h.animeId) === String(item.animeId)
  );
  if (sameSeriesIndex >= 0) {
    data.history.splice(sameSeriesIndex, 1);
  }

  // Insert most recently watched at the top
  data.history.unshift(updatedItem);

  // Keep up to 60 most recent history entries
  if (data.history.length > 60) {
    data.history = data.history.slice(0, 60);
  }

  writeStorage(data);
}

export function getWatchHistory(): WatchHistoryItem[] {
  return readStorage().history;
}

export function getContinueWatching(limit: number = 8): WatchHistoryItem[] {
  const history = readStorage().history;
  // Filter out episodes that are completely finished (>95% watched) or keep latest if only episode
  return history
    .filter((item) => item.progress < 95 && item.progress > 0)
    .slice(0, limit);
}

export function getEpisodePosition(animeId: string, episodeNumber: number): number {
  const history = readStorage().history;
  const match = history.find(
    (h) => String(h.animeId) === String(animeId) && h.episodeNumber === episodeNumber
  );
  return match ? match.timestamp : 0;
}

export function removeFromWatchHistory(animeId: string, episodeNumber?: number): void {
  const data = readStorage();
  if (episodeNumber !== undefined) {
    data.history = data.history.filter(
      (h) => !(String(h.animeId) === String(animeId) && h.episodeNumber === episodeNumber)
    );
  } else {
    data.history = data.history.filter((h) => String(h.animeId) !== String(animeId));
  }
  writeStorage(data);
}

export function clearWatchHistory(): void {
  const data = readStorage();
  data.history = [];
  writeStorage(data);
}

/* ==========================================================================
   WATCHLIST
   ========================================================================== */

export function addToWatchlist(item: {
  animeId: string;
  title: string;
  image: string;
  category?: string;
  rating?: string;
  episodes?: number;
  year?: string;
}): void {
  const data = readStorage();
  const exists = data.watchlist.some((w) => String(w.animeId) === String(item.animeId));
  if (!exists) {
    data.watchlist.unshift({
      animeId: String(item.animeId),
      title: item.title,
      image: item.image,
      category: item.category,
      rating: item.rating,
      episodes: item.episodes,
      year: item.year,
      addedAt: new Date().toISOString(),
    });
    writeStorage(data);
  }
}

export function removeFromWatchlist(animeId: string): void {
  const data = readStorage();
  data.watchlist = data.watchlist.filter((w) => String(w.animeId) !== String(animeId));
  writeStorage(data);
}

export function isInWatchlist(animeId: string): boolean {
  return readStorage().watchlist.some((w) => String(w.animeId) === String(animeId));
}

export function toggleWatchlist(item: {
  animeId: string;
  title: string;
  image: string;
  category?: string;
  rating?: string;
  episodes?: number;
  year?: string;
}): boolean {
  if (isInWatchlist(item.animeId)) {
    removeFromWatchlist(item.animeId);
    return false;
  } else {
    addToWatchlist(item);
    return true;
  }
}

export function getWatchlist(): WatchlistItem[] {
  return readStorage().watchlist;
}

/* ==========================================================================
   FAVORITES
   ========================================================================== */

export function toggleFavorite(item: {
  animeId: string;
  title: string;
  image: string;
  category?: string;
  rating?: string;
  episodes?: number;
  year?: string;
}): boolean {
  const data = readStorage();
  const index = data.favorites.findIndex((f) => String(f.animeId) === String(item.animeId));
  let isNowFavorite = false;
  if (index >= 0) {
    data.favorites.splice(index, 1);
    isNowFavorite = false;
  } else {
    data.favorites.unshift({
      animeId: String(item.animeId),
      title: item.title,
      image: item.image,
      category: item.category,
      rating: item.rating,
      episodes: item.episodes,
      year: item.year,
      addedAt: new Date().toISOString(),
    });
    isNowFavorite = true;
  }
  writeStorage(data);
  return isNowFavorite;
}

export function isFavorite(animeId: string): boolean {
  return readStorage().favorites.some((f) => String(f.animeId) === String(animeId));
}

export function getFavorites(): FavoriteItem[] {
  return readStorage().favorites;
}

/* ==========================================================================
   DOWNLOADED EPISODES
   ========================================================================== */

export function recordDownload(record: {
  id?: string;
  animeId: string;
  animeTitle: string;
  poster?: string;
  episodeNumber: number;
  episodeKey: string;
  episodeTitle?: string;
  format?: 'mp4' | 'ts';
  quality?: string;
  bytes?: number;
  status?: 'completed' | 'downloading' | 'failed';
  localUrl?: string;
}): DownloadedEpisodeItem {
  const data = readStorage();
  const id = record.id || `${record.animeId}-ep${record.episodeNumber}`;
  
  const existingIndex = data.downloads.findIndex((d) => d.id === id);
  const entry: DownloadedEpisodeItem = {
    id,
    animeId: String(record.animeId),
    animeTitle: record.animeTitle,
    poster: record.poster || '/placeholder.svg',
    episodeNumber: record.episodeNumber,
    episodeKey: record.episodeKey,
    episodeTitle: record.episodeTitle || `Episode ${record.episodeNumber}`,
    format: record.format || 'mp4',
    quality: record.quality || '1080p',
    bytes: record.bytes || 0,
    downloadedAt: new Date().toISOString(),
    status: record.status || 'completed',
    localUrl: record.localUrl,
  };

  if (existingIndex >= 0) {
    data.downloads[existingIndex] = entry;
  } else {
    data.downloads.unshift(entry);
  }

  writeStorage(data);
  return entry;
}

export function getDownloadedEpisodes(): DownloadedEpisodeItem[] {
  return readStorage().downloads;
}

export function removeDownloadedEpisode(id: string): void {
  const data = readStorage();
  data.downloads = data.downloads.filter((d) => d.id !== id);
  writeStorage(data);
}

export function clearDownloadedEpisodes(): void {
  const data = readStorage();
  data.downloads = [];
  writeStorage(data);
}

/* ==========================================================================
   APP PREFERENCES & DATA MANAGEMENT
   ========================================================================== */

export function getPreferences(): AppPreferences {
  return readStorage().preferences;
}

export function updatePreferences(patch: Partial<AppPreferences>): AppPreferences {
  const data = readStorage();
  data.preferences = { ...data.preferences, ...patch };
  writeStorage(data);
  return data.preferences;
}

export function clearAllAppData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  localStorage.removeItem('anime_streaming_current_user');
  localStorage.removeItem('anime_streaming_users');
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function exportAppDataJson(): string {
  return JSON.stringify(readStorage(), null, 2);
}

export function importAppDataJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString) as StoredAppData;
    if (parsed && typeof parsed === 'object') {
      writeStorage({
        version: 1,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
        preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
      });
      return true;
    }
  } catch (err) {
    console.error('Import failed', err);
  }
  return false;
}
