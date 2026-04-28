import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Maximize2,
  Check,
  Trash2,
  Monitor,
  Smartphone,
  Image as ImageIcon,
} from 'lucide-react';
import DropZone from './shared/DropZone.tsx';

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

export default function ImageResizer() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 1920, height: 1080 });
  const [mode, setMode] = useState<ResizeMode>('fill');
  const [quality, setQuality] = useState<number>(0.9);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<Dimensions | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>('fullhd');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle image upload
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

  // Resizing and rendering
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

  // Drag to reposition image
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
        const ext = format === 'image/png' ? 'png' : 'jpg';
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
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <AnimatePresence mode="wait">
      {!image ? (
        <DropZone
          key="upload"
          accept="image/*"
          onFileSelected={loadImage}
          title="Kéo thả ảnh của bạn"
          subtitle="Hoặc nhấp để chọn file từ máy tính"
          supportedFormats="JPG, PNG, WebP, BMP"
          icon={<ImageIcon className="text-surface-400 group-hover:text-brand-600 w-10 h-10 transition-colors" />}
        />
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
                <h1 className="text-2xl font-semibold text-surface-900 font-[Outfit]">Xử lý ảnh</h1>
                <p className="text-surface-500">Điều chỉnh kích thước và tối ưu hóa chất lượng.</p>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Bắt đầu lại
              </button>
            </div>

            <div
              className="flex-1 relative bg-surface-200 rounded-2xl border-2 border-dashed border-surface-300 flex items-center justify-center overflow-hidden shadow-inner"
            >
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
                <div className="absolute -top-3 -right-3 bg-brand-600 text-white text-[10px] px-2.5 py-1.5 rounded font-bold uppercase tracking-wider shadow-lg">Preview</div>
              </div>

              <div className="absolute top-6 right-6 flex flex-col gap-2">
                <button
                  onClick={resetPosition}
                  className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg border border-surface-200 text-surface-600 hover:text-brand-600 hover:scale-110 transition-all group"
                  title="Reset vị trí"
                >
                  <Maximize2 className="w-5 h-5 group-active:scale-90" />
                </button>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2.5 rounded-full border border-surface-200 flex items-center gap-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-surface-400">Gốc</span>
                  <span className="text-sm font-medium text-surface-700">{originalDimensions?.width} × {originalDimensions?.height}</span>
                </div>
                <span className="text-surface-300">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-brand-400">Mới</span>
                  <span className="text-sm font-bold text-brand-700">{dimensions.width} × {dimensions.height}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar Controls */}
          <motion.aside
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 border-l border-surface-200 bg-white p-8 flex flex-col gap-8 shrink-0 overflow-y-auto"
          >
            {/* Dimensions */}
            <div>
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4 block">Kích thước đầu ra</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-surface-500 mb-1.5 block">Chiều rộng</label>
                  <input
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => {
                      setDimensions({ ...dimensions, width: parseInt(e.target.value) || 0 });
                      setActivePreset(null);
                    }}
                    className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-surface-500 mb-1.5 block">Chiều cao</label>
                  <input
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => {
                      setDimensions({ ...dimensions, height: parseInt(e.target.value) || 0 });
                      setActivePreset(null);
                    }}
                    className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setDimensions({ width: preset.width, height: preset.height });
                      setActivePreset(preset.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      activePreset === preset.id
                        ? 'bg-brand-50 border-brand-200 text-brand-600'
                        : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    {preset.id === 'fullhd' ? '1080p' : preset.id === '4k' ? '4K' : preset.name.split(' ')[1] || preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Resize Mode */}
            <div>
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4 block">Chế độ & Tỉ lệ</label>
              <div className="flex p-1 bg-surface-50 rounded-xl border border-surface-100 gap-1">
                {(['fill', 'fit', 'stretch'] as ResizeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-[11px] font-bold rounded-lg capitalize transition-all ${
                      mode === m
                        ? 'bg-white shadow-sm text-brand-600 ring-1 ring-surface-200'
                        : 'text-surface-400 hover:text-surface-600'
                    }`}
                  >
                    {m === 'fill' ? 'Phủ đầy' : m === 'fit' ? 'Vừa vặn' : 'Kéo dãn'}
                  </button>
                ))}
              </div>
            </div>

            {/* Format & Quality */}
            <div>
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4 block">Định dạng & Nén</label>
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-surface-500 mb-1.5 block">Định dạng file</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all bg-white"
                  >
                    <option value="image/jpeg">JPG (Nén tốt nhất)</option>
                    <option value="image/png">PNG (Không mất chất lượng)</option>
                  </select>
                </div>

                {format !== 'image/png' && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-surface-500 mb-2">
                      <span>Chất lượng</span>
                      <span className="text-brand-600">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Info card */}
            <div className="bg-brand-50 rounded-2xl p-5 border border-brand-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <ImageIcon className="w-4 h-4 text-brand-600" />
                </div>
                <span className="text-xs font-bold text-brand-900">Mẹo Resizer</span>
              </div>
              <p className="text-[11px] text-brand-700 leading-relaxed font-medium">
                Sử dụng <b>4K</b> cho bản in chất lượng cao, hoặc <b>Fill</b> để đảm bảo không có viền đen khi đăng mạng xã hội.
              </p>
            </div>

            {/* Download */}
            <div className="mt-auto pt-8 border-t border-surface-100 space-y-4">
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-100">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-surface-400 font-bold uppercase tracking-tight">Cấu hình xuất</span>
                  <span className="text-brand-600 font-bold">
                    {format === 'image/png' ? 'Dung lượng gốc' : quality < 0.5 ? 'Siêu nhẹ' : quality < 0.8 ? 'Cân bằng' : 'Chất lượng cao'}
                  </span>
                </div>
                <div className="text-[10px] text-surface-400 italic">
                  {format.split('/')[1].toUpperCase()} • {format === 'image/png' ? 'Lossless' : `${Math.round(quality * 100)}%`}
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="w-full bg-surface-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-surface-800 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-surface-200 cursor-pointer"
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
  );
}
