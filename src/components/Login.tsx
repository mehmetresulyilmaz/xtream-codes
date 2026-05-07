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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-2xl mb-4 border border-orange-500/20 shadow-lg shadow-orange-500/5">
            <Tv className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">XStream Pro</h1>
          <p className="text-zinc-400 text-sm">Advanced IPTV Experience</p>
        </div>

        <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-2xl shadow-2xl border-t-zinc-700/30">
          <CardHeader className="pb-4">
            <div className="flex p-1 bg-zinc-950 rounded-lg mb-6 border border-zinc-800/50">
              <button
                onClick={() => setLoginMode('xtream')}
                className={`flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all ${loginMode === 'xtream' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Xtream Login
              </button>
              <button
                onClick={() => setLoginMode('url')}
                className={`flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all ${loginMode === 'url' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                M3U / URL Login
              </button>
            </div>
            <CardTitle className="text-xl text-white">
              {loginMode === 'xtream' ? 'Account Details' : 'Login via URL'}
            </CardTitle>
            <CardDescription className="text-zinc-500">
              {loginMode === 'xtream' 
                ? 'Enter the panel details provided to you.' 
                : 'Paste the M3U link or full URL here.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {loginMode === 'xtream' ? 'Server Address (URL)' : 'M3U / Full URL'}
                </Label>
                <div className="relative group">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-zinc-900 border border-zinc-800 group-focus-within:border-orange-500/50 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                   </div>
                   <Input
                    id="url"
                    type="url"
                    placeholder={loginMode === 'xtream' ? "http://server.com:8080" : "http://server.com/get.php?username=..."}
                    required
                    value={creds.url}
                    onChange={(e) => setCreds({ ...creds, url: e.target.value })}
                    className="bg-zinc-950/50 border-zinc-800 text-white pl-12 h-12 focus:border-orange-500/50 focus:ring-orange-500/10 transition-all"
                  />
                </div>
              </div>

              {loginMode === 'xtream' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Username</Label>
                    <div className="relative group">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                       <Input
                        id="username"
                        type="text"
                        placeholder="Optional"
                        value={creds.username}
                        onChange={(e) => setCreds({ ...creds, username: e.target.value })}
                        className="bg-zinc-950/50 border-zinc-800 text-white pl-10 h-11 focus:border-orange-500/50 focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password</Label>
                    <div className="relative group">
                       <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                       <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={creds.password}
                        onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                        className="bg-zinc-950/50 border-zinc-800 text-white pl-10 h-11 focus:border-orange-500/50 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3"
                >
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </motion.div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-7 rounded-2xl transition-all shadow-xl shadow-orange-600/20 hover:shadow-orange-600/40 active:scale-[0.98] group overflow-hidden relative"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 relative z-10 transition-transform group-hover:translate-x-1">
                    <Zap className="h-5 w-5 fill-current text-white" />
                    <span>Get Content</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1 w-full bg-white/10 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
           {[
             { icon: <Shield className="h-5 w-5" />, text: "Secure" },
             { icon: <Zap className="h-5 w-5" />, text: "Fast" },
             { icon: <Lock className="h-5 w-5" />, text: "Protected" }
           ].map((item, idx) => (
             <motion.div 
                key={idx} 
                whileHover={{ y: -3 }}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm shadow-sm"
             >
                <div className="text-orange-500 bg-orange-500/10 p-2 rounded-xl border border-orange-500/10">{item.icon}</div>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{item.text}</span>
             </motion.div>
           ))}
        </div>
      </motion.div>
    </div>
  );
};
