import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  TrendingUp,
  Flame,
  Bookmark,
  Download,
  Settings as SettingsIcon,
  Compass,
  Home,
  Clock,
  Sparkles,
} from 'lucide-react';
import SearchBar from './SearchBar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getWatchHistory,
  getWatchlist,
  getDownloadedEpisodes,
  subscribeAppData,
} from '@/services/appDataService';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [libraryCounts, setLibraryCounts] = useState({ history: 0, watchlist: 0, downloads: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const updateCounts = () => {
      setLibraryCounts({
        history: getWatchHistory().length,
        watchlist: getWatchlist().length,
        downloads: getDownloadedEpisodes().length,
      });
    };

    window.addEventListener('scroll', handleScroll);
    updateCounts();
    const unsubscribe = subscribeAppData(updateCounts);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
    };
  }, []);

  const categories = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Horror',
    'Romance',
    'Sci-Fi',
  ];

  const highlights = [
    { icon: <TrendingUp className="mr-1.5 h-4 w-4" />, label: 'Trending', path: '/anime?category=trending' },
    { icon: <Flame className="mr-1.5 h-4 w-4" />, label: 'Popular', path: '/anime?category=popular' },
  ];

  const totalSaved = libraryCounts.history + libraryCounts.watchlist;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          isMobile || isScrolled ? 'glass-surface !rounded-none !border-0' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 w-full items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-1.5">
                <div className="text-white font-bold text-2xl tracking-tighter">
                  <span className="text-anime-purple">Ny</span>Anime
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex ml-8 items-center space-x-6">
                <Link
                  to="/"
                  className={`text-sm font-medium transition-colors hover:text-anime-purple ${
                    location.pathname === '/' ? 'text-anime-purple' : 'text-white/90'
                  }`}
                >
                  Home
                </Link>

                <div className="relative group">
                  <button className="text-white/90 font-medium text-sm flex items-center hover:text-anime-purple transition-colors">
                    Categories <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-52 glass-card rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left group-hover:translate-y-0 translate-y-2 z-50 p-2 shadow-2xl">
                    <div className="grid grid-cols-2 gap-1">
                      {categories.map((category) => (
                        <Link
                          key={category}
                          to={`/anime?genre=${category.toLowerCase()}`}
                          className="text-white/80 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {category}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {highlights.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="text-white/90 font-medium text-sm hover:text-anime-purple transition-colors flex items-center"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}

                <Link
                  to="/library"
                  className={`text-sm font-medium transition-colors hover:text-anime-purple flex items-center gap-1.5 ${
                    location.pathname.startsWith('/library') || location.pathname.startsWith('/profile')
                      ? 'text-anime-purple'
                      : 'text-white/90'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  <span>Library</span>
                  {totalSaved > 0 && (
                    <span className="ml-0.5 rounded-full bg-anime-purple/30 px-1.5 py-0.2 text-[10px] font-semibold text-purple-300">
                      {totalSaved}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <SearchBar />

              {/* Downloads Quick Action (Desktop) */}
              <Link
                to="/library?tab=downloads"
                className="hidden md:flex relative items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Downloaded episodes"
              >
                <Download className="h-4 w-4" />
                {libraryCounts.downloads > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-anime-purple px-1 text-[9px] font-bold text-white">
                    {libraryCounts.downloads}
                  </span>
                )}
              </Link>

              {/* Settings Action (Desktop) */}
              <Link
                to="/settings"
                className="hidden md:flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title="Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Link>

              {/* Mobile Menu Toggle Button */}
              <button
                className="md:hidden text-white/80 hover:text-white p-1.5 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          <div
            className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
              isMobileMenuOpen ? 'max-h-[30rem] opacity-100 pb-5 pt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <nav className="flex flex-col space-y-2 rounded-2xl glass-card p-4">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
              >
                <Home className="h-4 w-4 text-anime-purple" />
                Home
              </Link>

              <Link
                to="/anime"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
              >
                <Compass className="h-4 w-4 text-anime-purple" />
                Browse All Anime
              </Link>

              <Link
                to="/library"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
              >
                <div className="flex items-center gap-2.5">
                  <Bookmark className="h-4 w-4 text-anime-purple" />
                  My Library
                </div>
                {totalSaved > 0 && (
                  <span className="rounded-full bg-anime-purple/30 px-2 py-0.5 text-xs text-purple-300">
                    {totalSaved}
                  </span>
                )}
              </Link>

              <Link
                to="/library?tab=downloads"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="h-4 w-4 text-green-400" />
                  Downloaded Episodes
                </div>
                {libraryCounts.downloads > 0 && (
                  <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                    {libraryCounts.downloads}
                  </span>
                )}
              </Link>

              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
              >
                <SettingsIcon className="h-4 w-4 text-anime-purple" />
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Android Native-Style Bottom Navigation Bar (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-anime-darker/95 backdrop-blur-xl px-2 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors ${
              location.pathname === '/' ? 'text-anime-purple' : 'text-white/60 hover:text-white'
            }`}
          >
            <Home className="h-5 w-5 mb-0.5" />
            <span>Home</span>
          </Link>

          <Link
            to="/anime"
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors ${
              location.pathname === '/anime' ? 'text-anime-purple' : 'text-white/60 hover:text-white'
            }`}
          >
            <Compass className="h-5 w-5 mb-0.5" />
            <span>Browse</span>
          </Link>

          <Link
            to="/library"
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors relative ${
              location.pathname.startsWith('/library') && !location.search.includes('tab=downloads')
                ? 'text-anime-purple'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Bookmark className="h-5 w-5 mb-0.5" />
            <span>Library</span>
            {totalSaved > 0 && (
              <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-anime-purple" />
            )}
          </Link>

          <Link
            to="/library?tab=downloads"
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors relative ${
              location.search.includes('tab=downloads')
                ? 'text-anime-purple'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Download className="h-5 w-5 mb-0.5" />
            <span>Downloads</span>
            {libraryCounts.downloads > 0 && (
              <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-green-400" />
            )}
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-colors ${
              location.pathname === '/settings' ? 'text-anime-purple' : 'text-white/60 hover:text-white'
            }`}
          >
            <SettingsIcon className="h-5 w-5 mb-0.5" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>
    </>
  );
};

export default Header;
