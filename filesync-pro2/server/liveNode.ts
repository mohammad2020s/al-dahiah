// Voice calls on a Node server (Render / local dev): the `ws` package carries the call's sockets.
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { runCall, type Sock } from "./live-audio.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";

function wrap(ws: WebSocket): Sock {
  return {
    send: (t) => ws.send(t),
    close: (code) => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(code);
    },
    isOpen: () => ws.readyState === WebSocket.OPEN,
    onOpen: (cb) => void ws.on("open", cb),
    onMessage: (cb) => void ws.on("message", (d) => cb(d.toString())),
    onClose: (cb) => void ws.on("close", (code, reason) => cb(code, reason.toString())),
    onError: (cb) => void ws.on("error", (e) => cb(e.message)),
  };
}

export function setupLiveAudio(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  // Voice calls cost the most: at most 6 new calls per 10 minutes and 2 at once per visitor
  const callStartLimit = createLimiter({ windowMs: 10 * 60_000, max: 6 });
  const openCalls = new Map<string, number>();

  server.on("upgrade", (request, socket, head) => {
    socket.on("error", (err) => console.warn("Socket error during upgrade:", err));
    const reqUrl = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    if (reqUrl.pathname !== "/live") return;
    const ip = clientIp(request);
    if ((openCalls.get(ip) || 0) >= 2 || !callStartLimit(ip).ok) {
      console.warn(`[Live Audio] Rate limited ${ip}`);
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      openCalls.set(ip, (openCalls.get(ip) || 0) + 1);
      ws.on("close", () => {
        const n = (openCalls.get(ip) || 1) - 1;
        if (n <= 0) openCalls.delete(ip);
        else openCalls.set(ip, n);
      });
      runCall(wrap(ws), reqUrl, (url) => wrap(new WebSocket(url)));
    });
  });
}
