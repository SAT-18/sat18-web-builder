// server.js
// Entry point untuk SAT18 Web Builder di VPS (Node.js 23)
// Menjalankan Next.js + REST API build listener

import express from "express";
import next from "next";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const server = express();
server.use(express.json());

// ===============================
// ROUTE: Tes koneksi server
// ===============================
server.get("/status", (req, res) => {
  res.json({
    status: "online",
    message: "SAT18 Web Builder server aktif dan siap menerima build request.",
    uptime: process.uptime(),
  });
});

// ===============================
// ROUTE: Build worker
// Menerima ZIP dari user untuk dibuild
// ===============================
server.post("/build", async (req, res) => {
  try {
    // Di tahap real nanti, file ZIP dikirim melalui form-data,
    // disimpan sementara di folder /tmp atau /home/container/uploads
    const projectDir = path.join(process.cwd(), "user_builds");
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

    console.log("🔧 Menjalankan build proyek user...");
    const buildCommand = "bash ./run_remote_build.sh";

    exec(buildCommand, { cwd: projectDir }, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Build gagal:", error.message);
        return res.status(500).json({ success: false, error: error.message });
      }
      console.log("✅ Build berhasil dijalankan");
      console.log(stdout);
      res.json({ success: true, message: "Build berhasil dijalankan di VPS." });
    });
  } catch (err) {
    console.error("❌ Terjadi error saat build:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===============================
// NEXT.JS HANDLER
// ===============================
app.prepare().then(() => {
  server.all("*", (req, res) => handle(req, res));
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 SAT18 Web Builder berjalan di http://localhost:${port}`);
  });
});
