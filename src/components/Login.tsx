import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shield, Tv, Zap, ExternalLink, Lock } from 'lucide-react';
import { XtreamCredentials } from '@/types';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (creds: XtreamCredentials) => void;
  isLoading: boolean;
  error?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [creds, setCreds] = useState<XtreamCredentials>({
    url: '',
    username: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (creds.url && creds.username && creds.password) {
      onLogin(creds);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-2xl mb-4 border border-orange-500/20">
            <Tv className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">XStream Pro</h1>
          <p className="text-zinc-400 mt-2">Güvenli Xtream Codes Web Oynatıcı</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Giriş Yap</CardTitle>
            <CardDescription className="text-zinc-500">
              Panel bilgilerini girerek yayınları izlemeye başla.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-zinc-400">Sunucu Adresi (URL)</Label>
                <div className="relative">
                   <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                   <Input
                    id="url"
                    type="url"
                    placeholder="http://example.com:8080"
                    required
                    value={creds.url}
                    onChange={(e) => setCreds({ ...creds, url: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-white pl-10 focus:border-orange-500/50 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-400">Kullanıcı Adı</Label>
                <div className="relative">
                   <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                   <Input
                    id="username"
                    type="text"
                    placeholder="Username"
                    required
                    value={creds.username}
                    onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-white pl-10 focus:border-orange-500/50 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-400">Şifre</Label>
                <div className="relative">
                   <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                   <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={creds.password}
                    onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-white pl-10 focus:border-orange-500/50 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6 rounded-xl transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Bağlanılıyor...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 fill-current" />
                    Oturum Aç
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 grid grid-cols-3 gap-4">
           {[
             { icon: <Shield className="h-4 w-4" />, text: "Güvenli" },
             { icon: <Zap className="h-4 w-4" />, text: "Hızlı" },
             { icon: <Lock className="h-4 w-4" />, text: "Gizli" }
           ].map((item, idx) => (
             <div key={idx} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="text-orange-500">{item.icon}</div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{item.text}</span>
             </div>
           ))}
        </div>
      </motion.div>
    </div>
  );
};
