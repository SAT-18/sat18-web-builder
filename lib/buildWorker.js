const fs = require("fs/promises");
const { existsSync, readFileSync } = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { execa } = require("execa");
const SftpClient = require("ssh2-sftp-client");
const { NodeSSH } = require("node-ssh");

async function findFile(startPath, filter) {
    const files = await fs.readdir(startPath);
    for (const file of files) {
        const filename = path.join(startPath, file);
        const stat = await fs.lstat(filename);
        if (stat.isDirectory()) {
            const result = await findFile(filename, filter);
            if (result) return result;
        } else if (filename.includes(filter)) {
            return filename;
        }
    }
}

async function startBuild(zipPath, opts = {}) {
  const { buildId, TEMP_DIR, OUTPUT_DIR, statusFile, appName, iconPath, buildEnv } = opts;
  
  const workdir = path.join(TEMP_DIR, buildId);

  const setStatus = async (status, extra = {}) => {
    const statusData = { status, ...extra };
    await fs.writeFile(statusFile, JSON.stringify(statusData));
  };

  const doRemoteBuild = async () => {
    if (process.env.USE_REMOTE !== "1") {
      throw new Error(`Remote build requested but not enabled on the server.`);
    }

    await setStatus("uploading-remote");
    const sftp = new SftpClient();
    const ssh = new NodeSSH();

    const connectConfig = {
      host: process.env.REMOTE_HOST,
      port: parseInt(process.env.REMOTE_PORT || "22"),
      username: process.env.REMOTE_USER,
      privateKey: readFileSync(path.resolve(process.env.REMOTE_PRIVATE_KEY_PATH), 'utf8')
    };
    
    const remoteBasePath = process.env.REMOTE_PATH;
    const remoteZipPath = `${remoteBasePath}/${buildId}.zip`;

    try {
        await sftp.connect(connectConfig);
        await sftp.mkdir(remoteBasePath, true);
        await sftp.put(zipPath, remoteZipPath);
        await sftp.end();

        await setStatus("remote-building");
        await ssh.connect(connectConfig);
        
        const remoteCmd = `bash ${remoteBasePath}/run_remote_build.sh ${buildId} ${remoteZipPath}`;
        const result = await ssh.execCommand(remoteCmd);

        if (result.code !== 0) {
            throw new Error(`Remote script failed: ${result.stderr}`);
        }

        const sftp2 = new SftpClient();
        await sftp2.connect(connectConfig);
        const remoteApkPath = `${remoteBasePath}/output/${buildId}.apk`;
        const localApkDest = path.join(OUTPUT_DIR, `${buildId}.apk`);
        await sftp2.get(remoteApkPath, localApkDest);
        await sftp2.end();
        
        await setStatus("done", { apk: `${buildId}.apk` });

    } finally {
        if (sftp.sftp) await sftp.end();
        ssh.dispose();
    }
  };

  try {
      await fs.mkdir(workdir, { recursive: true });
      await setStatus("extracting");
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(workdir, true);
      await setStatus("extracted");

      if (buildEnv === 'remote') {
        return await doRemoteBuild();
      }

      // Local build process
      const gradlewPath = await findFile(workdir, 'gradlew');
      if (!gradlewPath) throw new Error("Could not find 'gradlew' in the project.");

      const projectRoot = path.dirname(gradlewPath);
      await setStatus("building-local", { progress: 30 });
      
      try { await fs.chmod(gradlewPath, 0o755); } catch {}
      await execa(gradlewPath, ["assembleRelease"], { cwd: projectRoot, timeout: parseInt(process.env.BUILD_TIMEOUT || "900000") });
      
      const apkPath = await findFile(projectRoot, '.apk');
      if (!apkPath) throw new Error("APK not found after local build.");

      const dest = path.join(OUTPUT_DIR, `${buildId}.apk`);
      await fs.copyFile(apkPath, dest);
      await setStatus("done", { apk: `${buildId}.apk` });

  } catch (err) {
    if (buildEnv === 'remote') {
      await setStatus("remote-failed", { error: err.message });
      throw err;
    }
    
    await setStatus("local-failed", { error: err.message });

    try {
        await doRemoteBuild();
    } catch (remoteErr) {
        await setStatus("remote-failed", { error: remoteErr.message });
        throw remoteErr;
    }
  }
}

module.exports = { startBuild };
