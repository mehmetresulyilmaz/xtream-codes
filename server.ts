import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

async function startServer() {
  const app = express();
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
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.",
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
      // You could add whitelist here if needed

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: { ...req.query, targetUrl: undefined },
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
        },
        responseType: req.query.stream === "true" ? "stream" : "json",
        timeout: 10000,
      });

      if (req.query.stream === "true") {
        const contentType = response.headers["content-type"];
        if (contentType) res.setHeader("Content-Type", String(contentType));
        response.data.pipe(res);
      } else {
        res.status(response.status).json(response.data);
      }
    } catch (error: any) {
      // Don't log the full error as it might contain credentials in the URL
      console.error("Proxy error occurred"); 
      res.status(error.response?.status || 500).json({
        error: "Server connectivity error",
        message: "Bağlantı hatası oluştu.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
