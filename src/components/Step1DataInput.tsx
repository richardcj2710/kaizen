import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { StationInput } from '../types/kaizen';

interface Step1DataInputProps {
  hasData: boolean;
  sourceLabel: string | null;
  errorMessage: string | null;
  onLoadSample: () => void;
  onUploadFile: (file: File) => Promise<void>;
  onDownloadTemplate: () => void;
  onClearData: () => void;
  stations: StationInput[];
}

export function Step1DataInput({
  hasData,
  sourceLabel,
  errorMessage,
  onLoadSample,
  onUploadFile,
  onDownloadTemplate,
  onClearData,
}: Step1DataInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setIsParsing(true);
    try {
      await onUploadFile(file);
    } finally {
      setIsParsing(false);
    }
  };

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await handleFile(file);
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
    const file = e.dataTransfer.files?.[0];
    await handleFile(file);
  };

  return (
    <section
      aria-labelledby="step-1-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <p className="text-xs font-semibold text-blue-600">Bước 1 · Nhập dữ liệu đầu vào</p>
          <h2 id="step-1-heading" className="text-lg font-bold text-slate-900 mt-1">
            Dữ liệu Công đoạn Chuyền may (B10–B12)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Tải lên bảng thông số chuyền may theo chuẩn SMV hoặc nạp nhanh bộ dữ liệu mẫu chuyền áo Polo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nạp dữ liệu mẫu (Chuyền áo Polo 6 công đoạn)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Tải file mẫu (.xlsx)</span>
          </button>

          {hasData && (
            <button
              type="button"
              onClick={onClearData}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 whitespace-nowrap shrink-0"
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
          className={`lg:col-span-2 rounded-lg border-2 border-dashed transition-colors p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70'
              : 'border-slate-300 bg-slate-50/60 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
              <Upload className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Tải lên dữ liệu chuyền may (.xlsx, .csv)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Kéo thả tệp Excel/CSV vào đây hoặc nhấn nút chọn tệp từ máy tính.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <input
              ref={fileInputRef}
              id="kaizen-file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleInputChange}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 whitespace-nowrap"
            >
              {isParsing ? 'Đang đọc tệp...' : 'Chọn tệp (.xlsx, .csv)'}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700">Cấu trúc cột chuẩn bắt buộc</p>
            <p className="text-xs font-mono text-slate-600 mt-2 leading-relaxed break-words">
              id, TenCongDoan, SoLaoDong, TG_SMV, WIP, Luong_Thang, GiaiPhap_KyThuat, ChiPhi_ThietBi
            </p>
          </div>
          {sourceLabel && (
            <p className="text-xs text-blue-700 font-medium mt-3 pt-3 border-t border-slate-200">
              Nguồn đang nạp: {sourceLabel}
            </p>
          )}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
}
