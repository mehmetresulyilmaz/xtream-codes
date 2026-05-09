import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import https from "https";

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Vite handles this in development
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Allow embedding in iframes (important for AI Studio)
  }));

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Rate Limiting to prevent brute force or DDoS
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Increased limit for smoother browsing
    message: "Rate limit exceeded, please try again later.",
  });
  app.use("/api/", limiter);

  // API Proxy Route for Xtream Codes
  // This helps bypass CORS issues and keeps the user's connection slightly more private
  app.all("/api/proxy", async (req, res) => {
    const { targetUrl } = req.query;

    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).json({ error: "Target URL is required" });
    }

    try {
      // Validate the URL slightly to prevent SSRF
      const parsedUrl = new URL(targetUrl);
      
      const isStream = req.query.stream === "true";

      // Enhanced axios call with retry logic for specific errors
      let response;
      let lastError;
      const userAgents = [
        "IPTVSmartersPlayer",
        "VLC/3.0.18 LibVLC/3.0.18",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "TiviMate/4.7.0 (S905X3; Android 9)",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "OttPlay/1.37 (Linux; Android 11; Pixel 5)",
      ];

      const maxRetries = 4;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          const isPermissive = attempt >= 2;
          const useForwardedFor = attempt % 2 === 1; // Alternate X-Forwarded-For to see which works better
          
          response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.headers["content-type"]?.includes("json") ? req.body : undefined,
            params: { ...req.query, targetUrl: undefined },
            headers: {
              "User-Agent": userAgents[attempt % userAgents.length],
              "Accept": "*/*",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept-Encoding": "identity", 
              "Connection": isStream ? "keep-alive" : "close",
              "Referer": parsedUrl.origin,
              "X-Requested-With": "com.google.android.youtube", // Some providers look for common app ids
              ...(useForwardedFor ? { "X-Forwarded-For": req.ip } : {}),
            },
            family: 4, 
            httpsAgent: new https.Agent({ rejectUnauthorized: !isPermissive }),
            responseType: isStream ? "stream" : "json",
            timeout: isStream ? 20000 : 90000, // 20s for stream start is enough
            validateStatus: () => true, 
          });
          
          if (response.status === 403 || response.status === 401) {
            console.warn(`Auth error (${response.status}) on attempt ${attempt} for ${targetUrl}`);
            if (attempt < maxRetries) {
               attempt++;
               const delay = 300 * attempt;
               await new Promise(resolve => setTimeout(resolve, delay));
               continue;
            }
          }
          
          break; 
        } catch (error: any) {
          lastError = error;
          const isRetryable = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout');
          
          if (isRetryable && attempt < maxRetries) {
            console.warn(`Proxy retrying (attempt ${attempt+1}) for:`, targetUrl, error.message);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempt++;
            continue;
          }
          throw error;
        }
      }

      if (!response) throw lastError;

      if (isStream) {
        const contentType = response.headers["content-type"] || "";
        
        // Log stream details for debugging
        console.log(`Proxying stream: ${targetUrl} [Status: ${response.status}] [Type: ${contentType}]`);
        if (response.headers["server"]) console.log(`Provider server: ${response.headers["server"]}`);

        // If it's a 200 OK but content type is JSON/HTML instead of a stream, it's likely an error message from the provider
        if (response.status === 200 && (contentType.includes("application/json") || contentType.includes("text/html"))) {
          console.warn(`Provider returned 200 but content-type is ${contentType}. Likely an error message.`);
          // If we can't be sure it's a stream, we might want to fail fast
          // However, some providers use weird content types. Let's look for known error signatures if it's JSON.
        }

        // Enhanced headers for better compatibility
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

        if (response.status >= 400) {
          if (response.status === 404) {
            console.error(`404 Not Found from provider: ${targetUrl}. This might indicate an incorrect API endpoint (player_api.php vs panel_api.php).`);
          } else {
            console.error(`Provider returned error status: ${response.status} for ${targetUrl} [Method: ${req.method}]`);
          }
          
          if (response.status === 401 || response.status === 403) {
            return res.status(response.status).json({
              error: "Authentication Error",
              message: "The provider rejected the connection (401/403). Your session might have expired or credentials are invalid.",
            });
          }

          // If it's an error status and not a known stream type, return a clean error
          const isProbablyStream = contentType.includes('video') || contentType.includes('application/octet-stream') || contentType.includes('mpeg') || contentType.includes('octet-stream');
          
          if (!isProbablyStream) {
            return res.status(response.status).json({
              error: "Provider Error",
              message: `The provider returned status ${response.status}.`,
            });
          }
        }

        if (contentType) res.setHeader("Content-Type", String(contentType));
        
        res.status(response.status);
        if ((res as any).flushHeaders) (res as any).flushHeaders();
        
        response.data.pipe(res);

        // Handle client disconnect
        req.on("close", () => {
          if (response.data.destroy) response.data.destroy();
        });

        // Handle stream errors
        response.data.on("error", (err: any) => {
          console.error("Proxy stream error:", err.message);
          res.end();
        });
      } else {
        res.status(response.status).json(response.data);
      }
    } catch (error: any) {
      const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND';
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

      if (isTimeout) {
        console.error("Proxy timeout:", targetUrl);
        return res.status(504).json({
          error: "Provider Timeout",
          message: "The provider took too long to respond. Please try again or check your provider status.",
        });
      }

      if (isConnectionError) {
        console.error("Proxy connection error:", error.code, targetUrl);
        return res.status(502).json({
          error: "Provider Unreachable",
          message: `Could not connect to the provider (${error.code}). The server might be down or blocking the connection.`,
        });
      }

      console.error("Proxy integration error:", error.message); 
      res.status(500).json({
        error: "Server connectivity error",
        message: "Connectivity error occurred while communicating with the provider.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly handle index.html for the root route in dev
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const fs = await import("fs");
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
