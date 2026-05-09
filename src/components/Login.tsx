import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Tv, Zap, ExternalLink, Lock, User } from 'lucide-react';
import { XtreamCredentials } from '@/types';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (creds: XtreamCredentials) => void;
  isLoading: boolean;
  error?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [loginMode, setLoginMode] = useState<'xtream' | 'url'>('xtream');
  const [creds, setCreds] = useState<XtreamCredentials>({
    url: '',
    username: '',
    password: '',
  });

  const parseFullUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const username = parsed.searchParams.get('username');
      const password = parsed.searchParams.get('password');
      if (username && password) {
        return {
          url: `${parsed.protocol}//${parsed.host}`,
          username: username,
          password: password
        };
      }
    } catch (e) {
      // Not a valid full URL with params, treat as base URL
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCreds = { ...creds };
    
    // Try to parse if it looks like a full URL
    const parsed = parseFullUrl(creds.url);
    if (parsed) {
      finalCreds = parsed;
    }

    if (finalCreds.url) {
      onLogin(finalCreds);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-4 relative overflow-hidden font-sans">
      {/* Atmosphere Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-orange-200/40 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-100/40 blur-[180px] rounded-full" />
        <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-orange-100/30 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 rounded-[2rem] mb-6 shadow-[0_12px_32px_rgba(234,88,12,0.2)] border border-white/40 group hover:rotate-6 transition-all duration-500">
            <Tv className="h-10 w-10 text-white drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter leading-none text-slate-800">LURA</h1>
          <span className="text-[10px] uppercase tracking-[0.4em] text-orange-600 font-black mt-2 block">PLAYER</span>
        </div>

        <Card className="bg-white/60 border-slate-200/60 backdrop-blur-3xl shadow-2xl rounded-[3rem] border-t-white overflow-hidden p-2">
          <CardHeader className="pb-4 pt-8 px-8">
            <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50 backdrop-blur-md">
              <button
                onClick={() => setLoginMode('xtream')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginMode === 'xtream' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Xtream Giriş
              </button>
              <button
                onClick={() => setLoginMode('url')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginMode === 'url' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                M3U / URL
              </button>
            </div>
            <CardTitle className="text-2xl font-black italic tracking-tight text-slate-800">
              {loginMode === 'xtream' ? 'Hesap Bilgileri' : 'URL İle Giriş'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              {loginMode === 'xtream' 
                ? 'Size iletilen panel bilgilerini giriniz.' 
                : 'M3U linkini veya tam URL\'yi buraya yapıştırın.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  {loginMode === 'xtream' ? 'Sunucu Adresi (URL)' : 'M3U / Tam URL'}
                </Label>
                <div className="relative group">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 group-focus-within:bg-orange-500 group-focus-within:text-white transition-all duration-300">
                      <ExternalLink className="h-4 w-4" />
                   </div>
                   <Input
                    id="url"
                    type="url"
                    placeholder={loginMode === 'xtream' ? "http://sunucuadresi.com:8080" : "http://sunucu.com/get.php?username=..."}
                    required
                    value={creds.url}
                    onChange={(e) => setCreds({ ...creds, url: e.target.value })}
                    className="bg-white/80 border-slate-200/60 text-slate-900 pl-16 h-16 rounded-[1.5rem] focus:bg-white focus:ring-orange-500/10 focus:border-orange-500/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              {loginMode === 'xtream' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kullanıcı Adı</Label>
                    <div className="relative group">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                       <Input
                        id="username"
                        type="text"
                        placeholder="Zorunlu"
                        value={creds.username}
                        onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                        className="bg-white/80 border-slate-200/60 text-slate-900 pl-14 h-14 rounded-2xl focus:bg-white focus:ring-orange-500/10 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Şifre</Label>
                    <div className="relative group">
                       <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                       <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={creds.password}
                        onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                        className="bg-white/80 border-slate-200/60 text-slate-900 pl-14 h-14 rounded-2xl focus:bg-white focus:ring-orange-500/10 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-4 shadow-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </CardContent>
            <CardFooter className="pt-4 pb-8 px-8">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-slate-900 h-16 hover:bg-slate-800 text-white font-black rounded-2xl transition-all shadow-2xl active:scale-[0.98] group relative overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Bağlanıyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 relative z-10 transition-transform group-hover:translate-x-1">
                    <Zap className="h-5 w-5 fill-current text-orange-500" />
                    <span className="uppercase tracking-widest text-sm">İçerikleri Getir</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1 w-full bg-orange-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-10 grid grid-cols-3 gap-4">
           {[
             { icon: <Shield className="h-5 w-5" />, text: "Güvenli" },
             { icon: <Zap className="h-5 w-5" />, text: "Hızlı" },
             { icon: <Tv className="h-5 w-5" />, text: "Ultra HD" }
           ].map((item, idx) => (
             <motion.div 
                key={idx} 
                whileHover={{ y: -5 }}
                className="flex flex-col items-center gap-3 p-5 rounded-[2rem] bg-white/40 border border-white/60 backdrop-blur-xl shadow-sm hover:shadow-md transition-all hover:border-orange-500/20"
             >
                <div className="text-orange-600 bg-orange-50 p-2.5 rounded-2xl border border-orange-100 shadow-sm">{item.icon}</div>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">{item.text}</span>
             </motion.div>
           ))}
        </div>
      </motion.div>
    </div>
  );
};
