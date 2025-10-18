const nextConnect = require("next-connect");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { startBuild } = require("../../lib/buildWorker.js");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "output";
const TEMP_DIR = process.env.TEMP_DIR || "projects";

[UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR].forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
});

const upload = multer({ dest: UPLOAD_DIR });
const handler = nextConnect({
    onError(error, req, res) {
        res.status(501).json({ error: `Something went wrong! ${error.message}` });
    },
    onNoMatch(req, res) {
        res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
    },
});

handler.post(upload.single("project"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  
  const buildId = uuidv4();
  const targetPath = path.join(UPLOAD_DIR, `${buildId}.zip`);
  fs.renameSync(req.file.path, targetPath);

  const statusFile = path.join(TEMP_DIR, `${buildId}.status.json`);
  fs.writeFileSync(statusFile, JSON.stringify({ status: "queued", progress: 0 }));

  // Do not await this call
  startBuild(targetPath, { buildId, TEMP_DIR, OUTPUT_DIR, statusFile })
    .catch(err => {
        console.error(`Build failed for ${buildId}:`, err);
        fs.writeFileSync(statusFile, JSON.stringify({ status: "failed", error: String(err) }));
    });

  res.status(202).json({ ok: true, buildId });
});

handler.get(async (req, res) => {
  const { buildId } = req.query;
  if (!buildId) {
    return res.status(400).json({ error: "buildId is required." });
  }
  const statusFile = path.join(TEMP_DIR, `${buildId}.status.json`);
  if (fs.existsSync(statusFile)) {
    const data = fs.readFileSync(statusFile, "utf8");
    res.status(200).json(JSON.parse(data));
  } else {
    res.status(404).json({ error: "Build status not found." });
  }
});

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
