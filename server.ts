import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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
      let retries = 1; // Reduced retries to keep total time under LB limits
      let lastError;

      const userAgents = [
        "IPTVSmartersPlayer",
        "VLC/3.0.18 LibVLC/3.0.18",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];

      while (retries >= 0) {
        try {
          response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            params: { ...req.query, targetUrl: undefined },
            headers: {
              "User-Agent": userAgents[1 - retries] || userAgents[0],
              "Accept": "*/*",
              "Accept-Encoding": "identity", 
              "Connection": "close",
              "Referer": parsedUrl.origin,
              "X-Forwarded-For": req.ip, // Sometimes helps with geolocation-based blocks
            },
            family: 4, 
            responseType: isStream ? "stream" : "json",
            timeout: isStream ? 0 : 90000, // 90 seconds per attempt
            validateStatus: () => true, 
          });
          break; 
        } catch (error: any) {
          lastError = error;
          const isRetryable = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout');
          if (isRetryable && retries > 0) {
            const delay = 1000;
            console.warn(`Proxy retrying (${retries} left) for:`, targetUrl);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries--;
            continue;
          }
          throw error;
        }
      }

      if (!response) throw lastError;

      if (isStream) {
        const contentType = response.headers["content-type"];
        if (contentType) res.setHeader("Content-Type", String(contentType));
        
        // Pass the status code from target
        res.status(response.status);

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
