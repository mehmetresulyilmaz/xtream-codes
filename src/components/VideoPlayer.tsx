import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize, Minimize, Volume2, VolumeX, Play, Pause, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;
    setIsLoading(true);
    setError(null);

    if (video) {
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
          });
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false);
            video.play().catch(e => console.log('Autoplay blocked', e));
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls?.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls?.recoverMediaError();
                  break;
                default:
                  setError('Yayın yüklenirken bir hata oluştu.');
                  setIsLoading(false);
                  hls?.destroy();
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            video.play().catch(e => console.log('Autoplay blocked', e));
          });
          video.addEventListener('error', () => {
            setError('Tarayıcınız bu yayın formatını desteklemiyor.');
            setIsLoading(false);
          });
        }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

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
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-30 px-10 text-center">
          <div className="h-20 w-20 bg-red-600/20 rounded-3xl flex items-center justify-center mb-6 border border-red-600/30">
            <Settings className="h-10 w-10 text-red-500 animate-spin-slow" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Eyvallah, Bir Sorun Var!</h3>
          <p className="text-zinc-500 max-w-md mb-8">{error}</p>
          <Button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl px-8 h-12 font-black border border-white/5">
            Geri Dön
          </Button>
        </div>
      )}

      {/* Header Info */}
      <div className={`absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black via-black/40 to-transparent transition-opacity duration-500 z-10 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 text-white rounded-full bg-white/5 border border-white/5">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
            <div>
              <h2 className="text-2xl font-black tracking-tighter truncate max-w-[300px] md:max-w-[600px] leading-tight">{title || 'Canlı Yayın'}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-orange-600 animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Canlı Bağlantı Kuruldu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black via-black/60 to-transparent transition-all duration-500 z-10 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="flex items-center gap-8 text-white max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={togglePlay} className="hover:bg-white/10 text-white h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl group">
            {isPlaying ? (
              <Pause className="h-8 w-8 fill-current group-hover:scale-110 transition-transform" />
            ) : (
              <Play className="h-8 w-8 fill-current ml-1 group-hover:scale-110 transition-transform" />
            )}
          </Button>

          <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-[1.5rem] backdrop-blur-xl group/vol shadow-xl">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="hover:bg-white/10 text-white">
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
            <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white bg-white/5 h-12 w-12 rounded-2xl border border-white/5 backdrop-blur-md">
              <Settings className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hover:bg-white/10 text-white bg-white/5 h-12 w-12 rounded-2xl border border-white/5 backdrop-blur-md">
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
