import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory storage for online users per page
  // Key: page path, Value: Set of socket IDs
  const pageViewers = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // For widgets: Join and be counted
    socket.on("join-page", (pagePath: string) => {
      socket.join(pagePath);
      
      if (!pageViewers.has(pagePath)) {
        pageViewers.set(pagePath, new Set());
      }
      pageViewers.get(pagePath)?.add(socket.id);

      const count = pageViewers.get(pagePath)?.size || 0;
      // Broadcast to everyone in the room (including monitors)
      io.to(pagePath).emit("update-count", { pagePath, count });
      
      (socket as any).currentPage = pagePath;
    });

    // For dashboard: Watch without being counted
    socket.on("monitor-page", (pagePath: string) => {
      socket.join(pagePath);
      const count = pageViewers.get(pagePath)?.size || 0;
      // Send initial count only to the requester
      socket.emit("update-count", { pagePath, count });
    });

    socket.on("disconnect", () => {
      const pagePath = (socket as any).currentPage;
      if (pagePath && pageViewers.has(pagePath)) {
        pageViewers.get(pagePath)?.delete(socket.id);
        const count = pageViewers.get(pagePath)?.size || 0;
        io.to(pagePath).emit("update-count", { pagePath, count });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
