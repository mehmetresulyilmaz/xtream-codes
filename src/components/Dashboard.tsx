import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const StreamItem = ({ stream, viewMode, onClick }: { stream: any, viewMode: 'grid' | 'list', onClick: (s: any) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, scale: 1.02 }}
    transition={{ duration: 0.3 }}
    className="cursor-pointer group"
    onClick={() => onClick(stream)}
  >
    {viewMode === 'grid' ? (
      <div className="aspect-video relative rounded-2xl overflow-hidden bg-zinc-900/40 border border-white/5 shadow-2xl transition-all group-hover:border-orange-500/50 group-hover:shadow-orange-600/10">
        <img 
          src={stream.stream_icon || stream.cover || 'https://via.placeholder.com/400x225?text=No+Image'} 
          alt={stream.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as any).src = 'https://via.placeholder.com/400x225?text=No+Image';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
            <div className="p-4 bg-orange-600 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.4)]">
              <Play className="h-8 w-8 fill-current text-white" />
            </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform">
            <p className="text-sm font-black truncate text-white tracking-tight drop-shadow-md">{stream.name}</p>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {stream.stream_type || 'Watch Now'}
            </p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-orange-500/30 transition-all group relative overflow-hidden backdrop-blur-sm">
          <div className="h-14 w-24 rounded-xl overflow-hidden bg-zinc-950 flex-shrink-0 border border-white/5 relative">
            <img 
              src={stream.stream_icon || stream.cover || 'https://via.placeholder.com/120x68?text=...'} 
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              referrerPolicy="no-referrer"
              onError={(e) => (e.target as any).src = 'https://via.placeholder.com/120x68?text=...'}
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate group-hover:text-orange-500 transition-colors tracking-tight">{stream.name}</p>
            <div className="flex items-center gap-3 mt-1.5">
               <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{stream.stream_type || 'Stream'}</span>
               {stream.rating && <span className="text-[10px] text-orange-500 font-black">★ {stream.rating}</span>}
            </div>
          </div>
          <div className="pr-2">
            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-all bg-orange-600 text-white rounded-xl h-10 w-10 shadow-lg shadow-orange-600/20 translate-x-4 group-hover:translate-x-0">
              <Play className="h-4 w-4 fill-current" />
            </Button>
          </div>
      </div>
    )}
  </motion.div>
);

export const Dashboard: React.FC<DashboardProps> = ({ client, authData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [streams, setStreams] = useState<(Stream | Movie | Series)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStream, setCurrentStream] = useState<{ url: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pin, setPin] = useState(localStorage.getItem('xstream_pin') || '');
  const [tempPin, setTempPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [verifyCallback, setVerifyCallback] = useState<(() => void) | null>(null);
  const [lockedCategories, setLockedCategories] = useState<string[]>(JSON.parse(localStorage.getItem('xstream_locked_categories') || '[]'));
  const [displayLimit, setDisplayLimit] = useState(48);

  useEffect(() => {
    localStorage.setItem('xstream_locked_categories', JSON.stringify(lockedCategories));
  }, [lockedCategories]);

  useEffect(() => {
    // Reset limit when changing category or tab
    setDisplayLimit(48);
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
    } catch (err) {
      toast.error('Failed to load categories');
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
      setStreams(data);
    } catch (err) {
      toast.error('Failed to load streams');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStreams = streams.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedStreams = filteredStreams.slice(0, displayLimit);

  const handleStreamClick = (stream: any) => {
    const streamId = stream.stream_id || stream.series_id;
    const type = activeTab;
    if (type === 'settings') return;
    const ext = stream.container_extension || 'm3u8';
    const url = client.getStreamUrl(streamId, type as 'live' | 'movie' | 'series', ext);
    setCurrentStream({ url, title: stream.name });
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden relative font-sans">
      {/* Atmosphere Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-20 md:w-72 border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-3xl transition-transform md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8 hidden md:block">
           <div className="flex items-center gap-4 group cursor-default">
              <div className="p-2.5 bg-gradient-to-br from-orange-400 to-orange-700 rounded-2xl shadow-[0_8px_20px_rgba(234,88,12,0.3)] border border-white/10 group-hover:scale-110 transition-transform duration-500">
                 <Tv2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter leading-none text-white">XSTREAM</h1>
                <span className="text-[10px] uppercase tracking-[0.3em] text-orange-500 font-bold">Premium Pro</span>
              </div>
           </div>
        </div>
        <div className="p-6 md:hidden flex justify-center mt-4">
           <Tv2 className="h-8 w-8 text-orange-600 shadow-orange-600/50" />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
           {[
             { id: 'live', icon: <Tv2 className="h-5 w-5" />, label: 'Live TV' },
             { id: 'movie', icon: <Film className="h-5 w-5" />, label: 'Movies' },
             { id: 'series', icon: <Library className="h-5 w-5" />, label: 'Series' },
             { id: 'settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' }
           ].map((item) => (
             <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSelectedCategory(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all relative group ${activeTab === item.id ? 'text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
             >
                <div className={`relative z-10 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-orange-500' : ''}`}>
                  {item.icon}
                </div>
                <span className="hidden md:block font-black tracking-tight relative z-10 text-sm">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div layoutId="navActive" className="absolute inset-0 bg-white/5 border border-white/5 rounded-2xl z-0" />
                )}
             </button>
           ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
           <div className="hidden md:block mb-4 p-5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded-xl bg-orange-600 flex items-center justify-center text-xs font-black shadow-lg shadow-orange-600/20">
                    {authData.user_info.username.charAt(0).toUpperCase()}
                 </div>
                 <span className="text-sm font-black text-white truncate pr-2">{authData.user_info.username}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                 <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                 <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                    {authData.user_info.status === 'Active' ? 'Aktif Üyelik' : authData.user_info.status}
                 </div>
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all font-black text-sm group"
           >
              <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:block">Oturumu Kapat</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full z-10">
         {/* Top Header */}
         <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-black/20 backdrop-blur-3xl z-30">
            <div className="flex items-center gap-4 flex-1">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="md:hidden text-zinc-400"
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               >
                 <Menu className="h-6 w-6" />
               </Button>
               
               <div className="flex-1 max-w-xl">
                  <div className="relative group">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                     <Input 
                       placeholder="İçerik ara..." 
                       className="bg-zinc-900/40 border-zinc-800/50 pl-10 h-10 md:h-11 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 ml-4">
                <div className="hidden sm:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewMode('grid')}
                    className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setViewMode('list')}
                    className={`h-8 w-8 ${viewMode === 'list' ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <div className="md:hidden h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-bold">
                    {authData.user_info.username.charAt(0).toUpperCase()}
                </div>
            </div>
         </header>

         {/* Grid Body */}
         <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {activeTab === 'settings' ? (
              <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-8">
                  <header>
                    <h2 className="text-4xl font-black tracking-tight text-white mb-2">Ayarlar</h2>
                    <p className="text-zinc-500 font-medium">Uygulama tercihlerini ve ebeveyn denetimlerini buradan yönetebilirsiniz.</p>
                  </header>

                  <section className="space-y-6">
                    <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-orange-600/20 text-orange-500 rounded-[1.5rem] shadow-inner border border-white/5">
                             <ShieldCheck className="h-8 w-8" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black tracking-tight text-white">Ebeveyn Denetimi</h3>
                            <p className="text-zinc-500 font-medium mt-1">Özel kategorileri 4 haneli bir PIN ile koruma altına alın.</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            setTempPin('');
                            setShowPinSetup(true);
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl h-12 px-8 font-black transition-all hover:scale-105 active:scale-95"
                        >
                          {pin ? 'PIN Değiştir' : 'PIN Oluştur'}
                        </Button>
                      </div>

                      {pin && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 pb-4 border-b border-white/5">
                             <Lock className="h-3.5 w-3.5" />
                             <span>Kilitli Kategoriler</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             {categories.map(cat => (
                               <div key={cat.category_id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/5 border border-white/5 group hover:bg-white/10 transition-all hover:border-orange-500/30">
                                 <span className="text-sm font-black truncate pr-4 text-zinc-100">{cat.category_name}</span>
                                 <button 
                                   onClick={() => toggleCategoryLock(cat.category_id)}
                                   className={`p-3 rounded-xl transition-all ${lockedCategories.includes(cat.category_id) ? 'bg-orange-600 text-white shadow-[0_8px_15px_rgba(234,88,12,0.3)]' : 'text-zinc-600 hover:text-white bg-zinc-900/60'}`}
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
            <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/5 flex flex-col bg-white/5 backdrop-blur-3xl h-[80px] md:h-full overflow-hidden shrink-0">
               <div className="px-6 py-5 flex items-center justify-between border-b border-white/5 hidden md:flex">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Kategoriler</div>
                  <div className="flex gap-1.5">
                     <div className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
                     <div className="h-1.5 w-1.5 rounded-full bg-orange-600/30" />
                  </div>
               </div>
               <ScrollArea className="flex-1">
                  <div className="p-4 flex md:block overflow-x-auto md:overflow-x-visible items-center gap-3 md:space-y-2 h-full">
                     {isLoading && categories.length === 0 ? (
                        Array(12).fill(0).map((_, i) => (
                           <div key={i} className="px-4 py-3">
                              <Skeleton className="h-4 w-full bg-white/5 rounded-lg" />
                           </div>
                        ))
                     ) : (
                        categories.map((cat) => (
                          <button
                            key={cat.category_id}
                            onClick={() => onCategoryClick(cat.category_id)}
                            className={`whitespace-nowrap md:whitespace-normal px-5 md:px-5 py-4 md:py-4 rounded-2xl text-xs md:text-sm transition-all flex items-center justify-between group flex-shrink-0 relative overflow-hidden ${selectedCategory === cat.category_id ? 'text-white font-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                          >
                           <span className="relative z-10 truncate tracking-tight">{cat.category_name}</span>
                           <div className="flex items-center gap-2 relative z-10 ml-3">
                              {lockedCategories.includes(cat.category_id) && <Lock className={`h-4 w-4 ${selectedCategory === cat.category_id ? 'text-white' : 'text-orange-600'}`} />}
                              <ChevronRight className={`hidden md:block h-4 w-4 transition-all duration-300 ${selectedCategory === cat.category_id ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 group-hover:opacity-100'}`} />
                           </div>
                           {selectedCategory === cat.category_id && (
                              <motion.div layoutId="activeCat" className="absolute inset-0 bg-orange-600 z-0 shadow-lg shadow-orange-600/30" />
                           )}
                          </button>
                        ))
                     )}
                  </div>
               </ScrollArea>
            </aside>

            {/* Stream Grid Section */}
            <div className="flex-1 bg-black/10 relative flex flex-col min-w-0">
               <ScrollArea className="flex-1">
                  <div className={`p-4 md:p-10 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 md:gap-10' : 'mx-auto max-w-5xl space-y-4'}`}>
                     {isLoading && streams.length === 0 ? (
                       Array(12).fill(0).map((_, i) => (
                         <div key={i} className={viewMode === 'grid' ? "" : "w-full"}>
                            <Skeleton className={`${viewMode === 'grid' ? 'aspect-video w-full' : 'h-16 w-full'} rounded-2xl bg-white/5 border border-white/5`} />
                         </div>
                       ))
                     ) : (
                       paginatedStreams.map((stream) => (
                         <StreamItem 
                            key={(stream as any).stream_id || (stream as any).series_id} 
                            stream={stream} 
                            viewMode={viewMode} 
                            onClick={handleStreamClick} 
                         />
                       ))
                     )}
                     
                     {filteredStreams.length > displayLimit && (
                       <div className="col-span-full flex justify-center py-20 pb-32">
                         <div className="relative group">
                           <div className="absolute inset-x-0 inset-y-0 bg-orange-600 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                           <Button 
                             onClick={() => setDisplayLimit(prev => prev + 48)}
                             className="relative bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-[2rem] px-14 h-16 font-black tracking-tight backdrop-blur-3xl transition-all shadow-2xl hover:scale-105 active:scale-95"
                           >
                             Daha Fazla İçerik <span className="text-orange-500 ml-3">({filteredStreams.length - displayLimit} içerik kaldı)</span>
                           </Button>
                         </div>
                       </div>
                     )}
                  </div>
               </ScrollArea>
               {isMobileMenuOpen && (
                 <div 
                   className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" 
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
                  url={currentStream.url} 
                  title={currentStream.title} 
                  onClose={() => setCurrentStream(null)} 
                />
              </motion.div>
            )}
         </AnimatePresence>
          {/* Dialogs for PIN */}
          <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ebeveyn PIN Kodu Oluştur</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Kilitli kategorilere erişmek için 4 haneli bir PIN kodu belirleyin.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Label htmlFor="pin" className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 block">4 Haneli PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  maxLength={4}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                  className="bg-zinc-950 border-zinc-800 text-2xl tracking-[1em] text-center h-14"
                  placeholder="0000"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleSavePin} className="w-full bg-orange-600 hover:bg-orange-700">PIN Kodunu Kaydet</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showPinVerify} onOpenChange={setShowPinVerify}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>PIN Kodunu Girin</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Bu içerik korunmaktadır. Devam etmek için lütfen PIN kodunuzu girin.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Label htmlFor="verify-pin" className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 block">4 Haneli PIN</Label>
                <Input
                  id="verify-pin"
                  type="password"
                  maxLength={4}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                  className="bg-zinc-950 border-zinc-800 text-2xl tracking-[1em] text-center h-14"
                  placeholder="0000"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button onClick={handleVerifyPin} className="w-full bg-orange-600 hover:bg-orange-700">Kilidi Aç</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </main>
    </div>
  );
};
