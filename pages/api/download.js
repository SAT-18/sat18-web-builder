const fs = require("fs");
const path = require("path");

function handler(req, res) {
  const { buildId } = req.query;
  if (!buildId) {
    return res.status(400).json({ error: "buildId is required" });
  }

  const OUTPUT_DIR = process.env.OUTPUT_DIR || "output";
  // Sanitize buildId to prevent directory traversal
  const safeBuildId = path.basename(buildId);
  const apkPath = path.join(OUTPUT_DIR, `${safeBuildId}.apk`);

  if (fs.existsSync(apkPath)) {
    res.setHeader("Content-Disposition", `attachment; filename="${safeBuildId}.apk"`);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);
  } else {
    res.status(404).send("File not found or build is not yet complete.");
  }
}

module.exports = handler;
