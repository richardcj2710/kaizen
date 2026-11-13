import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { IngestionProgress } from '../types/kaizen';
import { formatRowsVietnamese } from '../utils/streamingAggregator';

interface DataInputPanelProps {
  hasData: boolean;
  sourceLabel: string | null;
  errorMessage: string | null;
  progress: IngestionProgress;
  onLoadSample: () => void;
  onUploadFiles: (files: File[]) => Promise<void>;
  onDownloadTemplate: () => void;
  onClearData: () => void;
}

function formatGigabytesLabel(bytesRead: number, totalBytes: number): string {
  const gbRead = bytesRead / (1024 * 1024 * 1024);
  const gbTotal = totalBytes / (1024 * 1024 * 1024);
  if (gbTotal >= 0.05) {
    return `${gbRead.toFixed(2)} / ${gbTotal.toFixed(2)} GB`;
  }
  const mbRead = bytesRead / (1024 * 1024);
  const mbTotal = totalBytes / (1024 * 1024);
  return `${gbRead.toFixed(3)} / ${gbTotal.toFixed(3)} GB (${mbRead.toFixed(2)}/${mbTotal.toFixed(2)} MB)`;
}

export function DataInputPanel({
  hasData,
  sourceLabel,
  errorMessage,
  progress,
  onLoadSample,
  onUploadFiles,
  onDownloadTemplate,
  onClearData,
}: DataInputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isProcessing = progress.status === 'processing';
  const progressPct =
    progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.bytesRead / progress.totalBytes) * 100))
      : 0;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    await onUploadFiles(Array.from(fileList));
  };

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    await handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    await handleFiles(e.dataTransfer.files);
  };

  return (
    <section
      aria-labelledby="step-1-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors"
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Bước 1 · Đọc Luồng Tuần tự 10+ GB (Web Worker &lt; 150 MB RAM)
          </p>
          <h2
            id="step-1-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            Dữ liệu Nhật ký Chuyền may Đa năm (7 năm · 28 Quý · Tài chính &amp; Năng suất)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Xử lý tuần tự từng tệp qua luồng đọc byte trực tiếp (70+ triệu dòng) hoặc nạp nhanh bộ
            dữ liệu SME 7 năm (2020-Q1 → 2026-Q4 · 76 công nhân).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:whitespace-nowrap max-w-full text-center"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nạp dữ liệu mẫu SME (7 năm · 28 Quý · 76 CN)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadTemplate}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Tải file mẫu (.xlsx)</span>
          </button>

          {hasData && (
            <button
              type="button"
              onClick={onClearData}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`lg:col-span-2 rounded-lg border-2 border-dashed transition-colors p-5 flex flex-col justify-between gap-4 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Tải lên nhiều tệp dữ liệu chuyền may (.csv, .xlsx)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Kéo thả nhiều tệp 2020-Q1 → 2026-Q4 (10–15 GB / 70+ triệu dòng) để đọc tuần tự
                  từng file ở tốc độ cao.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <input
                ref={fileInputRef}
                id="kaizen-multi-file-upload"
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={handleInputChange}
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 whitespace-nowrap"
              >
                {isProcessing ? 'Đang đọc luồng...' : 'Chọn nhiều tệp (.csv, .xlsx)'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Khuyến nghị tệp lớn (&gt; 250 MB):</strong> Hãy sử dụng định dạng{' '}
              <span className="font-mono font-semibold">.csv</span> cho dữ liệu nhiều GB vì cấu
              trúc XML của <span className="font-mono">.xlsx</span> phải giải nén toàn bộ vào RAM
              trình duyệt, trong khi <span className="font-mono">.csv</span> đọc luồng từng dòng
              dưới 150 MB RAM.
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cấu trúc cột 3 tầng &amp; Tài chính
            </p>
            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-2 leading-relaxed break-words">
              Nam, Quy (2020-Q1..2026-Q4), BoiCanh_ThiTruong, DonGia_Ban, ChiPhi_NVL_SP,
              NhuCau_DonHang_To, id, TenCongDoan, ToSanXuat, MaCongNhan, SoLaoDong, TG_SMV, WIP,
              Luong_Thang, HieuSuat_TB, SanLuong_Ca, DoanhThu_DongGop, SoHangLoi, TyLeLoi,
              GiaiPhap_KyThuat, ChiPhi_ThietBi
            </p>
          </div>
          {sourceLabel && (
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              Nguồn đang nạp: {sourceLabel}
            </p>
          )}
        </div>
      </div>

      {/* Real-time Sequential Streaming Progress Bar */}
      {(isProcessing || (progress.status === 'done' && progress.totalBytes > 0)) && (
        <div
          data-testid="streaming-progress-panel"
          className="mt-4 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              {isProcessing
                ? `Đang xử lý file [${Math.max(1, progress.currentFileIndex)}/${progress.totalFiles}]: ${progress.currentFileName}`
                : `Hoàn tất xử lý tuần tự [${progress.totalFiles}/${progress.totalFiles}] tệp`}
            </span>
            <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              <span>{formatGigabytesLabel(progress.bytesRead, progress.totalBytes)}</span>
              <span>{formatRowsVietnamese(progress.rowsAggregated)}</span>
              <span>{progress.speedMbPerSec} MB/s</span>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 rounded-full bg-blue-100 dark:bg-slate-800 overflow-hidden"
          >
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
}
