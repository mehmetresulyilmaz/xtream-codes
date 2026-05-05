import { useState, useEffect } from 'react';
import { XtreamClient } from '@/lib/xtream';
import { XtreamAuthResponse, XtreamCredentials } from '@/types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState<XtreamAuthResponse | null>(null);
  const [client, setClient] = useState<XtreamClient | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const saved = sessionStorage.getItem('xtream_creds');
    if (saved) {
      try {
        const decoded = JSON.parse(saved);
        handleLogin(decoded);
      } catch (e) {
        console.error('Failed to load saved credentials');
      }
    }
  }, []);

  const handleLogin = async (creds: XtreamCredentials) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const newClient = new XtreamClient(creds);
      const auth = await newClient.authenticate();
      
      // Xtream Codes API returns user_info only if auth succeeds
      if (auth.user_info && (auth.user_info.status === 'Active' || auth.user_info.status === 'active' || auth.user_info.status === 'Trial')) {
        setClient(newClient);
        setAuthData(auth);
        sessionStorage.setItem('xtream_creds', JSON.stringify(creds));
        toast.success('Başarıyla giriş yapıldı');
      } else {
        setError(`Üyelik durumu kısıtlı veya pasif: ${auth.user_info?.status || 'Bilinmiyor'}`);
        toast.error('Giriş başarısız');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Bağlantı hatası. Lütfen URL ve bilgileri kontrol edin.');
      toast.error('Sunucuya bağlanılamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthData(null);
    setClient(null);
    sessionStorage.removeItem('xtream_creds');
  };

  return (
    <div className="min-h-screen bg-black font-sans antialiased text-zinc-100 overflow-hidden">
      {!authData || !client ? (
        <Login onLogin={handleLogin} isLoading={isLoading} error={error} />
      ) : (
        <Dashboard client={client} authData={authData} onLogout={handleLogout} />
      )}
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}
