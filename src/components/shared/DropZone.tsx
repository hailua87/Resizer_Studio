import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  accept: string;
  onFileSelected: (file: File) => void;
  title: string;
  subtitle: string;
  supportedFormats: string;
  icon?: React.ReactNode;
}

export default function DropZone({ accept, onFileSelected, title, subtitle, supportedFormats, icon }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex-1 flex flex-col p-8 items-center justify-center"
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full max-w-2xl aspect-video rounded-[32px] border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center gap-6 relative shadow-sm
          ${isDragOver
            ? 'border-brand-400 bg-brand-50 scale-[1.02]'
            : 'bg-white border-surface-200 hover:border-brand-400 hover:bg-surface-50'
          }`}
      >
        {/* Glow effect when dragging */}
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-brand-100/50 to-brand-200/30 pointer-events-none"
          />
        )}

        <motion.div
          animate={isDragOver ? { scale: 1.15, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-20 h-20 rounded-full bg-surface-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-50 transition-all duration-500 relative z-10"
        >
          {icon || <Upload className="text-surface-400 group-hover:text-brand-600 w-10 h-10 transition-colors" />}
        </motion.div>
        <div className="text-center relative z-10">
          <h2 className="text-xl font-semibold text-surface-900">{title}</h2>
          <p className="text-surface-400 mt-2">{subtitle}</p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />
        <div className="flex gap-6 mt-4 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-surface-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {supportedFormats}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
