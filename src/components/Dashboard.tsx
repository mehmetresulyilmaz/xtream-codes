import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Play, Tv2, Film, Library, User, LogOut, ChevronRight, LayoutGrid, List, Menu, ShieldCheck, Settings, Lock } from 'lucide-react';
import { XtreamClient } from '@/lib/xtream';
import { XtreamAuthResponse, Category, Stream, Movie, Series } from '@/types';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface DashboardProps {
  client: XtreamClient;
  authData: XtreamAuthResponse;
  onLogout: () => void;
}

type TabType = 'live' | 'movie' | 'series' | 'settings';

interface SeriesInfo {
  seasons: any[];
  episodes: Record<string, any[]>;
  info: any;
}

const StreamItem = memo(({ 
  stream, 
  viewMode, 
  onClick, 
  type, 
  epgInfo, 
  onLoadEPG 
}: { 
  stream: any, 
  viewMode: 'grid' | 'list', 
  onClick: (s: any) => void, 
  type: TabType,
  epgInfo?: any,
  onLoadEPG?: (id: number) => void
}) => {
  const isPoster = type === 'movie' || type === 'series';

  useEffect(() => {
    if (type === 'live' && stream.stream_id && onLoadEPG && !epgInfo) {
      onLoadEPG(stream.stream_id);
    }
  }, [stream.stream_id, type, onLoadEPG, epgInfo]);
  
  const safeDecode = (str: string) => {
    try {
      return atob(str);
    } catch (e) {
      return str;
    }
  };
  
  const renderEPG = () => {
    if (!epgInfo || epgInfo.pending || epgInfo.empty) return null;
    
    const title = safeDecode(epgInfo.title || '');
    const startTime = new Date(epgInfo.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <div className="mt-1 flex flex-col gap-0.5">
        <p className="text-[11px] font-bold text-orange-600 truncate leading-tight">
          {startTime} - {title || 'Bilinmeyen Program'}
        </p>
        {epgInfo.description && (
          <p className="text-[9px] text-slate-400 truncate opacity-60">
            {safeDecode(epgInfo.description).substring(0, 50)}...
          </p>
        )}
      </div>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="cursor-pointer group"
      onClick={() => onClick(stream)}
    >
      {viewMode === 'grid' ? (
        <div className={`relative rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-sm transition-all group-hover:border-orange-500/50 group-hover:shadow-orange-200/50 ${isPoster ? 'aspect-[2/3]' : 'aspect-video'}`}>
          <img 
            src={stream.stream_icon || stream.cover || 'https://via.placeholder.com/400x600?text=Icerik+Yok'} 
            alt={stream.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as any).src = 'https://via.placeholder.com/400x600?text=Icerik+Yok';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
              <div className="p-5 bg-white/90 rounded-full shadow-2xl backdrop-blur-md">
                <Play className="h-10 w-10 fill-current text-orange-600" />
              </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-1 group-hover:translate-y-0 transition-transform bg-gradient-to-t from-white via-white/80 to-transparent">
              <p className="text-base font-black truncate text-slate-800 tracking-tight">{stream.name}</p>
              {type === 'live' && renderEPG()}
              <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
                  {stream.stream_type || (type === 'series' ? 'Series' : 'Hemen İzle')}
                </span>
                {stream.rating && <span className="text-xs text-orange-600 font-black">★ {stream.rating}</span>}
              </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-6 p-4 bg-white border border-slate-100 rounded-3xl hover:bg-slate-50 hover:border-orange-500/30 transition-all group relative overflow-hidden shadow-sm hover:shadow-md">
            <div className={`h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/50 relative ${isPoster ? 'w-12' : 'w-24'}`}>
              <img 
                src={stream.stream_icon || stream.cover || 'https://via.placeholder.com/120x68?text=...'} 
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => (e.target as any).src = 'https://via.placeholder.com/120x68?text=...'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black truncate group-hover:text-orange-600 transition-colors tracking-tight text-slate-800">{stream.name}</p>
              {type === 'live' && renderEPG()}
              <div className="flex items-center gap-4 mt-1.5">
                 <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50">{stream.stream_type || type}</span>
                 {stream.rating && <span className="text-[11px] text-orange-600 font-black flex items-center gap-1"><Library className="h-3 w-3" /> {stream.rating}</span>}
              </div>
            </div>
            <div className="pr-2">
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-all bg-orange-500 text-white rounded-2xl h-12 w-12 shadow-lg shadow-orange-500/20 translate-x-4 group-hover:translate-x-0">
                <Play className="h-5 w-5 fill-current" />
              </Button>
            </div>
        </div>
      )}
    </motion.div>
  );
});

export const Dashboard: React.FC<DashboardProps> = ({ client, authData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [streams, setStreams] = useState<(Stream | Movie | Series)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStream, setCurrentStream] = useState<{ url: string; title: string; epg?: any } | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<{ series: Series, info: SeriesInfo | null } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pin, setPin] = useState(localStorage.getItem('xstream_pin') || '');
  const [tempPin, setTempPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [verifyCallback, setVerifyCallback] = useState<(() => void) | null>(null);
  const [lockedCategories, setLockedCategories] = useState<string[]>(JSON.parse(localStorage.getItem('xstream_locked_categories') || '[]'));
  const [displayLimit, setDisplayLimit] = useState(48);
  const observerRef = React.useRef<HTMLDivElement>(null);
  const epgDataRef = React.useRef<Record<string, any>>({});
  const [epgData, setEpgData] = useState<Record<string, any>>({});

  useEffect(() => {
    localStorage.setItem('xstream_locked_categories', JSON.stringify(lockedCategories));
  }, [lockedCategories]);

  const loadEPG = useCallback(async (streamId: number) => {
    if (epgDataRef.current[streamId]) return;
    
    // Mark as pending to avoid concurrent duplicate requests
    epgDataRef.current[streamId] = { pending: true };
    
    try {
      const data = await client.getShortEPG(streamId);
      if (data && data.epg_listings && data.epg_listings.length > 0) {
        // Find current program
        const now = new Date();
        const current = data.epg_listings.find((item: any) => {
          const start = new Date(item.start);
          const end = new Date(item.end);
          return now >= start && now <= end;
        }) || data.epg_listings[0];

        epgDataRef.current[streamId] = current;
        setEpgData(prev => ({ ...prev, [streamId]: current }));
      } else {
        // No EPG data found, mark so we don't try again soon
        epgDataRef.current[streamId] = { empty: true };
      }
    } catch (err) {
      // Mark as failed so we don't spam the server if it returns 500
      epgDataRef.current[streamId] = { error: true };
    }
  }, [client]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset limit and scroll to top when changing category or tab
    setDisplayLimit(48);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [selectedCategory, activeTab]);

  const handleSavePin = () => {
    if (tempPin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }
    localStorage.setItem('xstream_pin', tempPin);
    setPin(tempPin);
    setShowPinSetup(false);
    toast.success('Parental PIN saved');
  };

  const handleDisablePin = () => {
    setVerifyCallback(() => () => {
      localStorage.removeItem('xstream_pin');
      localStorage.removeItem('xstream_locked_categories');
      setPin('');
      setLockedCategories([]);
      toast.success('Ebeveyn denetimi devre dışı bırakıldı');
    });
    setShowPinVerify(true);
  };

  const handleVerifyPin = () => {
    if (tempPin === pin) {
      setShowPinVerify(false);
      setTempPin('');
      if (verifyCallback) verifyCallback();
      setVerifyCallback(null);
    } else {
      toast.error('Incorrect PIN');
      setTempPin('');
    }
  };

  const toggleCategoryLock = (catId: string) => {
    if (lockedCategories.includes(catId)) {
      setLockedCategories(lockedCategories.filter(id => id !== catId));
    } else {
      setLockedCategories([...lockedCategories, catId]);
    }
  };

  const onCategoryClick = (catId: string) => {
    if (lockedCategories.includes(catId) && pin) {
      setVerifyCallback(() => () => setSelectedCategory(catId));
      setShowPinVerify(true);
    } else {
      setSelectedCategory(catId);
    }
  };

  useEffect(() => {
    if (activeTab !== 'settings') {
      loadCategories(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedCategory || categories.length > 0) {
      loadStreams(activeTab, selectedCategory || undefined);
    }
  }, [selectedCategory, activeTab]);

  const loadCategories = async (type: TabType) => {
    setIsLoading(true);
    try {
      let cats: Category[] = [];
      if (type === 'live') cats = await client.getLiveCategories();
      else if (type === 'movie') cats = await client.getVodCategories();
      else if (type === 'series') cats = await client.getSeriesCategories();
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].category_id);
      }
    } catch (err: any) {
      console.error('Category load error:', err);
      let msg = 'Kategoriler yüklenemedi';
      if (err.message === 'Network Error') {
        msg = 'Sunucuyla bağlantı kurulamadı (Ağ hatası)';
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

   const loadStreams = async (type: TabType, catId?: string) => {
    if (type === 'settings') return;
    setIsLoading(true);
    try {
      let data: (Stream | Movie | Series)[] = [];
      if (type === 'live') data = await client.getLiveStreams(catId);
      else if (type === 'movie') data = await client.getVodStreams(catId);
      else if (type === 'series') data = await client.getSeries(catId);
      
      console.log(`Loaded ${data.length} items for ${type} in category ${catId}`);
      setStreams(Array.isArray(data) ? data : []);
      setDisplayLimit(48); // Reset limit on category change
    } catch (err: any) {
      console.error('Stream loading error:', err);
      let msg = 'İçerikler yüklenirken hata oluştu';
      if (err.message === 'Network Error') {
        msg = 'Bağlantı koptu. Lütfen tekrar deneyin.';
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg);
      setStreams([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStreams = React.useMemo(() => streams.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [streams, searchQuery]);

  const paginatedStreams = React.useMemo(() => filteredStreams.slice(0, displayLimit), [filteredStreams, displayLimit]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && filteredStreams.length > displayLimit) {
          setDisplayLimit(prev => prev + 48);
        }
      },
      { 
        root: scrollContainerRef.current,
        threshold: 0.1,
        rootMargin: '400px'
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [filteredStreams.length, displayLimit]);

  const handleStreamClick = useCallback(async (stream: any) => {
    if (activeTab === 'series') {
      setIsLoading(true);
      try {
        const info = await client.getSeriesInfo(stream.series_id);
        setSelectedSeries({ series: stream, info });
      } catch (err) {
        toast.error('Failed to load series details');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const streamId = stream.stream_id;
    const type = activeTab;
    if (type === 'settings') return;
    const ext = stream.container_extension || (type === 'live' ? 'ts' : 'mp4');
    const url = client.getStreamUrl(streamId, type as 'live' | 'movie' | 'series', ext);
    setCurrentStream({ url, title: stream.name, epg: epgDataRef.current[streamId] });
  }, [client, activeTab]);

  const handleEpisodeClick = useCallback((episode: any) => {
    const streamId = episode.id || episode.stream_id;
    const ext = episode.container_extension || 'mp4';
    const url = client.getStreamUrl(streamId, 'series', ext);
    setCurrentStream({ url, title: episode.title || episode.name });
  }, [client]);  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative font-sans">
      {/* Atmosphere Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-orange-200/40 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-100/40 blur-[180px] rounded-full" />
        <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-orange-100/30 blur-[120px] rounded-full" />
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-24 md:w-80 border-r border-slate-200 flex flex-col bg-white/60 backdrop-blur-3xl transition-all duration-500 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-10 hidden md:block">
           <div className="flex items-center gap-5 group cursor-default">
              <div className="h-14 w-14 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 rounded-[1.5rem] flex items-center justify-center shadow-[0_12px_32px_rgba(234,88,12,0.2)] border border-white/40 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                 <Tv2 className="h-8 w-8 text-white drop-shadow-md" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black italic tracking-tighter leading-none text-slate-800">LURA</h1>
                <span className="text-[10px] uppercase tracking-[0.4em] text-orange-600 font-black mt-1">PLAYER</span>
              </div>
           </div>
        </div>
        <div className="p-6 md:hidden flex justify-center mt-4">
           <Tv2 className="h-8 w-8 text-orange-600" />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
           {[
             { id: 'live', icon: <Tv2 className="h-5 w-5" />, label: 'Canlı TV' },
             { id: 'movie', icon: <Film className="h-5 w-5" />, label: 'Filmler' },
             { id: 'series', icon: <Library className="h-5 w-5" />, label: 'Diziler' },
             { id: 'settings', icon: <Settings className="h-5 w-5" />, label: 'Ayarlar' }
           ].map((item) => (
             <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSelectedCategory(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all relative group ${activeTab === item.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100/50'}`}
             >
                <div className={`relative z-10 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-orange-600' : ''}`}>
                  {item.icon}
                </div>
                <span className="hidden md:block font-black tracking-tight relative z-10 text-sm">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div layoutId="navActive" className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-2xl z-0" />
                )}
             </button>
           ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="hidden md:block mb-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded-xl bg-orange-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-orange-500/20">
                    {authData.user_info.username.charAt(0).toUpperCase()}
                 </div>
                 <span className="text-sm font-black text-slate-800 truncate pr-2">{authData.user_info.username}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                 <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                 <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                    {authData.user_info.status === 'Active' ? 'Aktif Üyelik' : authData.user_info.status}
                 </div>
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black text-sm group"
           >
              <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:block">Oturumu Kapat</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full z-10">
         {/* Top Header */}
         <header className="h-20 md:h-28 border-b border-slate-200/50 flex items-center justify-between px-6 md:px-12 bg-white/40 backdrop-blur-3xl z-30 transition-all">
            <div className="flex items-center gap-6 flex-1">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="md:hidden text-slate-400 bg-white h-12 w-12 rounded-2xl shadow-sm border border-slate-100"
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               >
                 <Menu className="h-6 w-6" />
               </Button>
               
               <div className="flex-1 max-w-2xl">
                  <div className="relative group">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-600 transition-all" />
                     <Input 
                       placeholder="Ne izlemek istersin? (Kanal, Film veya Dizi)" 
                       className="bg-white/80 border-slate-200/60 pl-14 h-14 md:h-16 rounded-[1.5rem] focus:bg-white focus:ring-orange-500/10 transition-all text-base font-medium placeholder:text-slate-400 shadow-sm"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4 ml-8">
                <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-md">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewMode('grid')}
                    className={`h-10 w-10 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewMode('list')}
                    className={`h-10 w-10 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}
                  >
                    <List className="h-5 w-5" />
                  </Button>
                </div>
                <div className="md:hidden h-10 w-10 rounded-2xl bg-orange-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-orange-500/30">
                    {authData.user_info.username.charAt(0).toUpperCase()}
                </div>
            </div>
         </header>

         {/* Grid Body */}
         <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {activeTab === 'settings' ? (
              <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-white/20">
                <div className="max-w-4xl mx-auto space-y-8">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Ayarlar</h2>
                    <p className="text-slate-500 font-medium">Uygulama tercihlerini ve ebeveyn denetimlerini buradan yönetebilirsiniz.</p>
                  </header>

                  <section className="space-y-6">
                    <div className="p-8 bg-white/60 border border-white/60 rounded-[2.5rem] backdrop-blur-3xl shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                      
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
                          <div className="flex items-center gap-6">
                            <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem] border border-orange-100">
                               <ShieldCheck className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-black tracking-tight text-slate-800">Ebeveyn Denetimi</h3>
                              <p className="text-slate-500 font-medium mt-1">Özel kategorileri 4 haneli bir PIN ile koruma altına alın.</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {pin && (
                              <Button 
                                onClick={handleDisablePin}
                                variant="outline"
                                className="border-red-100 text-red-600 hover:bg-red-50 rounded-2xl h-12 px-8 font-black transition-all"
                              >
                                PIN'i Kaldır
                              </Button>
                            )}
                            <Button 
                              onClick={() => {
                                setTempPin('');
                                setShowPinSetup(true);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-8 font-black transition-all hover:scale-105 active:scale-95"
                            >
                              {pin ? 'PIN Değiştir' : 'PIN Oluştur'}
                            </Button>
                          </div>
                        </div>

                      {pin && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pb-4 border-b border-slate-100">
                             <Lock className="h-3.5 w-3.5" />
                             <span>Kilitli Kategoriler</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             {categories.map(cat => (
                               <div key={cat.category_id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 group hover:bg-white transition-all hover:shadow-md">
                                 <span className="text-sm font-black truncate pr-4 text-slate-700">{cat.category_name}</span>
                                 <button 
                                   onClick={() => toggleCategoryLock(cat.category_id)}
                                   className={`p-3 rounded-xl transition-all ${lockedCategories.includes(cat.category_id) ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-300 hover:text-slate-600 bg-slate-100'}`}
                                 >
                                   {lockedCategories.includes(cat.category_id) ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                                 </button>
                               </div>
                             ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <>
            <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200/50 flex flex-col bg-white/40 backdrop-blur-3xl h-[80px] md:h-full overflow-hidden shrink-0 transition-all duration-500">
               <div className="px-8 py-6 flex items-center justify-between border-b border-slate-200/50 hidden md:flex bg-slate-50/30">
                  <div className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Kategoriler</div>
                  <div className="flex gap-2">
                     <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                     <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                  <div className="p-4 flex md:block overflow-x-auto md:overflow-x-visible items-center gap-3 md:space-y-2">
                     {isLoading && categories.length === 0 ? (
                        Array(12).fill(0).map((_, i) => (
                           <div key={i} className="px-6 py-4">
                              <Skeleton className="h-5 w-full bg-slate-100 rounded-xl" />
                           </div>
                        ))
                     ) : (
                        categories.map((cat) => (
                          <button
                            key={cat.category_id}
                            onClick={() => onCategoryClick(cat.category_id)}
                            className={`whitespace-nowrap md:whitespace-normal px-6 py-5 rounded-[1.5rem] text-sm transition-all flex items-center justify-between group flex-shrink-0 relative overflow-hidden ${selectedCategory === cat.category_id ? 'text-white font-black' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
                          >
                           <span className="relative z-10 truncate tracking-tight uppercase tracking-wider text-[11px] font-black">{cat.category_name}</span>
                           <div className="flex items-center gap-3 relative z-10 ml-4">
                              {lockedCategories.includes(cat.category_id) && <Lock className={`h-4 w-4 ${selectedCategory === cat.category_id ? 'text-white' : 'text-orange-500/40'}`} />}
                              <ChevronRight className={`hidden md:block h-4 w-4 transition-all duration-500 ${selectedCategory === cat.category_id ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                           </div>
                           {selectedCategory === cat.category_id && (
                              <motion.div layoutId="activeCat" className="absolute inset-0 bg-orange-600 z-0 shadow-xl shadow-orange-600/30" />
                           )}
                          </button>
                        ))
                     )}
                  </div>
               </div>
            </aside>

            {/* Stream Grid Section */}
            <div className="flex-1 bg-slate-50/30 relative flex flex-col min-w-0">
               <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                  <div className={`p-4 md:p-10 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 md:gap-10' : 'mx-auto max-w-5xl space-y-4'}`}>
                     {isLoading && streams.length === 0 ? (
                       Array(12).fill(0).map((_, i) => (
                         <div key={i} className={viewMode === 'grid' ? "" : "w-full"}>
                            <Skeleton className={`${viewMode === 'grid' ? 'aspect-video w-full' : 'h-16 w-full'} rounded-2xl bg-white border border-slate-100`} />
                         </div>
                       ))
                     ) : filteredStreams.length > 0 ? (
                       paginatedStreams.map((stream) => (
                         <StreamItem 
                            key={(stream as any).stream_id || (stream as any).series_id} 
                            stream={stream} 
                            viewMode={viewMode} 
                            type={activeTab}
                            epgInfo={epgData[(stream as any).stream_id]}
                            onLoadEPG={loadEPG}
                            onClick={handleStreamClick} 
                         />
                       ))
                     ) : (
                       <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                          <div className="h-20 w-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-200/50">
                             <Library className="h-10 w-10 text-slate-300" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 mb-2">İçerik Bulunamadı</h3>
                          <p className="text-slate-500 max-w-xs">Bu kategoride henüz içerik bulunmuyor veya aramanızla eşleşen sonuç yok.</p>
                       </div>
                     )}
                     
                     {filteredStreams.length > displayLimit && (
                       <div ref={observerRef} className="col-span-full flex justify-center py-10 pb-20">
                         <div className="flex items-center gap-3">
                           <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                           <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                           <div className="h-2 w-2 bg-orange-500 rounded-full animate-bounce" />
                         </div>
                       </div>
                     )}
                  </div>
               </div>
               {isMobileMenuOpen && (
                 <div 
                   className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden" 
                   onClick={() => setIsMobileMenuOpen(false)}
                 />
               )}
            </div>
            </>
           )}
         </div>

         {/* Player Overlay */}
         <AnimatePresence>
            {currentStream && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black"
              >
                <VideoPlayer 
                  key={currentStream.url}
                  url={currentStream.url} 
                  title={currentStream.title} 
                  epgInfo={currentStream.epg}
                  onClose={() => setCurrentStream(null)} 
                />
              </motion.div>
            )}
         </AnimatePresence>
          {/* Dialogs for PIN */}
          <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
            <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-md rounded-[2.5rem] shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic">Ebeveyn PIN Kodu Oluştur</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  Kilitli kategorilere erişmek için 4 haneli bir PIN kodu belirleyin.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Label htmlFor="pin" className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 block">4 Haneli PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  maxLength={4}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                  className="bg-slate-100 border-slate-200 text-slate-900 text-2xl tracking-[1em] text-center h-16 rounded-2xl shadow-inner focus:ring-orange-500/10"
                  placeholder="0000"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleSavePin} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-2xl font-black text-base shadow-xl">PIN Kodunu Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showPinVerify} onOpenChange={setShowPinVerify}>
            <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-md rounded-[2.5rem] shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic">PIN Kodunu Girin</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  Bu içerik korunmaktadır. Devam etmek için lütfen PIN kodunuzu girin.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Label htmlFor="verify-pin" className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 block">4 Haneli PIN</Label>
                <Input
                  id="verify-pin"
                  type="password"
                  maxLength={4}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                  className="bg-slate-100 border-slate-200 text-slate-900 text-2xl tracking-[1em] text-center h-16 rounded-2xl shadow-inner focus:ring-orange-500/10"
                  placeholder="0000"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button onClick={handleVerifyPin} className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl font-black text-base shadow-xl shadow-orange-600/20">Kilidi Aç</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Series Details Dialog */}
          <Dialog open={!!selectedSeries} onOpenChange={() => setSelectedSeries(null)}>
            <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-5xl h-[85vh] p-0 overflow-hidden flex flex-col shadow-2xl rounded-[3rem]">
               {selectedSeries && (
                 <>
                   {/* Header with Backdrop */}
                   <div className="relative h-80 flex-shrink-0">
                      <div className="absolute inset-0">
                        <img 
                          src={selectedSeries.info?.info?.backdrop_path?.[0] || selectedSeries.series.cover} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
                        <div className="absolute inset-0 backdrop-blur-[4px]" />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-12 flex gap-10 items-end">
                         <div className="h-64 w-44 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 transform -translate-y-4 hidden sm:block">
                            <img src={selectedSeries.series.cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         </div>
                         <div className="flex-1 flex flex-col justify-end">
                            <div className="flex items-center gap-3 mb-4">
                               <div className="px-3 py-1 bg-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20">
                                  {selectedSeries.info?.info?.genre?.split(',')?.[0] || 'Series'}
                               </div>
                               <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-300 border border-white/10 backdrop-blur-md">
                                  {selectedSeries.info?.info?.releaseDate || '2024'}
                               </div>
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter leading-[0.9] mb-4 text-white drop-shadow-2xl">{selectedSeries.series.name}</h2>
                            <div className="flex items-center gap-6 text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">
                               <span className="flex items-center gap-2 text-orange-500">
                                 <Library className="h-4 w-4" /> {selectedSeries.series.rating || '8.4'}
                               </span>
                               <span className="opacity-20">|</span>
                               <span>{Object.keys(selectedSeries.info?.episodes || {}).length} Sezon</span>
                               <span className="opacity-20">|</span>
                               <span className="text-zinc-500">{selectedSeries.info?.info?.cast?.split(',')?.[0]}</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Episodes List */}
                   <div className="flex-1 overflow-hidden flex flex-col p-12 pt-6">
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-6">
                         <div className="space-y-12">
                            {Object.entries(selectedSeries.info?.episodes || {}).map(([seasonNum, episodes]: [string, any]) => (
                               <div key={seasonNum}>
                                  <div className="flex items-center gap-4 mb-8">
                                     <h3 className="text-sm font-black text-orange-500 uppercase tracking-[0.5em]">SEZON {seasonNum}</h3>
                                     <div className="h-px flex-1 bg-gradient-to-r from-orange-500/20 to-transparent" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {episodes.map((ep: any) => (
                                        <button 
                                          key={ep.id}
                                          onClick={() => handleEpisodeClick(ep)}
                                          className="flex items-center gap-5 p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-orange-500/30 transition-all group text-left relative overflow-hidden"
                                        >
                                           <div className="h-12 w-12 rounded-2xl bg-orange-600/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-600 transition-all shadow-inner">
                                              <Play className="h-5 w-5 fill-current text-orange-500 group-hover:text-white" />
                                           </div>
                                           <div className="flex-1 min-w-0">
                                              <p className="font-black truncate group-hover:text-orange-500 transition-colors uppercase tracking-tight text-sm">Bölüm {ep.episode_num || ep.id}: {ep.title}</p>
                                              <p className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-bold truncate mt-1 uppercase tracking-wider">
                                                {ep.info?.duration || '45 dk'} • {ep.info?.plot?.slice(0, 50) || 'Bölüm detayları bulunmamaktadır.'}...
                                              </p>
                                           </div>
                                        </button>
                                     ))}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 </>
               )}
            </DialogContent>
          </Dialog>
      </main>
    </div>
  );
};
