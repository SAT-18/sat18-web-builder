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

const uploadMiddleware = upload.fields([
    { name: 'project', maxCount: 1 },
    { name: 'icon', maxCount: 1 }
]);

handler.use(uploadMiddleware);

handler.post(async (req, res) => {
  if (!req.files || !req.files.project || !req.files.project[0]) {
    return res.status(400).json({ error: "No project file uploaded." });
  }

  const { appName, buildEnv } = req.body;
  const projectFile = req.files.project[0];
  const iconFile = req.files.icon ? req.files.icon[0] : null;
  
  const buildId = uuidv4();
  const projectTargetPath = path.join(UPLOAD_DIR, `${buildId}.zip`);
  fs.renameSync(projectFile.path, projectTargetPath);

  let iconPath = null;
    if (iconFile) {
        const iconExt = path.extname(iconFile.originalname);
        iconPath = path.join(UPLOAD_DIR, `${buildId}_icon${iconExt}`);
        fs.renameSync(iconFile.path, iconPath);
    }

  const statusFile = path.join(TEMP_DIR, `${buildId}.status.json`);
  fs.writeFileSync(statusFile, JSON.stringify({ status: "queued", progress: 0 }));

  // Do not await this call
  startBuild(projectTargetPath, { buildId, TEMP_DIR, OUTPUT_DIR, statusFile, appName, iconPath, buildEnv })
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
