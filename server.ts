import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeDatabase } from "./server/db/database.ts";
import { rebuildAllDSAFromDB } from "./server/dsaRegistry.ts";
import { apiRouter } from "./server/routes/api.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database and populate custom Data Structures
  try {
    await initializeDatabase();
    rebuildAllDSAFromDB();
    console.log("✈️ AIRSERVE: SQLite database and in-memory DSA initialized successfully.");
  } catch (err) {
    console.error("Error during database & DSA startup:", err);
  }

  // Mount API router
  app.use("/api", apiRouter);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      system: "AIRSERVE Airline Reservation & Management System",
      timestamp: new Date().toISOString(),
    });
  });

  // Vite development vs Production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✈️ AIRSERVE Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
