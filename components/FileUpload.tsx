import React, { useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { ZipIcon } from './icons/ZipIcon';

interface FileUploadProps {
    file: File | null;
    setFile: (file: File | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ file, setFile }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/zip' || droppedFile.name.endsWith('.zip')) {
                setFile(droppedFile);
            } else {
                alert("Please upload a .zip file.");
            }
        }
    }, [setFile]);

    return (
        <div className="space-y-2">
            <label className="font-medium text-slate-300">Project (.zip)</label>
            <label
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex justify-center w-full h-32 px-4 transition bg-slate-900 border-2 border-slate-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-slate-500 focus:outline-none"
            >
                {file ? (
                    <div className="flex items-center space-x-2 text-slate-300">
                        <ZipIcon />
                        <span className="font-medium">{file.name}</span>
                    </div>
                ) : (
                    <span className="flex items-center space-x-2">
                        <UploadIcon />
                        <span className="font-medium text-slate-500">
                            Drop files to Attach, or <span className="text-cyan-400">browse</span>
                        </span>
                    </span>
                )}
                <input type="file" name="file_upload" className="hidden" accept=".zip" onChange={handleFileChange} />
            </label>
        </div>
    );
};
