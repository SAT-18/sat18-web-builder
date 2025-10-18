import React, { useEffect, useRef } from 'react';

interface BuildProgressProps {
    progress: number;
    log: string[];
}

export const BuildProgress: React.FC<BuildProgressProps> = ({ progress, log }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [log]);

    return (
        <div className="space-y-4">
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-slate-300">Build Progress</span>
                    <span className="text-sm font-medium text-cyan-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div 
                        className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500 ease-linear" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
            <div 
                ref={logContainerRef}
                className="w-full h-64 bg-black/50 rounded-md p-4 font-mono text-sm text-slate-300 overflow-y-auto"
            >
                {log.map((line, index) => (
                    <p key={index} className="whitespace-pre-wrap animate-fade-in">
                        <span className="text-green-400 mr-2">{'>'}</span>{line}
                    </p>
                ))}
            </div>
        </div>
    );
};
