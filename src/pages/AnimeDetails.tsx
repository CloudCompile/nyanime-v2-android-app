import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Heart,
  List,
  Play,
  PlusCircle,
  Star,
  Check,
} from 'lucide-react';
import Header from '../components/Header';
import CategoryRow from '../components/CategoryRow';
import DownloadPanel from '../components/DownloadPanel';
import { useAnimeDetail, useSimilarAnime, type AnimeData } from '../hooks/useAnimeData';
import { useAnimeCharacters, useAnimeReviews } from '../hooks/useAnimeDetails';
import { getEpisodes, type EpisodeSummary } from '../services/animeApiService';
import { useDownloads } from '../hooks/useDownloads';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  isInWatchlist as checkInWatchlist,
  toggleWatchlist,
  isFavorite as checkIsFavorite,
  toggleFavorite,
  subscribeAppData,
  recordDownload,
  getWatchHistory,
} from '@/services/appDataService';

const AnimeDetails = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: anime, isLoading } = useAnimeDetail(id);
  const { data: similar = [] } = useSimilarAnime(id);
  const { data: characters = [] } = useAnimeCharacters(anime?.title ?? '');
  const { data: reviews = [] } = useAnimeReviews(id);
  const { enqueue } = useDownloads();

  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [inWatchlist, setInWatchlist] = useState(() => checkInWatchlist(id));
  const [inFavorite, setInFavorite] = useState(() => checkIsFavorite(id));
  const [watchedMap, setWatchedMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getEpisodes(id)
      .then((list) => {
        if (!cancelled) setEpisodes(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const update = () => {
      setInWatchlist(checkInWatchlist(id));
      setInFavorite(checkIsFavorite(id));
      const history = getWatchHistory();
      const map: Record<number, number> = {};
      history
        .filter((h) => String(h.animeId) === String(id))
        .forEach((h) => {
          map[h.episodeNumber] = h.progress;
        });
      setWatchedMap(map);
    };
    update();
    return subscribeAppData(update);
  }, [id]);

  const handleToggleWatchlist = () => {
    if (!anime) return;
    const next = toggleWatchlist({
      animeId: id,
      title: anime.title,
      image: anime.poster || '',
      category: anime.genres?.[0] || 'Anime',
      rating: anime.score || 'N/A',
      episodes: anime.totalEpisodes || episodes.length,
      year: anime.premiered || anime.aired || '',
    });
    setInWatchlist(next);
    toast({
      title: next ? 'Added to Watchlist' : 'Removed from Watchlist',
      description: `${anime.title} has been ${next ? 'added to' : 'removed from'} your watchlist.`,
    });
  };

  const handleToggleFavorite = () => {
    if (!anime) return;
    const next = toggleFavorite({
      animeId: id,
      title: anime.title,
      image: anime.poster || '',
      category: anime.genres?.[0] || 'Anime',
      rating: anime.score || 'N/A',
      episodes: anime.totalEpisodes || episodes.length,
      year: anime.premiered || anime.aired || '',
    });
    setInFavorite(next);
    toast({
      title: next ? 'Added to Favorites' : 'Removed from Favorites',
      description: `${anime.title} has been ${next ? 'added to' : 'removed from'} your favorites.`,
    });
  };

  const downloadAll = () => {
    if (!anime || episodes.length === 0) return;
    const added = enqueue(anime.title, episodes);
    episodes.forEach((ep) => {
      recordDownload({
        animeId: id,
        animeTitle: anime.title,
        poster: anime.poster,
        episodeNumber: ep.number,
        episodeKey: ep.key,
        episodeTitle: ep.title,
        format: 'mp4',
        quality: '1080p',
        status: 'completed',
      });
    });
    toast({
      title: added > 0 ? `Queued ${added} episodes` : 'Episodes queued',
      description: 'You can monitor and manage downloads in your Library.',
    });
  };

  const asCardList = (items: AnimeData[]) =>
    items.map((item) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      category: item.category,
      rating: item.rating,
      year: item.year,
      episodes: item.episodes,
    }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-anime-darker">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center text-white/70">
          Loading anime…
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-anime-darker">
        <Header />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-white/80">This anime could not be found in the catalogue.</p>
          <Button onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-anime-darker">
      <Header />

      <section className="relative h-[45vh] w-full overflow-hidden md:h-[55vh]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(13,13,21,0.4), rgba(13,13,21,0.95)), url('${anime.poster ?? ''}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto flex gap-6 px-4 pb-8 md:px-6">
            <img
              src={anime.poster}
              alt={anime.title}
              className="hidden w-40 rounded-lg shadow-lg md:block"
            />
            <div className="max-w-3xl">
              <Button variant="ghost" className="mb-3 text-white/80 hover:text-white" asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">{anime.title}</h1>
              {anime.japaneseTitle && (
                <p className="mb-3 text-sm text-white/60">{anime.japaneseTitle}</p>
              )}
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
                {anime.score && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" fill="currentColor" />
                    {anime.score}
                  </span>
                )}
                {anime.premiered && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {anime.premiered}
                  </span>
                )}
                {anime.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {anime.duration}
                  </span>
                )}
                {anime.totalEpisodes && (
                  <span className="flex items-center gap-1">
                    <List className="h-4 w-4" />
                    {anime.totalEpisodes} episodes
                  </span>
                )}
                {anime.status && <span>{anime.status}</span>}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate(`/anime/${id}/watch`)}>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Watch now
                </Button>
                <Button
                  variant={inWatchlist ? "secondary" : "outline"}
                  onClick={handleToggleWatchlist}
                  className={inWatchlist ? "border-anime-purple text-purple-300" : ""}
                >
                  {inWatchlist ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-400" />
                      In Watchlist
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add to Watchlist
                    </>
                  )}
                </Button>
                <Button
                  variant={inFavorite ? "secondary" : "outline"}
                  onClick={handleToggleFavorite}
                  className={inFavorite ? "border-red-500/50 text-red-400" : ""}
                >
                  <Heart className={`mr-2 h-4 w-4 ${inFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  {inFavorite ? "Favorited" : "Favorite"}
                </Button>
                <Button variant="secondary" onClick={downloadAll} disabled={episodes.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Download all
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="episodes">
                  Episodes ({episodes.length || anime.totalEpisodes || 0})
                </TabsTrigger>
                <TabsTrigger value="characters">Characters</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                {anime.description && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
                    {anime.description}
                  </p>
                )}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {anime.genres && anime.genres.length > 0 && (
                    <div>
                      <dt className="text-white/50">Genres</dt>
                      <dd className="text-white/90">{anime.genres.join(', ')}</dd>
                    </div>
                  )}
                  {anime.studios && anime.studios.length > 0 && (
                    <div>
                      <dt className="text-white/50">Studio</dt>
                      <dd className="text-white/90">{anime.studios.join(', ')}</dd>
                    </div>
                  )}
                  {anime.aired && (
                    <div>
                      <dt className="text-white/50">Aired</dt>
                      <dd className="text-white/90">{anime.aired}</dd>
                    </div>
                  )}
                  {anime.type && (
                    <div>
                      <dt className="text-white/50">Format</dt>
                      <dd className="text-white/90">{anime.type}</dd>
                    </div>
                  )}
                </dl>
              </TabsContent>

              <TabsContent value="episodes" className="mt-6">
                {episodes.length === 0 ? (
                  <p className="text-sm text-white/60">No episodes listed yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {episodes.map((episode) => {
                      const prog = watchedMap[episode.number];
                      const isWatched = prog !== undefined && prog >= 90;
                      return (
                        <button
                          key={episode.key}
                          onClick={() => navigate(`/anime/${id}/watch?ep=${episode.number}`)}
                          className={`relative overflow-hidden rounded-lg border p-3 text-left transition-colors ${
                            isWatched
                              ? 'border-purple-500/50 bg-anime-purple/15 text-white'
                              : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">Ep {episode.number}</span>
                            {isWatched && <Check className="h-3.5 w-3.5 text-green-400" />}
                            {prog !== undefined && prog > 0 && !isWatched && (
                              <span className="text-[10px] text-purple-300 font-medium">{prog}%</span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-white/70">{episode.title}</p>
                          {prog !== undefined && prog > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                              <div
                                className="h-full bg-anime-purple"
                                style={{ width: `${Math.min(100, prog)}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="characters" className="mt-6">
                {characters.length === 0 ? (
                  <p className="text-sm text-white/60">No character information available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {characters.map((char) => (
                      <div
                        key={char.id}
                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-2"
                      >
                        <Avatar>
                          <AvatarImage src={char.image} alt={char.name} />
                          <AvatarFallback>{char.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white">{char.name}</p>
                          <p className="truncate text-[11px] text-white/50">{char.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {reviews.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-xl font-bold text-white">Reviews</h2>
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((review) => (
                    <article
                      key={review.id}
                      className="rounded-lg border border-white/5 bg-white/5 p-4 text-sm text-white/80"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-white">{review.author}</span>
                        {review.score && (
                          <span className="flex items-center text-xs text-yellow-400">
                            <Star className="mr-1 h-3 w-3" fill="currentColor" />
                            {review.score}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-4 leading-relaxed text-white/70">{review.content}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <DownloadPanel />
            {similar.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
                  Recommended Anime
                </h3>
                <div className="space-y-2">
                  {similar.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      to={`/anime/${item.id}`}
                      className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-16 w-12 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-white/50">{item.category}</p>
                        {item.rating && item.rating !== 'N/A' && (
                          <p className="mt-1 flex items-center text-xs text-yellow-400">
                            <Star className="mr-1 h-3 w-3" fill="currentColor" />
                            {item.rating}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {similar.length > 0 && (
          <div className="mt-12">
            <CategoryRow title="More Like This" animeList={asCardList(similar)} />
          </div>
        )}
      </main>
    </div>
  );
};

export default AnimeDetails;
