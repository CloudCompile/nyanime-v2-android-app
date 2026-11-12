import React, { useEffect, useState } from 'react';
import { Play, Star, Calendar, Clock, List, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { isFavorite as checkIsFavorite, toggleFavorite, subscribeAppData, getWatchHistory } from '@/services/appDataService';

interface AnimeCardProps {
  id: string;
  title: string;
  image: string;
  category: string;
  rating: string;
  year: string;
  episodes?: number;
  compact?: boolean;
  progress?: number;
}

const AnimeCard = ({ 
  id, 
  title, 
  image, 
  category, 
  rating, 
  year, 
  episodes, 
  compact = false,
  progress: explicitProgress
}: AnimeCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFav, setIsFav] = useState(() => checkIsFavorite(id));
  const [computedProgress, setComputedProgress] = useState<number | undefined>(explicitProgress);
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      setIsFav(checkIsFavorite(id));
      if (explicitProgress === undefined) {
        const history = getWatchHistory();
        const match = history.find((h) => String(h.animeId) === String(id));
        setComputedProgress(match?.progress);
      } else {
        setComputedProgress(explicitProgress);
      }
    };
    update();
    return subscribeAppData(update);
  }, [id, explicitProgress]);

  const handleClick = () => {
    navigate(`/anime/${id}`);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/anime/${id}/watch`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = toggleFavorite({
      animeId: id,
      title,
      image,
      category,
      rating,
      episodes,
      year,
    });
    setIsFav(nextState);
    toast({
      title: nextState ? "Added to favorites" : "Removed from favorites",
      description: `${title} has been ${nextState ? "added to" : "removed from"} your favorites`,
      duration: 2500,
    });
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const firstGenre = category.split(',')[0].trim();
    navigate(`/anime?genre=${encodeURIComponent(firstGenre)}`);
  };

  const primaryGenre = category.split(',')[0].trim() || 'Anime';
  const effectiveProgress = computedProgress !== undefined ? computedProgress : explicitProgress;

  return (
    <div 
      className={`group relative overflow-hidden cursor-pointer ${compact ? 'rounded-lg' : 'rounded-xl'} transition-all duration-300 ease-out glass-card ${
        isHovered ? 'scale-[1.03] shadow-xl ring-1 ring-purple-500/30' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${title}`}
    >
      {/* Background Image */}
      <div 
        className="w-full h-full bg-anime-dark transition-transform duration-500 group-hover:scale-105"
        style={{
          aspectRatio: compact ? '16/10' : '2/3',
          backgroundImage: `url(${image || '/placeholder.svg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
        }}
      />
      
      {/* Progress bar (if watched in history) */}
      {effectiveProgress !== undefined && effectiveProgress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50 z-20">
          <div 
            className="h-full bg-anime-purple" 
            style={{ width: `${Math.min(100, effectiveProgress)}%` }}
          />
        </div>
      )}
      
      {/* Permanent Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
      
      {/* Always-visible Quick Favorite Button (top right) */}
      <button 
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 hover:bg-black/80"
        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart 
          className={`h-4 w-4 transition-colors ${isFav ? 'text-red-500 fill-red-500' : 'text-white/80'}`} 
        />
      </button>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-3.5 pointer-events-none">
        <h3 className="text-white font-semibold text-sm md:text-base line-clamp-2 mb-1 drop-shadow-md">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-white/80 pointer-events-auto">
          <span 
            className="text-purple-300 font-medium hover:text-white transition-colors cursor-pointer"
            onClick={handleCategoryClick}
          >
            {primaryGenre}
          </span>
          <div className="flex items-center bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
            <Star className="h-3 w-3 text-yellow-400 mr-1 fill-yellow-400" />
            <span className="text-white font-medium">{rating && rating !== 'N/A' ? rating : '8.5'}</span>
          </div>
        </div>
      </div>
      
      {/* Hover Overlay */}
      <div 
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col justify-center items-center p-4 transition-opacity duration-200 ${
          isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button 
          className="w-12 h-12 rounded-full bg-anime-purple flex items-center justify-center mb-3 shadow-lg transform transition-transform hover:scale-110"
          onClick={handlePlay}
          aria-label={`Watch ${title}`}
        >
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </button>

        <h3 className="text-white font-semibold text-center text-sm line-clamp-2 mb-2 px-1">
          {title}
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] mb-3 text-white/80">
          {year && year !== 'N/A' && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1 text-white/60" />
              <span>{year}</span>
            </div>
          )}
          {episodes && (
            <div className="flex items-center">
              <List className="h-3 w-3 mr-1 text-white/60" />
              <span>{episodes} Eps</span>
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1 text-white/60" />
            <span>24m</span>
          </div>
        </div>

        <div 
          className="inline-flex items-center bg-white/10 hover:bg-anime-purple/30 px-2.5 py-1 rounded-full cursor-pointer transition-colors"
          onClick={handleCategoryClick}
        >
          <span className="text-xs font-medium text-white">{primaryGenre}</span>
        </div>
      </div>
    </div>
  );
};

export default AnimeCard;
