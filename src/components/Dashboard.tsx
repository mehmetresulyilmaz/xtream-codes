import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Play, Tv2, Film, Library, User, LogOut, ChevronRight, LayoutGrid, List, Menu } from 'lucide-react';
import { XtreamClient } from '@/lib/xtream';
import { XtreamAuthResponse, Category, Stream, Movie, Series } from '@/types';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface DashboardProps {
  client: XtreamClient;
  authData: XtreamAuthResponse;
  onLogout: () => void;
}

type TabType = 'live' | 'movie' | 'series';

const StreamItem = ({ stream, viewMode, onClick }: { stream: any, viewMode: 'grid' | 'list', onClick: (s: any) => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -4 }}
    className="cursor-pointer"
    onClick={() => onClick(stream)}
  >
    {viewMode === 'grid' ? (
      <div className="aspect-video relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group shadow-lg">
        <img 
          src={stream.stream_icon || stream.cover || 'https://via.placeholder.com/400x225?text=No+Image'} 
          alt={stream.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
          onError={(e) => {
            (e.target as any).src = 'https://via.placeholder.com/400x225?text=No+Image';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="p-3 bg-orange-600 rounded-full shadow-lg shadow-orange-600/40">
              <Play className="h-6 w-6 fill-current text-white" />
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-sm border-t border-white/5">
            <p className="text-xs font-bold truncate">{stream.name}</p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-4 p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group">
          <div className="h-12 w-20 rounded-lg overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-800/50">
            <img 
              src={stream.stream_icon || stream.cover || 'https://via.placeholder.com/80x45?text=...'} 
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => (e.target as any).src = 'https://via.placeholder.com/80x45?text=...'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate group-hover:text-orange-500 transition-colors">{stream.name}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{stream.stream_type || 'Stream'}</p>
          </div>
          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white rounded-full h-8 w-8">
            <Play className="h-3 h-3 fill-current" />
          </Button>
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

  useEffect(() => {
    loadCategories(activeTab);
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
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStreams = async (type: TabType, catId?: string) => {
    setIsLoading(true);
    try {
      let data: (Stream | Movie | Series)[] = [];
      if (type === 'live') data = await client.getLiveStreams(catId);
      else if (type === 'movie') data = await client.getVodStreams(catId);
      else if (type === 'series') data = await client.getSeries(catId);
      setStreams(data);
    } catch (err) {
      toast.error('Yayınlar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStreams = streams.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStreamClick = (stream: any) => {
    const streamId = stream.stream_id || stream.series_id;
    const type = activeTab;
    const ext = stream.container_extension || 'm3u8';
    const url = client.getStreamUrl(streamId, type, ext);
    setCurrentStream({ url, title: stream.name });
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-20 md:w-64 border-r border-zinc-800 flex flex-col bg-black/90 backdrop-blur-md transition-transform md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 hidden md:block">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600 rounded-lg shadow-lg shadow-orange-600/20">
                 <Tv2 className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tighter">XStream</h1>
           </div>
        </div>
        <div className="p-4 md:hidden flex justify-center mt-4">
           <Tv2 className="h-8 w-8 text-orange-600" />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
           {[
             { id: 'live', icon: <Tv2 className="h-5 w-5" />, label: 'Canlı TV' },
             { id: 'movie', icon: <Film className="h-5 w-5" />, label: 'Film' },
             { id: 'series', icon: <Library className="h-5 w-5" />, label: 'Dizi' }
           ].map((item) => (
             <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSelectedCategory(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
             >
                {item.icon}
                <span className="hidden md:block font-medium">{item.label}</span>
             </button>
           ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
           <div className="hidden md:block mb-4 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-6 w-6 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-bold">
                    {authData.user_info.username.charAt(0).toUpperCase()}
                 </div>
                 <span className="text-xs font-bold text-zinc-300 truncate">{authData.user_info.username}</span>
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                 {authData.user_info.status}
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm"
           >
              <LogOut className="h-5 w-5" />
              <span className="hidden md:block">Çıkış</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
         {/* Top Header */}
         <header className="h-16 md:h-20 border-b border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-black/30 backdrop-blur-xl z-30">
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
                       placeholder="Ara..." 
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
            {/* Categories Rail */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col bg-zinc-950/20 max-h-[150px] md:max-h-none overflow-hidden">
               <div className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hidden md:block">Kategoriler</div>
               <ScrollArea className="flex-1">
                  <div className="p-2 flex md:block overflow-x-auto md:overflow-x-visible space-x-2 md:space-x-0 md:space-y-1">
                     {isLoading && categories.length === 0 ? (
                        Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-32 md:w-full rounded-lg mb-1 bg-zinc-900/50" />)
                     ) : (
                        categories.map((cat) => (
                          <button
                            key={cat.category_id}
                            onClick={() => setSelectedCategory(cat.category_id)}
                            className={`whitespace-nowrap md:whitespace-normal px-4 md:px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm transition-all flex items-center justify-between group flex-shrink-0 ${selectedCategory === cat.category_id ? 'bg-orange-600/10 text-orange-500 font-bold border border-orange-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/30'}`}
                          >
                            <span className="truncate max-w-[120px] md:max-w-none">{cat.category_name}</span>
                            <ChevronRight className={`hidden md:block h-3.5 w-3.5 transition-transform ${selectedCategory === cat.category_id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-50'}`} />
                          </button>
                        ))
                     )}
                  </div>
               </ScrollArea>
            </aside>

            {/* Stream Grid */}
            <div className="flex-1 bg-zinc-950/40 relative">
               <ScrollArea className="h-full">
                  <div className={`p-4 md:p-8 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-6' : 'space-y-2'}`}>
                     {isLoading && streams.length === 0 ? (
                       Array(12).fill(0).map((_, i) => (
                         <div key={i} className={viewMode === 'grid' ? "" : "w-full"}>
                            <Skeleton className={`${viewMode === 'grid' ? 'aspect-video w-full' : 'h-16 w-full'} rounded-xl bg-zinc-900/50`} />
                         </div>
                       ))
                     ) : (
                       filteredStreams.map((stream) => (
                         <StreamItem 
                            key={(stream as any).stream_id || (stream as any).series_id} 
                            stream={stream} 
                            viewMode={viewMode} 
                            onClick={handleStreamClick} 
                         />
                       ))
                     )}
                  </div>
               </ScrollArea>

               {/* Mobile Overlay for Sidebar */}
               {isMobileMenuOpen && (
                 <div 
                   className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" 
                   onClick={() => setIsMobileMenuOpen(false)}
                 />
               )}
            </div>
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
      </main>
    </div>
  );
};
