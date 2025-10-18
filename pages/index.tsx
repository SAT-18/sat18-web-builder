import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileUpload } from '../components/FileUpload';
import { IconUpload } from '../components/IconUpload';
import { BuildProgress } from '../components/BuildProgress';
import { CheckIcon } from '../components/icons/CheckIcon';
import { SpinnerIcon } from '../components/icons/SpinnerIcon';

const HomePage: React.FC = () => {
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [appName, setAppName] = useState<string>('');
    const [appIcon, setAppIcon] = useState<File | null>(null);
    const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
    const [buildEnv, setBuildEnv] = useState<'local' | 'remote'>('local');

    const [isBuilding, setIsBuilding] = useState<boolean>(false);
    const [buildId, setBuildId] = useState<string | null>(null);
    const [buildProgress, setBuildProgress] = useState<number>(0);
    const [buildLog, setBuildLog] = useState<string[]>([]);
    const [apkUrl, setApkUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const intervalRef = useRef<number | null>(null);
    const lastStatusRef = useRef<string | null>(null);

    const cleanup = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    useEffect(() => {
        return () => {
            if (appIconPreview) {
                URL.revokeObjectURL(appIconPreview);
            }
            cleanup();
        };
    }, [appIconPreview, cleanup]);

    useEffect(() => {
        if (!buildId || !isBuilding) {
            cleanup();
            return;
        }

        const pollStatus = async () => {
            try {
                const res = await fetch(`/api/upload?buildId=${buildId}`);
                if (!res.ok) {
                    throw new Error('Failed to fetch build status');
                }
                const data = await res.json();

                if (lastStatusRef.current !== data.status) {
                    setBuildLog(prev => [...prev, `Status changed to: ${data.status}`]);
                    lastStatusRef.current = data.status;
                }
                
                const progressMap: { [key: string]: number } = {
                    queued: 5,
                    extracting: 15,
                    extracted: 25,
                    'building-local': 60,
                    'local-failed': 40,
                    'uploading-remote': 50,
                    'remote-building': 75,
                    'remote-failed': 90,
                    done: 100,
                    failed: 100
                };
                setBuildProgress(progressMap[data.status] || buildProgress);

                if (data.status === 'done') {
                    setBuildProgress(100);
                    setBuildLog(prev => [...prev, 'Build finished successfully!']);
                    setApkUrl(`/api/download?buildId=${buildId}`);
                    setIsBuilding(false);
                    cleanup();
                } else if (data.status === 'failed') {
                    setError(`Build failed: ${data.error || 'Unknown error'}`);
                    setBuildLog(prev => [...prev, `Error: ${data.error}`]);
                    setIsBuilding(false);
                    cleanup();
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred during polling.');
                setIsBuilding(false);
                cleanup();
            }
        };

        intervalRef.current = window.setInterval(pollStatus, 4000);

        return () => cleanup();

    }, [buildId, isBuilding, cleanup, buildProgress]);

    const handleIconChange = (file: File | null) => {
        if (appIconPreview) {
            URL.revokeObjectURL(appIconPreview);
        }
        if (file) {
            setAppIcon(file);
            setAppIconPreview(URL.createObjectURL(file));
        } else {
            setAppIcon(null);
            setAppIconPreview(null);
        }
    };
    
    const handleBuild = async () => {
        if (!zipFile) {
            setError("Please upload a project .zip file.");
            return;
        }
        if (!appName.trim()) {
            setError("Please enter an application name.");
            return;
        }

        setError(null);
        setIsBuilding(true);
        setBuildProgress(0);
        setBuildLog(["Build process initiated..."]);
        setApkUrl(null);
        setBuildId(null);
        lastStatusRef.current = null;

        const formData = new FormData();
        formData.append('project', zipFile);
        formData.append('appName', appName);
        if (appIcon) {
            formData.append('icon', appIcon);
        }
        formData.append('buildEnv', buildEnv);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }
            setBuildLog(prev => [...prev, `Build started. Build ID: ${data.buildId}`]);
            setBuildId(data.buildId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsBuilding(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400">SAT18 APK Builder</h1>
                    <p className="text-slate-400 mt-2">Convert your web projects into Android apps in seconds.</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-6">
                        <h2 className="text-2xl font-semibold border-b border-slate-600 pb-3">1. Configuration</h2>
                        <FileUpload file={zipFile} setFile={setZipFile} />
                        
                        <div className="space-y-2">
                            <label htmlFor="appName" className="font-medium text-slate-300">App Name</label>
                            <input
                                id="appName"
                                type="text"
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                placeholder="e.g., My Awesome App"
                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                            />
                        </div>

                        <IconUpload file={appIcon} setFile={handleIconChange} preview={appIconPreview} />

                        <div className="space-y-2">
                            <label className="font-medium text-slate-300">Build Environment</label>
                            <div className="flex gap-2 p-1 rounded-md bg-slate-900 border border-slate-700">
                                <button
                                    onClick={() => setBuildEnv('local')}
                                    className={`w-full py-2 px-4 rounded-md transition text-sm font-semibold ${
                                        buildEnv === 'local'
                                            ? 'bg-cyan-600 text-white shadow'
                                            : 'text-slate-400 hover:bg-slate-800'
                                    }`}
                                >
                                    Local
                                </button>
                                <button
                                    onClick={() => setBuildEnv('remote')}
                                    className={`w-full py-2 px-4 rounded-md transition text-sm font-semibold ${
                                        buildEnv === 'remote'
                                            ? 'bg-cyan-600 text-white shadow'
                                            : 'text-slate-400 hover:bg-slate-800'
                                    }`}
                                >
                                    Remote
                                </button>
                            </div>
                             <p className="text-xs text-slate-500 pt-1 px-1">
                                {buildEnv === 'local'
                                    ? 'Builds on this server. Requires Android SDK.'
                                    : 'Offloads the build to a dedicated remote server.'}
                            </p>
                        </div>
                        
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        
                        <button 
                            onClick={handleBuild}
                            disabled={isBuilding}
                            className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                        >
                            {isBuilding ? (
                                <>
                                  <SpinnerIcon />
                                  Building...
                                </>
                            ) : "Build APK"}
                        </button>
                    </div>

                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                        <h2 className="text-2xl font-semibold border-b border-slate-600 pb-3 mb-6">2. Build Output</h2>
                        {(isBuilding || buildLog.length > 1) ? (
                            <BuildProgress progress={buildProgress} log={buildLog} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <p>Waiting for build to start...</p>
                            </div>
                        )}
                         {apkUrl && (
                            <div className="mt-6 text-center bg-green-900/50 border border-green-700 p-6 rounded-lg animate-fade-in">
                                <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center justify-center gap-2">
                                  <CheckIcon />
                                  Build Complete!
                                </h3>
                                <p className="text-green-200 mb-4">Your APK is ready for download.</p>
                                <a
                                    href={apkUrl}
                                    download={`${appName.replace(/\s+/g, '_') || 'app'}.apk`}
                                    className="inline-block bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105"
                                >
                                    Download APK
                                </a>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HomePage;
