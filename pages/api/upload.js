const nextConnect = require("next-connect");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { startBuild } = require("../../lib/buildWorker.js");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "output";
const TEMP_DIR = process.env.TEMP_DIR || "projects";

[UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR].forEach(d => fs.mkdirSync(d, {recursive:true}));

const upload = multer({ dest: UPLOAD_DIR });
const handler = nextConnect();

handler.post(upload.single("project"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const buildId = uuidv4();
    const targetPath = path.join(UPLOAD_DIR, `${buildId}.zip`);
    fs.renameSync(req.file.path, targetPath);

    const statusFile = path.join(TEMP_DIR, `${buildId}.status.json`);
    fs.writeFileSync(statusFile, JSON.stringify({ status: "queued" }));

    startBuild(targetPath, { buildId, TEMP_DIR, OUTPUT_DIR, statusFile })
      .catch(err => fs.writeFileSync(statusFile, JSON.stringify({ status: "failed", error: String(err) })));

    res.json({ ok: true, buildId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

handler.get(async (req, res) => {
  const { buildId } = req.query;
  if (!buildId) return res.status(400).json({ error: "no buildId" });
  const statusFile = path.join(TEMP_DIR, `${buildId}.status.json`);
  if (!fs.existsSync(statusFile)) return res.status(404).json({ error: "not found" });
  res.json(JSON.parse(fs.readFileSync(statusFile, "utf8")));
});

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
