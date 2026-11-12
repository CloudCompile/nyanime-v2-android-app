import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  HardDrive,
  Play,
  RotateCcw,
  Download,
  Upload,
  Check,
  Shield,
  Smartphone,
  Trash2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  getPreferences,
  updatePreferences,
  clearAllAppData,
  exportAppDataJson,
  importAppDataJson,
  getWatchHistory,
  getWatchlist,
  getFavorites,
  getDownloadedEpisodes,
  clearWatchHistory,
  clearDownloadedEpisodes,
  AppPreferences,
} from '@/services/appDataService';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<AppPreferences>(() => getPreferences());
  const [stats, setStats] = useState({
    historyCount: 0,
    watchlistCount: 0,
    favoritesCount: 0,
    downloadsCount: 0,
  });

  useEffect(() => {
    setStats({
      historyCount: getWatchHistory().length,
      watchlistCount: getWatchlist().length,
      favoritesCount: getFavorites().length,
      downloadsCount: getDownloadedEpisodes().length,
    });
  }, []);

  const handleUpdate = (patch: Partial<AppPreferences>) => {
    const next = updatePreferences(patch);
    setPrefs({ ...next });
    toast({ title: 'Preferences saved', description: 'Your playback settings have been updated.' });
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all watch history and playback positions?')) {
      clearWatchHistory();
      setStats((prev) => ({ ...prev, historyCount: 0 }));
      toast({ title: 'History cleared', description: 'Watch history has been cleared.' });
    }
  };

  const handleClearDownloads = () => {
    if (window.confirm('Clear all downloaded episode records?')) {
      clearDownloadedEpisodes();
      setStats((prev) => ({ ...prev, downloadsCount: 0 }));
      toast({ title: 'Downloads cleared', description: 'Downloaded episode records have been cleared.' });
    }
  };

  const handleResetAll = () => {
    if (
      window.confirm(
        'Are you sure you want to erase all local data? This will clear history, watchlist, favorites, and settings.'
      )
    ) {
      clearAllAppData();
      setPrefs(getPreferences());
      setStats({
        historyCount: 0,
        watchlistCount: 0,
        favoritesCount: 0,
        downloadsCount: 0,
      });
      toast({ title: 'App Data Reset', description: 'All local data was reset to factory defaults.' });
    }
  };

  const handleExport = () => {
    const jsonStr = exportAppDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyanime-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Backup exported', description: 'App data JSON file downloaded.' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importAppDataJson(content)) {
        setPrefs(getPreferences());
        setStats({
          historyCount: getWatchHistory().length,
          watchlistCount: getWatchlist().length,
          favoritesCount: getFavorites().length,
          downloadsCount: getDownloadedEpisodes().length,
        });
        toast({ title: 'Data imported', description: 'App data restored successfully!' });
      } else {
        toast({
          title: 'Import failed',
          description: 'The selected backup file is invalid.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-anime-darker pb-20">
      <Header />

      <main className="container mx-auto max-w-3xl px-4 pt-24 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
          <span className="text-xs text-white/40">App Settings</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-white/60">
            Customize playback, offline storage, and manage your local data.
          </p>
        </div>

        <div className="space-y-6">
          {/* Playback Settings Card */}
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
              <Play className="h-5 w-5 text-anime-purple" />
              <h2 className="text-base font-semibold text-white">Playback Preferences</h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-play-next" className="text-sm font-medium text-white">
                    Auto-Play Next Episode
                  </Label>
                  <p className="text-xs text-white/50">
                    Automatically start the next episode when the current one finishes.
                  </p>
                </div>
                <Switch
                  id="auto-play-next"
                  checked={prefs.autoPlayNext}
                  onCheckedChange={(checked) => handleUpdate({ autoPlayNext: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-skip-intro" className="text-sm font-medium text-white">
                    Auto-Skip Opening & Outro
                  </Label>
                  <p className="text-xs text-white/50">
                    Skip recognized intro sequences when timestamp markers exist.
                  </p>
                </div>
                <Switch
                  id="auto-skip-intro"
                  checked={prefs.autoSkipIntro}
                  onCheckedChange={(checked) => handleUpdate({ autoSkipIntro: checked })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-white/5">
                <div>
                  <Label className="text-sm font-medium text-white">Preferred Audio Track</Label>
                  <p className="text-xs text-white/50">Default language track when available</p>
                </div>
                <Select
                  value={prefs.defaultTrack}
                  onValueChange={(val: 'sub' | 'dub') => handleUpdate({ defaultTrack: val })}
                >
                  <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-anime-dark border-white/10 text-white">
                    <SelectItem value="sub">Sub (Japanese)</SelectItem>
                    <SelectItem value="dub">Dub (English)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-white/5">
                <div>
                  <Label className="text-sm font-medium text-white">Preferred Server</Label>
                  <p className="text-xs text-white/50">Direct HLS streaming mirror</p>
                </div>
                <Select
                  value={prefs.preferredServer}
                  onValueChange={(val: string) => handleUpdate({ preferredServer: val })}
                >
                  <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-anime-dark border-white/10 text-white">
                    <SelectItem value="Vidplay">Vidplay (Direct HLS)</SelectItem>
                    <SelectItem value="MyCloud">MyCloud</SelectItem>
                    <SelectItem value="DatSaV">DatSaV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Local App Storage Management */}
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
              <HardDrive className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-semibold text-white">Local Storage & Privacy</h2>
            </div>

            <p className="mb-4 text-xs text-white/60">
              NyAnime stores all your viewing progress, watchlist, and downloaded episodes locally in
              your device storage. No account is required and no personal data is transmitted to
              external servers.
            </p>

            {/* Storage breakdown */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <span className="text-lg font-bold text-white">{stats.historyCount}</span>
                <p className="text-[11px] text-white/50">History Entries</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <span className="text-lg font-bold text-white">{stats.watchlistCount}</span>
                <p className="text-[11px] text-white/50">Watchlist Shows</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <span className="text-lg font-bold text-white">{stats.favoritesCount}</span>
                <p className="text-[11px] text-white/50">Favorites</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                <span className="text-lg font-bold text-white">{stats.downloadsCount}</span>
                <p className="text-[11px] text-white/50">Downloads</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export Backup
              </Button>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import Backup
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-white/70 hover:bg-white/10"
              >
                Clear History
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDownloads}
                className="text-white/70 hover:bg-white/10"
              >
                Clear Downloads
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Erase All App Data
              </Button>
            </div>
          </section>

          {/* Play Store & App Details Card */}
          <section className="glass-card rounded-2xl p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
              <Smartphone className="h-5 w-5 text-green-400" />
              <h2 className="text-base font-semibold text-white">About NyAnime</h2>
            </div>

            <div className="space-y-3 text-xs text-white/70">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Application Version</span>
                <span className="font-mono text-white">2.4.0 (Play Store Ready)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Account Requirement</span>
                <span className="text-green-400 font-medium">None (Zero Account Friction)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span>Data Storage</span>
                <span className="text-white">Local Device Storage (Sandboxed)</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Video Streaming Engine</span>
                <span className="text-white">HLS / MPEG-TS Stream Pipeline</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
