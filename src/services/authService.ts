/**
 * Unified Local User & Storage Bridge
 * 
 * Replaces remote account requirements with local device storage.
 * All operations operate directly on app data without logins or passwords.
 */

import {
  saveWatchProgress,
  getWatchHistory,
  removeFromWatchHistory as removeLocalHistory,
  addToWatchlist as addLocalWatchlist,
  removeFromWatchlist as removeLocalWatchlist,
  getWatchlist,
  toggleFavorite as toggleLocalFavorite,
  getFavorites,
  WatchHistoryItem,
  WatchlistItem,
  FavoriteItem,
} from './appDataService';

export interface UserData {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  watchlist: Array<{
    animeId: string;
    addedAt: Date;
  }>;
  history: Array<{
    animeId: string;
    episodeId: number;
    progress: number;
    timestamp: number;
    lastWatched: Date;
  }>;
  favorites: Array<{
    animeId: string;
    addedAt: Date;
  }>;
}

const LOCAL_USER_ID = 'local_user';

export const isLoggedIn = (): boolean => true;

export const getCurrentUserData = (): UserData => {
  const history = getWatchHistory();
  const watchlist = getWatchlist();
  const favorites = getFavorites();

  return {
    id: LOCAL_USER_ID,
    username: 'Anime Fan',
    email: 'local@nyanime.app',
    avatar: '',
    createdAt: new Date(),
    watchlist: watchlist.map((item) => ({
      animeId: item.animeId,
      addedAt: new Date(item.addedAt),
    })),
    history: history.map((item) => ({
      animeId: item.animeId,
      episodeId: item.episodeNumber,
      progress: item.progress,
      timestamp: item.timestamp,
      lastWatched: new Date(item.lastWatched),
    })),
    favorites: favorites.map((item) => ({
      animeId: item.animeId,
      addedAt: new Date(item.addedAt),
    })),
  };
};

export const getUserData = async (_userId?: string): Promise<UserData> => {
  return getCurrentUserData();
};

export const registerUser = async (username: string): Promise<UserData> => {
  return getCurrentUserData();
};

export const loginUser = async (): Promise<UserData> => {
  return getCurrentUserData();
};

export const logoutUser = () => {
  // No-op since accounts are disabled
};

export const addToWatchlist = async (
  _userId: string,
  animeId: string,
  meta?: { title?: string; image?: string; category?: string; rating?: string; episodes?: number; year?: string }
): Promise<Array<{ animeId: string; addedAt: Date }>> => {
  addLocalWatchlist({
    animeId,
    title: meta?.title || `Anime ${animeId}`,
    image: meta?.image || '/placeholder.svg',
    category: meta?.category,
    rating: meta?.rating,
    episodes: meta?.episodes,
    year: meta?.year,
  });
  return getWatchlist().map((w) => ({ animeId: w.animeId, addedAt: new Date(w.addedAt) }));
};

export const updateWatchHistory = async (
  _userId: string,
  animeId: string,
  episodeId: number,
  progress: number,
  timestamp: number = 0,
  meta?: { animeTitle?: string; poster?: string; episodeTitle?: string; duration?: number }
): Promise<Array<{ animeId: string; episodeId: number; progress: number; timestamp: number; lastWatched: Date }>> => {
  saveWatchProgress({
    animeId,
    animeTitle: meta?.animeTitle,
    poster: meta?.poster,
    episodeNumber: episodeId,
    episodeTitle: meta?.episodeTitle,
    progress,
    timestamp,
    duration: meta?.duration || 1440,
  });

  return getWatchHistory().map((item) => ({
    animeId: item.animeId,
    episodeId: item.episodeNumber,
    progress: item.progress,
    timestamp: item.timestamp,
    lastWatched: new Date(item.lastWatched),
  }));
};

export const removeFromWatchHistory = async (
  _userId: string,
  animeId: string,
  episodeId?: number
): Promise<Array<{ animeId: string; episodeId: number; progress: number; timestamp: number; lastWatched: Date }>> => {
  removeLocalHistory(animeId, episodeId);
  return getWatchHistory().map((item) => ({
    animeId: item.animeId,
    episodeId: item.episodeNumber,
    progress: item.progress,
    timestamp: item.timestamp,
    lastWatched: new Date(item.lastWatched),
  }));
};

export const toggleFavorite = async (
  _userId: string,
  animeId: string,
  meta?: { title?: string; image?: string; category?: string; rating?: string; episodes?: number; year?: string }
): Promise<Array<{ animeId: string; addedAt: Date }>> => {
  toggleLocalFavorite({
    animeId,
    title: meta?.title || `Anime ${animeId}`,
    image: meta?.image || '/placeholder.svg',
    category: meta?.category,
    rating: meta?.rating,
    episodes: meta?.episodes,
    year: meta?.year,
  });
  return getFavorites().map((f) => ({ animeId: f.animeId, addedAt: new Date(f.addedAt) }));
};

export const updateUserProfile = async (_userId: string, updateData: { username?: string; avatar?: string }): Promise<UserData> => {
  return getCurrentUserData();
};

export const updateUserPassword = async (): Promise<boolean> => {
  return true;
};

export const initializeAuthService = () => {
  // Accounts removed: using local app data
};
