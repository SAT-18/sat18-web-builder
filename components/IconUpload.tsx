
import React from 'react';

interface IconUploadProps {
    file: File | null;
    setFile: (file: File | null) => void;
    preview: string | null;
}

export const IconUpload: React.FC<IconUploadProps> = ({ setFile, preview }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-2">
            <label className="font-medium text-slate-300">App Icon (Optional)</label>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-900 border border-slate-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {preview ? (
                        <img src={preview} alt="App icon preview" className="w-full h-full object-cover" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>
                <label className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium text-cyan-400 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md transition">
                        Choose File
                    </span>
                    <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
                </label>
            </div>
        </div>
    );
};
