import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  FileText,
  Trash2,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Package,
  ChevronDown,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import DropZone from './shared/DropZone.tsx';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

// --- Types ---
interface PagePreview {
  pageNum: number;
  thumbnail: string;
  selected: boolean;
}

interface OutputSize {
  id: string;
  name: string;
  width: number;
  height: number | null; // null = maintain aspect ratio
}

// --- Constants ---
const OUTPUT_SIZES: OutputSize[] = [
  { id: 'fullhd', name: 'Full HD (1920px)', width: 1920, height: null },
  { id: '2k', name: '2K (2560px)', width: 2560, height: null },
  { id: '4k', name: '4K (3840px)', width: 3840, height: null },
  { id: 'custom', name: 'Tùy chỉnh', width: 1920, height: null },
];

export default function PdfConverter() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/png');
  const [quality, setQuality] = useState(0.95);
  const [selectedSize, setSelectedSize] = useState<string>('fullhd');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState<number | ''>('');
  const [selectAll, setSelectAll] = useState(true);

  const pdfDocRef = useRef<any>(null);

  // Load PDF file
  const handleFileSelected = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('Vui lòng chọn file PDF');
      return;
    }

    setIsLoading(true);
    setPdfFile(file);
    setPdfFileName(file.name.replace('.pdf', ''));

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);

      // Generate thumbnails for all pages
      const previews: PagePreview[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Small scale for thumbnails
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, viewport }).promise;
        previews.push({
          pageNum: i,
          thumbnail: canvas.toDataURL('image/jpeg', 0.6),
          selected: true,
        });
      }
      setPages(previews);
      setSelectAll(true);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Không thể đọc file PDF. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle page selection
  const togglePage = (pageNum: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageNum === pageNum ? { ...p, selected: !p.selected } : p
      )
    );
  };

  // Toggle all pages
  const toggleAllPages = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    setPages((prev) => prev.map((p) => ({ ...p, selected: newState })));
  };

  // Get output dimensions based on selected size
  const getOutputDimensions = (defaultWidth: number, defaultHeight: number): { width: number; height: number } => {
    if (selectedSize === 'custom') {
      const width = customWidth || defaultWidth;
      const height = customHeight ? Number(customHeight) : width * (defaultHeight / defaultWidth);
      return { width, height };
    }
    const size = OUTPUT_SIZES.find((s) => s.id === selectedSize);
    const width = size?.width || 1920;
    const height = width * (defaultHeight / defaultWidth);
    return { width, height };
  };

  // Render single page at high resolution
  const renderPage = async (pageNum: number): Promise<Blob> => {
    const pdf = pdfDocRef.current;
    if (!pdf) throw new Error('PDF not loaded');

    try {
      const page = await pdf.getPage(pageNum);
      const defaultViewport = page.getViewport({ scale: 1 });
      
      const { width, height } = getOutputDimensions(defaultViewport.width, defaultViewport.height);
      const scaleX = width / defaultViewport.width;
      const scaleY = height / defaultViewport.height;

      // We use scaleX for the viewport to get crisp text rendering
      // We'll scale the context to match the exact requested Y dimension if it differs
      const viewport = page.getViewport({ scale: scaleX });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      // If aspect ratio changed, we need to scale the Y axis
      if (Math.abs(scaleX - scaleY) > 0.01) {
        ctx.scale(1, scaleY / scaleX);
      }

      // White background for non-transparent formats
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Use toDataURL as fallback if toBlob fails
      return new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                // Fallback: convert dataURL to blob
                const dataUrl = canvas.toDataURL(format, format === 'image/png' ? undefined : quality);
                fetch(dataUrl)
                  .then((res) => res.blob())
                  .then(resolve)
                  .catch(reject);
              }
            },
            format,
            format === 'image/png' ? undefined : quality
          );
        } catch (err) {
          // Final fallback
          const dataUrl = canvas.toDataURL(format, format === 'image/png' ? undefined : quality);
          fetch(dataUrl)
            .then((res) => res.blob())
            .then(resolve)
            .catch(reject);
        }
      });
    } catch (error) {
      console.error(`Error rendering page ${pageNum}:`, error);
      throw error;
    }
  };

  // Download single page
  const downloadSinglePage = async (pageNum: number) => {
    setIsConverting(true);
    try {
      const blob = await renderPage(pageNum);
      const ext = format === 'image/png' ? 'png' : 'jpg';
      saveAs(blob, `${pdfFileName}_page_${pageNum}.${ext}`);
    } catch (error) {
      console.error('Error converting page:', error);
    } finally {
      setIsConverting(false);
    }
  };

  // Download all selected pages
  const downloadAllPages = async () => {
    const selectedPages = pages.filter((p) => p.selected);
    if (selectedPages.length === 0) {
      alert('Vui lòng chọn ít nhất 1 trang');
      return;
    }

    setIsConverting(true);
    setConvertProgress(0);

    try {
      const ext = format === 'image/png' ? 'png' : 'jpg';

      if (selectedPages.length === 1) {
        // Single page - download directly
        const blob = await renderPage(selectedPages[0].pageNum);
        saveAs(blob, `${pdfFileName}_page_${selectedPages[0].pageNum}.${ext}`);
      } else {
        // Multiple pages - create ZIP
        const zip = new JSZip();
        const folder = zip.folder(pdfFileName)!;

        for (let i = 0; i < selectedPages.length; i++) {
          const page = selectedPages[i];
          const blob = await renderPage(page.pageNum);
          folder.file(`page_${String(page.pageNum).padStart(3, '0')}.${ext}`, blob);
          setConvertProgress(Math.round(((i + 1) / selectedPages.length) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${pdfFileName}_images.zip`);
      }
    } catch (error) {
      console.error('Error converting pages:', error);
      alert('Có lỗi khi chuyển đổi. Vui lòng thử lại.');
    } finally {
      setIsConverting(false);
      setConvertProgress(0);
    }
  };

  // Reset
  const reset = () => {
    setPdfFile(null);
    setPdfFileName('');
    setPages([]);
    setTotalPages(0);
    pdfDocRef.current = null;
  };

  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <AnimatePresence mode="wait">
      {!pdfFile ? (
        <DropZone
          key="upload"
          accept=".pdf,application/pdf"
          onFileSelected={handleFileSelected}
          title="Kéo thả file PDF"
          subtitle="Chuyển đổi PDF sang ảnh PNG/JPG chất lượng cao"
          supportedFormats="PDF files"
          icon={<FileText className="text-surface-400 group-hover:text-brand-600 w-10 h-10 transition-colors" />}
        />
      ) : isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12 text-brand-500" />
          </motion.div>
          <p className="text-surface-500 font-medium">Đang đọc file PDF...</p>
        </motion.div>
      ) : (
        <div key="editor" className="flex-1 flex overflow-hidden w-full">
          {/* Page Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col p-8 overflow-hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-surface-900 font-[Outfit]">
                  {pdfFileName}.pdf
                </h1>
                <p className="text-surface-500">
                  {totalPages} trang • Đã chọn {selectedCount} trang
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAllPages}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-surface-200"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectAll ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Bắt đầu lại
                </button>
              </div>
            </div>

            {/* Page Thumbnails Grid */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {pages.map((page, index) => (
                  <motion.div
                    key={page.pageNum}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`pdf-page-thumb relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      page.selected
                        ? 'border-brand-400 ring-2 ring-brand-100 shadow-md'
                        : 'border-surface-200 hover:border-surface-300 opacity-60'
                    }`}
                    onClick={() => togglePage(page.pageNum)}
                  >
                    <img
                      src={page.thumbnail}
                      alt={`Trang ${page.pageNum}`}
                      className="w-full aspect-[3/4] object-cover bg-white"
                    />

                    {/* Selection indicator */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      page.selected
                        ? 'bg-brand-500 text-white scale-100'
                        : 'bg-white/80 border border-surface-300 scale-90'
                    }`}>
                      {page.selected && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    {/* Page number */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <span className="text-white text-xs font-bold">Trang {page.pageNum}</span>
                    </div>

                    {/* Download single page button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSinglePage(page.pageNum);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-50 hover:scale-110"
                      title={`Tải trang ${page.pageNum}`}
                    >
                      <Download className="w-3.5 h-3.5 text-surface-600" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sidebar Controls */}
          <motion.aside
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 border-l border-surface-200 bg-white p-8 flex flex-col gap-8 shrink-0 overflow-y-auto"
          >
            {/* Output Size */}
            <div>
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4 block">
                Kích thước đầu ra
              </label>
              <div className="space-y-2">
                {OUTPUT_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all flex items-center justify-between ${
                      selectedSize === size.id
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'
                    }`}
                  >
                    <span>{size.name}</span>
                    {selectedSize === size.id && (
                      <CheckCircle2 className="w-4 h-4 text-brand-500" />
                    )}
                  </button>
                ))}
              </div>

              {selectedSize === 'custom' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="text-[11px] font-bold text-surface-500 mb-1.5 block">
                      Chiều rộng (px)
                    </label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                      className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                      min={100}
                      max={7680}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-surface-500 mb-1.5 block">
                      Chiều cao (px)
                    </label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Tự động"
                      className="w-full border border-surface-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                      min={100}
                      max={7680}
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-surface-400 italic">
                      Nếu để trống chiều cao, ảnh sẽ tự động giữ nguyên tỉ lệ PDF.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Format */}
            <div>
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4 block">
                Định dạng ảnh
              </label>
              <div className="flex p-1 bg-surface-50 rounded-xl border border-surface-100 gap-1">
                {[
                  { value: 'image/png' as const, label: 'PNG' },
                  { value: 'image/jpeg' as const, label: 'JPG' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all ${
                      format === f.value
                        ? 'bg-white shadow-sm text-brand-600 ring-1 ring-surface-200'
                        : 'text-surface-400 hover:text-surface-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-surface-400 mt-2 italic">
                {format === 'image/png'
                  ? 'PNG: Chất lượng cao nhất, không mất dữ liệu'
                  : 'JPG: Dung lượng nhỏ hơn, có thể điều chỉnh chất lượng'}
              </p>
            </div>

            {/* Quality (for JPG) */}
            {format === 'image/jpeg' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
              >
                <label className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4 block">
                  Chất lượng JPG
                </label>
                <div className="flex justify-between text-[11px] font-bold text-surface-500 mb-2">
                  <span>Chất lượng</span>
                  <span className="text-brand-600">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-surface-400 mt-1">
                  <span>Nhỏ gọn</span>
                  <span>Tốt nhất</span>
                </div>
              </motion.div>
            )}

            {/* Info card */}
            <div className="bg-brand-50 rounded-2xl p-5 border border-brand-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <FileText className="w-4 h-4 text-brand-600" />
                </div>
                <span className="text-xs font-bold text-brand-900">Chuyển đổi PDF</span>
              </div>
              <p className="text-[11px] text-brand-700 leading-relaxed font-medium">
                File PDF sẽ được render ở chất lượng <b>FullHD</b> trở lên. Mỗi trang PDF sẽ trở thành 1 file ảnh riêng. Nếu chọn nhiều trang, sẽ tải về dạng <b>ZIP</b>.
              </p>
            </div>

            {/* Summary */}
            <div className="mt-auto pt-8 border-t border-surface-100 space-y-4">
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-100">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-surface-400 font-bold uppercase tracking-tight">Tóm tắt</span>
                  <span className="text-brand-600 font-bold">
                    {selectedCount} trang
                  </span>
                </div>
                <div className="text-[10px] text-surface-400 italic">
                  {format === 'image/png' ? 'PNG' : 'JPG'} • {getOutputWidth()}px • {selectedCount > 1 ? 'ZIP Archive' : 'Single File'}
                </div>
              </div>

              <button
                onClick={downloadAllPages}
                disabled={isConverting || selectedCount === 0}
                className="w-full bg-surface-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-surface-800 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-surface-200 cursor-pointer"
              >
                {isConverting ? (
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                    />
                    <span>Đang chuyển đổi... {convertProgress}%</span>
                  </div>
                ) : (
                  <>
                    {selectedCount > 1 ? (
                      <Package className="w-5 h-5" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    <span>
                      {selectedCount > 1
                        ? `Tải ${selectedCount} trang (ZIP)`
                        : selectedCount === 1
                          ? 'Tải ảnh'
                          : 'Chọn trang để tải'}
                    </span>
                  </>
                )}
              </button>

              {/* Progress bar */}
              {isConverting && (
                <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${convertProgress}%` }}
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                  />
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
