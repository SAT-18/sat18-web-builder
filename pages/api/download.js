const fs = require("fs");
const path = require("path");

function handler(req, res) {
  try {
    const outputDir = "/home/container/user_builds/output";
    const apkPath = path.join(outputDir, "sat18_user_build.apk");

    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({
        success: false,
        message: "❌ File APK belum tersedia. Silakan tunggu build selesai.",
      });
    }

    // Set header agar browser langsung download
    res.setHeader("Content-Disposition", 'attachment; filename="sat18_user_build.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");

    // Stream file ke client
    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);

  } catch (err) {
    console.error("❌ Error saat mengirim APK:", err);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengunduh file APK.",
    });
  }
}

module.exports = handler;
