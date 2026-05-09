import { useState, useEffect } from 'react';
import { XtreamClient } from '@/lib/xtream';
import { XtreamAuthResponse, XtreamCredentials } from '@/types';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';
import { Toaster } from '@/components/ui/sonner';
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
      
      if (!auth) {
        throw new Error('Sunucudan boş yanıt döndü');
      }

      // Some providers return failed status in a different way or have no user_info on failure
      if (auth.user_info && (auth.user_info.status === 'Active' || auth.user_info.status === 'active' || auth.user_info.status === 'Trial')) {
        setClient(newClient);
        setAuthData(auth);
        sessionStorage.setItem('xtream_creds', JSON.stringify(creds));
        toast.success('Başarıyla giriş yapıldı');
      } else {
        const status = auth.user_info?.status || 'Geçersiz';
        setError(`Giriş Başarısız: Üyelik durumu ${status}`);
        toast.error('Oturum açılamadı');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Bağlantı hatası. Lütfen URL ve bilgileri kontrol edin.';
      
      if (err.message === 'Network Error') {
        message = 'Sunucuya erişilemiyor veya ağ bağlantısı koptu. Lütfen daha sonra tekrar deneyin.';
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        message = 'İstemci tarafında zaman aşımı (İnternet bağlantınızı kontrol edin).';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.response?.status === 404) {
        message = 'Sunucu adresi veya API yolu bulunamadı (404).';
      } else if (err.response?.status === 504) {
        message = 'Sağlayıcı zaman aşımına uğradı (Sunucu çok yavaş).';
      } else if (err.response?.status === 502) {
        message = 'Sağlayıcıya erişilemiyor (Bağlantı reddedildi veya IP engelli).';
      }
      
      setError(message);
      toast.error('Bağlantı başarısız');
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
