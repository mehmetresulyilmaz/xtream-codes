import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { Maximize, Minimize, Volume2, VolumeX, Play, Pause, Settings, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  url: string;
  title?: string;
  epgInfo?: any;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, epgInfo, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const [showReload, setShowReload] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && !error) setShowReload(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading, error]);

  useEffect(() => {
    let hls: Hls | null = null;
    let mpegtsPlayer: any = null;
    const video = videoRef.current;
    
    setIsLoading(true);
    setError(null);
    setShowReload(false);

    const isSecureConnection = window.location.protocol === 'https:';
    const isTargetInsecure = url.startsWith('http:');
    
    // Auto-proxy if mixed content would be blocked or if proxy was manually/error requested
    const shouldProxy = useProxy || (isSecureConnection && isTargetInsecure);

    const streamUrl = shouldProxy 
      ? `/api/proxy?stream=true&targetUrl=${encodeURIComponent(url)}`
      : url;

    const isHls = url.includes('.m3u8') || url.includes('type=m3u8');
    const isTs = url.includes('.ts') || url.includes('type=ts') || (!url.includes('.m3u8') && !url.includes('.mp4'));

    if (video) {
        video.onplay = () => setIsLoading(false);
        video.onplaying = () => setIsLoading(false);
        
        if (isHls && Hls.isSupported()) {
          setPlayerType('hls');
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            }
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            video.play().catch(e => console.log('Autoplay blocked', e));
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !useProxy) {
                console.log('HLS Network error, retrying with proxy...');
                setUseProxy(true);
              } else {
                handleFatalError('hls', data);
              }
            }
          });
        } else if (isTs && mpegts.getFeatureList().mseLivePlayback) {
          setPlayerType('mpegts');
          mpegtsPlayer = mpegts.createPlayer({
            type: 'mse', // or 'mpegts'
            isLive: true,
            url: streamUrl,
            cors: true
          }, {
            enableWorker: true,
            enableStashBuffer: false,
            stashInitialSize: 128
          });
          mpegtsPlayer.attachMediaElement(video);
          mpegtsPlayer.load();
          mpegtsPlayer.play().catch((e: any) => console.log('mpegts autoplay blocked', e));
          
          mpegtsPlayer.on(mpegts.Events.ERROR, (p1: any, p2: any) => {
             console.error('mpegts error', p1, p2);
             if (!useProxy) {
               setUseProxy(true);
             } else {
               setError('Yayın formatı desteklenmiyor veya sunucu bağlantısı kesildi.');
               setIsLoading(false);
             }
          });

          mpegtsPlayer.on(mpegts.Events.LOADING_COMPLETE, () => setIsLoading(false));
          mpegtsPlayer.on(mpegts.Events.METADATA_ARRIVED, () => setIsLoading(false));
          
          // Fallback if metadata takes too long
          setTimeout(() => {
            if (isLoading) setIsLoading(false);
          }, 5000);

        } else {
          setPlayerType('native');
          video.src = streamUrl;
          video.onloadeddata = () => setIsLoading(false);
          video.onerror = () => {
            if (!useProxy) {
              setUseProxy(true);
            } else {
              setError('Bu yayın formatı tarayıcınızda desteklenmiyor.');
              setIsLoading(false);
            }
          };
          video.play().catch(e => console.log('Native autoplay blocked', e));
        }
    }

    function handleFatalError(type: string, data: any) {
      console.error(`Fatal ${type} error:`, data);
      switch (data.type || data) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls?.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls?.recoverMediaError();
          break;
        default:
          setError('Yayın yüklenirken bir hata oluştu. Sunucu bağlantısı kesilmiş olabilir.');
          setIsLoading(false);
          hls?.destroy();
          break;
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (mpegtsPlayer) {
        mpegtsPlayer.destroy();
      }
    };
  }, [url, useProxy]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const safeDecode = (str: string) => {
    try { return atob(str || ''); } catch (e) { return str || ''; }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center group overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video 
        ref={videoRef}
        className="w-full h-full max-h-screen"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading State */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 border-4 border-orange-600/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-orange-600 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="mt-6 text-orange-500 font-black tracking-[.25em] uppercase text-xs animate-pulse">Yayın Hazırlanıyor</p>
          {showReload && (
            <div className="mt-8 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] text-slate-400 font-bold max-w-[200px] text-center uppercase tracking-wider">Bağlantı beklenenden uzun sürüyor...</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUseProxy(!useProxy)} 
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl h-10 px-6 backdrop-blur-md"
              >
                <RefreshCw className="h-3 w-3 mr-2" /> {useProxy ? 'Normal Dene' : 'Proxy ile Dene'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-30 px-10 text-center">
          <div className="h-20 w-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100">
            <Settings className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Eyvallah, Bir Sorun Var!</h3>
          <p className="text-slate-500 max-w-md mb-8">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => setUseProxy(!useProxy)} className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl px-10 h-14 font-black shadow-xl shadow-orange-600/20">
              {useProxy ? 'Normal Bağlantı Dene' : 'Proxy ile Yeniden Dene'}
            </Button>
            <Button variant="outline" onClick={onClose} className="border-slate-200 text-slate-600 rounded-2xl px-10 h-14 font-black shadow-sm">
              Geri Dön
            </Button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className={`absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-white via-white/80 to-transparent transition-opacity duration-500 z-10 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-center text-slate-800">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-slate-100 text-slate-800 rounded-full bg-white shadow-sm border border-slate-100">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
            <div>
              <h2 className="text-2xl font-black tracking-tighter truncate max-w-[300px] md:max-w-[600px] leading-tight text-slate-900">{title || 'Canlı Yayın'}</h2>
              {epgInfo && (
                <div className="mt-1 flex items-center gap-3">
                   <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded shadow-sm">
                     ŞİMDİ: {safeDecode(epgInfo.title)}
                   </span>
                   {epgInfo.start && (
                     <span className="text-[9px] font-bold text-slate-400">
                       {new Date(epgInfo.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                   )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sunucuya Bağlandı</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-white via-white/80 to-transparent transition-all duration-500 z-10 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="flex items-center gap-8 text-slate-800 max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={togglePlay} className="hover:bg-orange-50 text-orange-600 h-16 w-16 rounded-[1.5rem] bg-white border border-slate-200 shadow-xl group">
            {isPlaying ? (
              <Pause className="h-8 w-8 fill-current group-hover:scale-110 transition-transform" />
            ) : (
              <Play className="h-8 w-8 fill-current ml-1 group-hover:scale-110 transition-transform" />
            )}
          </Button>

          <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-[1.5rem] group/vol shadow-lg">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="hover:bg-slate-100 text-slate-600">
              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" /> }
            </Button>
            <Slider 
               value={[isMuted ? 0 : volume]} 
               max={1} 
               step={0.01} 
               onValueChange={handleVolumeChange}
               className="w-32 cursor-pointer"
            />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 text-slate-600 bg-white h-12 w-12 rounded-2xl border border-slate-200">
              <Settings className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hover:bg-slate-100 text-slate-600 bg-white h-12 w-12 rounded-2xl border border-slate-200">
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" /> }
            </Button>
          </div>
        </div>
      </div>

      {/* Center Play/Pause Indicator (briefly visible on state change) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
            <Play className="h-12 w-12 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
};
