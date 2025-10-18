import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return alert("Pilih file zip dulu.");
    setStatus("Uploading...");
    const form = new FormData();
    form.append("project", file);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setStatus("Error: " + (data?.error || res.statusText));
      return;
    }

    setStatus("Build started. Build ID: " + data.buildId);
    const poll = setInterval(async () => {
      const r = await fetch(`/api/upload?buildId=${data.buildId}`);
      const j = await r.json();
      if (j.status === "done") {
        setDownloadUrl(`/api/download?buildId=${data.buildId}`);
        setStatus("✅ Build finished.");
        clearInterval(poll);
      } else if (j.status === "failed") {
        setStatus("❌ Build failed: " + j.error);
        clearInterval(poll);
      } else {
        setStatus("⏳ " + j.status + "...");
      }
    }, 4000);
  }

  return (
    <div style={{maxWidth:700,margin:"40px auto",fontFamily:"sans-serif"}}>
      <h1>SAT18 APK Builder</h1>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".zip" onChange={(e)=>setFile(e.target.files[0])}/>
        <br/><br/>
        <button type="submit">Upload & Build</button>
      </form>
      <p>{status}</p>
      {downloadUrl && <a href={downloadUrl}>Download APK</a>}
    </div>
  );
}