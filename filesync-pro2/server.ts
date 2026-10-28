import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { setupLiveAudio } from "./server/live-audio.ts";
import { apiRouter } from "./server/api.ts";
import { STATS_PAGE_HTML } from "./server/statsPage.ts";
import { STAMPS_PAGE_HTML } from "./server/stampsPage.ts";

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

async function startServer() {
  const app = express();
  // Render sits behind a proxy: trust its X-Forwarded-For so rate limits see the real visitor IP
  app.set("trust proxy", 1);
  const server = createServer(app);

  // 8 MB: room for a visitor's photo («صوّر واسأل»), which the page shrinks to ~1024 px first
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Static image directories
  app.use("/images", express.static(path.resolve(process.cwd(), "public/images")));
  app.use(express.static(path.resolve(process.cwd(), "public")));

  // API endpoints
  app.use("/api", apiRouter);

  // Owner page: what visitors ask (data needs STATS_KEY)
  app.get("/stats", (_req, res) => {
    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).send(STATS_PAGE_HTML);
  });
  // Owner page: printable QR signs for «جواز الملح» (codes need STATS_KEY)
  app.get("/stamps", (_req, res) => {
    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).send(STAMPS_PAGE_HTML);
  });

  // Setup Gemini Live WebSocket
  setupLiveAudio(server);

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        let template = await fs.promises.readFile(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[Server] Running on http://${HOST}:${PORT}/`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Startup failed:", err);
});
