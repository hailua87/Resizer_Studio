/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Download, 
  Maximize2, 
  Minimize2, 
  Check, 
  ChevronRight, 
  Trash2, 
  Monitor, 
  Smartphone, 
  Image as ImageIcon 
} from 'lucide-react';

// --- Types ---

type ResizeMode = 'fit' | 'fill' | 'stretch';

interface Dimensions {
  width: number;
  height: number;
}

interface Preset {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

// --- Constants ---

const PRESETS: Preset[] = [
  { id: 'fullhd', name: 'Full HD (16:9)', width: 1920, height: 1080, icon: <Monitor className="w-5 h-5" /> },
  { id: '4k', name: '4K Ultra HD', width: 3840, height: 2160, icon: <Monitor className="w-5 h-5" /> },
  { id: 'square', name: 'Instagram Square', width: 1080, height: 1080, icon: <Smartphone className="w-5 h-5" /> },
  { id: 'portrait', name: 'Story Path (9:16)', width: 1080, height: 1920, icon: <Smartphone className="w-5 h-5" /> },
];

// --- Main Component ---

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 1920, height: 1080 });
  const [mode, setMode] = useState<ResizeMode>('fill');
  const [quality, setQuality] = useState<number>(0.8);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<Dimensions | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>('fullhd');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    setFileName(file.name.split('.')[0]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
        setImage(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  };

  // Resizing and Dragging logic
  const renderImage = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = img.width / img.height;

      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let initialOffsetX = 0;
      let initialOffsetY = 0;

      if (mode === 'fit') {
        if (imgAspect > canvasAspect) {
          drawHeight = canvas.width / imgAspect;
          initialOffsetY = (canvas.height - drawHeight) / 2;
        } else {
          drawWidth = canvas.height * imgAspect;
          initialOffsetX = (canvas.width - drawWidth) / 2;
        }
      } else if (mode === 'fill') {
        if (imgAspect > canvasAspect) {
          drawWidth = canvas.height * imgAspect;
          initialOffsetX = (canvas.width - drawWidth) / 2;
        } else {
          drawHeight = canvas.width / imgAspect;
          initialOffsetY = (canvas.height - drawHeight) / 2;
        }
      }

      ctx.drawImage(img, initialOffsetX + position.x, initialOffsetY + position.y, drawWidth, drawHeight);
    };
    img.src = image;
  }, [image, dimensions, mode, position]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    renderImage();
  }, [renderImage]);

  const handleDownload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      if (canvasRef.current) {
        const link = document.createElement('a');
        const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
        link.download = `${fileName}_resized_${dimensions.width}x${dimensions.height}.${ext}`;
        link.href = canvasRef.current.toDataURL(format, format === 'image/png' ? undefined : quality);
        link.click();
      }
      setIsProcessing(false);
    }, 500);
  };

  const reset = () => {
    setImage(null);
    setFileName('');
    setOriginalDimensions(null);
    setPosition({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
            <Minimize2 className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">Resizer Studio</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
          <button className="text-indigo-600">Editor</button>
          <button className="hover:text-slate-900 transition-colors">Về chúng tôi</button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 flex flex-col p-8 items-center justify-center bg-slate-50/50"
            >
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-2xl aspect-video bg-white rounded-[32px] border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition-all cursor-pointer group flex flex-col items-center justify-center gap-6 relative shadow-sm"
              >
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-50 transition-all duration-500">
                  <Upload className="text-slate-400 group-hover:text-indigo-600 w-10 h-10 transition-colors" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-slate-900">Kéo thả ảnh của bạn</h2>
                  <p className="text-slate-400 mt-2">Hoặc nhấp để chọn file từ máy tính</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="mt-8 flex gap-8">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  Hỗ trợ Full HD & 4K
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  Tối ưu dung lượng
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex overflow-hidden w-full">
              {/* Main Preview Area */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col p-8 overflow-hidden"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Xử lý ảnh</h1>
                    <p className="text-slate-500">Điều chỉnh kích thước và tối ưu hóa chất lượng.</p>
                  </div>
                  <button 
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Bắt đầu lại
                  </button>
                </div>
                
                <div className="flex-1 relative bg-slate-200 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Background Blur Preview */}
                  <div 
                    className="absolute inset-0 bg-center bg-cover opacity-30 blur-2xl transition-all duration-700" 
                    style={{ backgroundImage: `url(${image})` }}
                  />
                  
                  <div 
                    className="relative bg-white p-2 rounded-lg shadow-2xl scale-[0.9] lg:scale-100 transition-transform duration-500 cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  >
                    <div className="overflow-hidden rounded flex items-center justify-center max-w-[80vw] max-h-[60vh] pointer-events-none select-none">
                      <canvas 
                        ref={canvasRef} 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="absolute -top-3 -right-3 bg-indigo-600 text-white text-[10px] px-2.5 py-1.5 rounded font-bold uppercase tracking-wider shadow-lg">Preview</div>
                  </div>

                  <div className="absolute top-6 right-6 flex flex-col gap-2">
                    <button 
                      onClick={resetPosition}
                      className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all group"
                      title="Reset vị trí"
                    >
                      <Maximize2 className="w-5 h-5 group-active:scale-90" />
                    </button>
                  </div>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2.5 rounded-full border border-slate-200 flex items-center gap-6 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Gốc</span>
                      <span className="text-sm font-medium text-slate-700">{originalDimensions?.width} × {originalDimensions?.height}</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-indigo-400">Mới</span>
                      <span className="text-sm font-bold text-indigo-700">{dimensions.width} × {dimensions.height}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Sidebar Controls */}
              <motion.aside 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-80 border-l border-slate-200 bg-white p-8 flex flex-col gap-8 shrink-0 overflow-y-auto"
              >
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Kích thước đầu ra</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Chiều rộng</label>
                      <input 
                        type="number"
                        value={dimensions.width}
                        onChange={(e) => {
                          setDimensions({ ...dimensions, width: parseInt(e.target.value) || 0 });
                          setActivePreset(null);
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Chiều cao</label>
                      <input 
                        type="number"
                        value={dimensions.height}
                        onChange={(e) => {
                          setDimensions({ ...dimensions, height: parseInt(e.target.value) || 0 });
                          setActivePreset(null);
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setDimensions({ width: preset.width, height: preset.height });
                          setActivePreset(preset.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          activePreset === preset.id 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {preset.id === 'fullhd' ? '1080p' : preset.id === '4k' ? '4K' : preset.name.split(' ')[1] || preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Chế độ & Tỉ lệ</label>
                  <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-100 gap-1">
                    {(['fill', 'fit', 'stretch'] as ResizeMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 py-2 text-[11px] font-bold rounded-lg capitalize transition-all ${
                          mode === m 
                          ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-slate-200' 
                          : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {m === 'fill' ? 'Phủ dầy' : m === 'fit' ? 'Vừa vặn' : 'Kéo dãn'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">Định dạng & Nén</label>
                  <div className="space-y-5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block">Định dạng file</label>
                      <select 
                        value={format}
                        onChange={(e) => setFormat(e.target.value as any)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
                      >
                        <option value="image/jpeg">JPEG (Nén tốt nhất)</option>
                        <option value="image/webp">WebP (Hiện đại cho web)</option>
                        <option value="image/png">PNG (Không mất chất lượng)</option>
                      </select>
                    </div>

                    {format !== 'image/png' && (
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2">
                          <span>Chất lượng</span>
                          <span className="text-indigo-600">{Math.round(quality * 100)}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={quality}
                          onChange={(e) => setQuality(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-indigo-900">Mẹo Resizer</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                    Sử dụng <b>4K</b> cho bản in chất lượng cao, hoặc <b>Fill</b> để đảm bảo không có viền đen khi đăng mạng xã hội.
                  </p>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-100 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-bold uppercase tracking-tight">Cấu hình xuất</span>
                      <span className="text-indigo-600 font-bold">
                        {format === 'image/png' ? 'Dung lượng gốc' : quality < 0.5 ? 'Siêu nhẹ' : quality < 0.8 ? 'Cân bằng' : 'Chất lượng cao'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      {format.split('/')[1].toUpperCase()} • {format === 'image/png' ? 'Lossless' : `${Math.round(quality * 100)}%`} • Tối ưu hóa Web
                    </div>
                  </div>
                  
                  <button
                    onClick={handleDownload}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-slate-200"
                  >
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Tải về tài sản</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
