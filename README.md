# XStream Pro - Web Player

XStream Pro, Xtream Codes API kullanan modern, güvenli ve performans odaklı bir IPTV web oynatıcısıdır. Kullanıcı verilerini korumak için tasarlanmış özel bir proxy katmanı ve oturum bazlı depolama mimarisi ile donatılmıştır.

## 🚀 Özellikler

- **Gelişmiş Oynatıcı:** Hls.js tabanlı, düşük gecikmeli canlı yayın ve VOD oynatımı.
- **Kategorize İçerik:** Canlı TV, Filmler ve Diziler için ayrı sekmeler ve kategori filtreleri.
- **Güvenli Proxy:** Sunucu taraflı proxy sistemi sayesinde CORS hatalarını aşar ve istemci IP adresini doğrudan IPTV sunucusuna maruz bırakmaz.
- **Karanlık Mod UI:** Shadcn/UI ve Tailwind CSS ile hazırlanan göz yormayan, premium arayüz.
- **Duyarlı Tasarım:** Mobil, tablet ve masaüstü cihazlar için tam uyumluluk.

## 🛡️ Güvenlik Önlemleri

Bu uygulama "Security-First" (Önce Güvenlik) prensibiyle geliştirilmiştir:

1.  **Kalıcı Kayıt Yok:** Kullanıcı adı ve şifre asla veritabanına veya `localStorage`'a kaydedilmez. Bilgiler sadece `sessionStorage` (oturum bazlı) içinde tutulur; tarayıcı sekmesi kapatıldığında veriler silinir.
2.  **SSRF ve Brute Force Koruması:** Sunucu tarafında `express-rate-limit` ile istek sınırlandırması ve `helmet` ile güvenlik başlıkları (CSP, Clickjacking koruması) eklenmiştir.
3.  **Log Güvenliği:** Proxy hatalarında hassas bilgiler (URL parametreleri) loglara düşmeyecek şekilde filtrelenir.
4.  **CORS İzolasyonu:** Vercel ve Express üzerinde yapılandırılan API re-write'ları sayesinde güvenli veri akışı sağlanır.

## 🛠️ Teknolojiler

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS.
- **UI Bileşenleri:** Shadcn/UI, Lucide Icon.
- **Animasyon:** Framer Motion (Motion/React).
- **Backend/Proxy:** Express.js (Node.js), Axios.
- **Dağıtım:** Vercel (Ready), Cloud Run / Docker.

## 💻 Kurulum (Local)

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/kullaniciadi/xstream-pro.git
   ```
2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
4. Tarayıcıda `http://localhost:3000` adresini açın.

## ☁️ Dağıtım (Vercel)

Bu proje Vercel ile tam uyumludur:
- `/api/proxy.ts` dosyası Vercel Serverless Function olarak çalışır.
- `vercel.json` otomatik yönlendirmeleri (rewrite) sağlar.
- Sadece `git push` yaparak veya Vercel panelinden bağlayarak yayına alabilirsiniz.

## ⚠️ Yasal Uyarı

Bu uygulama sadece bir oynatıcı arayüzüdür ve herhangi bir kanal listesi, içerik veya abonelik sağlamaz. Kullanıcılar kendi yasal IPTV servis bilgilerini kullanmakla yükümlüdür. Telif hakkı içeren içeriklerin izinsiz paylaşımı veya izlenmesi ile ilgili sorumluluk kullanıcıya aittir.

---
*Geliştiren: Google AI Studio Build Agent*
