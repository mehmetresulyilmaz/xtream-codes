import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Search, Play, Tv2, Film, Library, User, LogOut, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { XtreamClient } from '@/lib/xtream';
import { XtreamAuthResponse, Category, Stream, Movie, Series } from '@/types';
import { Button } from './ui/button';
import { VideoPlayer } from './VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';

interface DashboardProps {
  client: XtreamClient;
  authData: XtreamAuthResponse;
  onLogout: () => void;
}

type TabType = 'live' | 'vod' | 'series';

export const Dashboard: React.FC<DashboardProps> = ({ client, authData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [streams, setStreams] = useState<(Stream | Movie | Series)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStream, setCurrentStream] = useState<{ url: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      else if (type === 'vod') cats = await client.getVodCategories();
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
      else if (type === 'vod') data = await client.getVodStreams(catId);
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
      <aside className="w-20 md:w-64 border-r border-zinc-800 flex flex-col z-20 bg-black/50 backdrop-blur-md">
        <div className="p-6 hidden md:block">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                 <Tv2 className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold">XStream</h1>
           </div>
        </div>
        <div className="p-4 md:hidden flex justify-center">
           <Tv2 className="h-8 w-8 text-orange-600" />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
           {[
             { id: 'live', icon: <Tv2 className="h-5 w-5" />, label: 'Canlı TV' },
             { id: 'vod', icon: <Film className="h-5 w-5" />, label: 'Film' },
             { id: 'series', icon: <Library className="h-5 w-5" />, label: 'Dizi' }
           ].map((item) => (
             <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setSelectedCategory(null);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
             >
                {item.icon}
                <span className="hidden md:block font-medium">{item.label}</span>
             </button>
           ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
           <div className="hidden md:block mb-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                 <User className="h-4 w-4 text-zinc-500" />
                 <span className="text-xs font-bold text-zinc-400 truncate">{authData.user_info.username}</span>
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                 Üyelik: {authData.user_info.status}
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-medium"
           >
              <LogOut className="h-5 w-5" />
              <span className="hidden md:block">Çıkış Yap</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
         {/* Top Header */}
         <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-black/30 backdrop-blur-md z-10">
            <div className="flex-1 max-w-xl">
               <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input 
                    placeholder="Kanal veya film ara..." 
                    className="bg-zinc-900/50 border-zinc-800 pl-10 focus:border-orange-500/50 focus:ring-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'text-orange-500' : 'text-zinc-500'}
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'text-orange-500' : 'text-zinc-500'}
                >
                  <List className="h-5 w-5" />
                </Button>
            </div>
         </header>

         {/* Grid Body */}
         <div className="flex-1 flex overflow-hidden">
            {/* Categories Rail */}
            <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950/20">
               <div className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Kategoriler</div>
               <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                     {isLoading && categories.length === 0 ? (
                        Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg mb-1 bg-zinc-900" />)
                     ) : (
                        categories.map((cat) => (
                          <button
                            key={cat.category_id}
                            onClick={() => setSelectedCategory(cat.category_id)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${selectedCategory === cat.category_id ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                          >
                            <span className="truncate">{cat.category_name}</span>
                            <ChevronRight className={`h-4 w-4 transition-transform ${selectedCategory === cat.category_id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-50'}`} />
                          </button>
                        ))
                     )}
                  </div>
               </ScrollArea>
            </aside>

            {/* Stream Grid */}
            <div className="flex-1 bg-zinc-950/40">
               <ScrollArea className="h-full">
                  <div className={`p-8 ${viewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6' : 'space-y-2'}`}>
                     {isLoading && streams.length === 0 ? (
                       Array(12).fill(0).map((_, i) => (
                         <div key={i} className={viewMode === 'grid' ? "" : "w-full"}>
                            <Skeleton className={`${viewMode === 'grid' ? 'aspect-video w-full' : 'h-16 w-full'} rounded-xl bg-zinc-900`} />
                         </div>
                       ))
                     ) : (
                       filteredStreams.map((stream) => (
                        <motion.div
                          key={(stream as any).stream_id || (stream as any).series_id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -4 }}
                          className="cursor-pointer"
                          onClick={() => handleStreamClick(stream)}
                        >
                          {viewMode === 'grid' ? (
                            <div className="aspect-video relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group shadow-lg">
                              <img 
                                src={(stream as any).stream_icon || (stream as any).cover} 
                                alt={stream.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                onError={(e) => {
                                  (e.target as any).src = 'https://via.placeholder.com/400x225?text=No+Image';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <div className="p-3 bg-orange-600 rounded-full">
                                    <Play className="h-6 w-6 fill-current" />
                                 </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-sm">
                                 <p className="text-xs font-bold truncate">{stream.name}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 transition-all group">
                               <div className="h-12 w-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                                  <img 
                                    src={(stream as any).stream_icon || (stream as any).cover} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.target as any).src = 'https://via.placeholder.com/80x45?text=...'}
                                  />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate group-hover:text-orange-500 transition-colors">{stream.name}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{(stream as any).stream_type || 'Stream'}</p>
                               </div>
                               <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="h-4 w-4 fill-current" />
                               </Button>
                            </div>
                          )}
                        </motion.div>
                       ))
                     )}
                  </div>
               </ScrollArea>
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
