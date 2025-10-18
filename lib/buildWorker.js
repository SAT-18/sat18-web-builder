const fs = require("fs/promises");
const { existsSync, readFileSync } = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { execa } = require("execa");
const SftpClient = require("ssh2-sftp-client");
const { NodeSSH } = require("node-ssh");

async function startBuild(zipPath, opts = {}) {
  const { buildId, TEMP_DIR, OUTPUT_DIR, statusFile } = opts;
  
  const workdir = path.join(TEMP_DIR, buildId);
  await fs.mkdir(workdir, { recursive: true });

  const setStatus = async (status, extra = {}) => {
    const statusData = { status, ...extra };
    await fs.writeFile(statusFile, JSON.stringify(statusData));
  };

  try {
    await setStatus("extracting");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(workdir, true);
    await setStatus("extracted");

    const gradlewPath = path.join(workdir, "gradlew");
    if (!existsSync(gradlewPath)) {
        // Look in subdirectories, as the project might be nested.
        const foundGradlew = await findFile(workdir, 'gradlew');
        if (!foundGradlew) throw new Error("Could not find 'gradlew' in the project.");
        
        const projectRoot = path.dirname(foundGradlew);
        await setStatus("building-local", { progress: 30 });
        // Make gradlew executable
        try { await fs.chmod(foundGradlew, 0o755); } catch {}
        await execa(foundGradlew, ["assembleRelease"], { cwd: projectRoot, timeout: parseInt(process.env.BUILD_TIMEOUT || "900000") });
        
        const apkPath = await findFile(projectRoot, '.apk');
        if (!apkPath) throw new Error("APK not found after local build.");

        const dest = path.join(OUTPUT_DIR, `${buildId}.apk`);
        await fs.copyFile(apkPath, dest);
        await setStatus("done", { apk: `${buildId}.apk` });
        return;
    }
     // Fallback for top-level gradlew
    await setStatus("building-local", { progress: 30 });
    try { await fs.chmod(gradlewPath, 0o755); } catch {}
    await execa(gradlewPath, ["assembleRelease"], { cwd: workdir, timeout: parseInt(process.env.BUILD_TIMEOUT || "900000") });
    
    const apkPath = await findFile(workdir, '.apk');
    if (!apkPath) throw new Error("APK not found after local build.");
    const dest = path.join(OUTPUT_DIR, `${buildId}.apk`);
    await fs.copyFile(apkPath, dest);
    await setStatus("done", { apk: `${buildId}.apk` });

  } catch (err) {
    await setStatus("local-failed", { error: err.message });

    if (process.env.USE_REMOTE !== "1") {
      throw new Error(`Local build failed and remote build is not enabled. Reason: ${err.message}`);
    }

    // Remote build fallback
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

    } catch (remoteErr) {
        await setStatus("remote-failed", { error: remoteErr.message });
        throw remoteErr; // Propagate the remote error
    } finally {
        ssh.dispose();
    }
  }
}

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


module.exports = { startBuild };
