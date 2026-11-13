import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { KaizenAiRecommendation, StationInput } from '../types/kaizen';

interface Step3KaizenPanelProps {
  hasData: boolean;
  isAnalyzing: boolean;
  aiError: string | null;
  recommendation: KaizenAiRecommendation | null;
  optimizedLine: StationInput[] | null;
  totalBeforeWorkers: number;
  showVerification: boolean;
  onAnalyzeWithGemini: () => Promise<void>;
  onToggleVerification: () => void;
}

export function Step3KaizenPanel({
  hasData,
  isAnalyzing,
  aiError,
  recommendation,
  optimizedLine,
  totalBeforeWorkers,
  showVerification,
  onAnalyzeWithGemini,
  onToggleVerification,
}: Step3KaizenPanelProps) {
  const totalAfterWorkers = optimizedLine
    ? optimizedLine.reduce((sum, s) => sum + s.SoLaoDong, 0)
    : totalBeforeWorkers;

  return (
    <section
      aria-labelledby="step-3-heading"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <p className="text-xs font-semibold text-blue-600">
            Bước 3 · Đề xuất Kaizen Nhân văn (Gemini AI)
          </p>
          <h2 id="step-3-heading" className="text-lg font-bold text-slate-900 mt-1">
            Phân tích &amp; Tối ưu Cân bằng Chuyền bằng AI
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Chuyên gia IE ảo phân tích nguyên nhân nghẽn, điều chuyển lao động không sa thải và gợi ý
            gá cữ / máy chuyên dùng ngành may.
          </p>
        </div>

        <button
          type="button"
          onClick={onAnalyzeWithGemini}
          disabled={!hasData || isAnalyzing}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Đang phân tích chuyền may...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Phân tích Kaizen với Gemini</span>
            </>
          )}
        </button>
      </div>

      {!hasData && (
        <p className="mt-4 text-sm text-slate-500">
          Vui lòng nạp dữ liệu chuyền may ở Bước 1 trước khi kích hoạt phân tích Gemini AI.
        </p>
      )}

      {aiError && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Không thể phân tích với Gemini AI</p>
            <p className="mt-0.5">{aiError}</p>
          </div>
        </div>
      )}

      {recommendation && (
        <div className="mt-6 space-y-5" data-testid="ai-recommendations-panel">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold">Cam kết: 0% sa thải nhân sự</span>
              <span className="text-xs text-emerald-800 hidden sm:inline">
                · Bảo toàn việc làm cho toàn bộ công nhân chuyền may
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums font-semibold text-emerald-900 whitespace-nowrap">
              Tổng lao động: {totalBeforeWorkers} → {totalAfterWorkers} công nhân
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Nguyên nhân gốc rễ ({recommendation.bottleneck_id})</span>
              </div>
              <p className="text-sm text-slate-800 mt-2 leading-relaxed">
                {recommendation.root_cause_vi}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                <ArrowRightLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Điều chuyển nhân sự (0% Sa thải)</span>
              </div>
              <p className="text-sm text-slate-800 mt-2 leading-relaxed">
                {recommendation.human_reallocation_vi}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Wrench className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
                <span>Giải pháp Kỹ thuật Ngành may (Gá cữ / Máy chuyên dùng)</span>
              </div>
              <p className="text-sm text-slate-800 mt-2 leading-relaxed">
                {recommendation.technical_kaizen_vi}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Thời gian hoàn vốn thiết bị dự kiến (ROI)</span>
                </div>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                  {recommendation.estimated_roi_months}{' '}
                  <span className="text-sm font-sans font-medium text-slate-600">tháng</span>
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Tính dựa trên chi phí gá cữ/thiết bị bổ sung và mức tăng sản lượng đầu ra.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>
                Phương án đã sẵn sàng kiểm chứng mô phỏng Trước / Sau trên toàn bộ{' '}
                {optimizedLine?.length ?? 0} công đoạn.
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleVerification}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {showVerification
                  ? 'Đang hiển thị Kiểm chứng Trước / Sau'
                  : 'Mô phỏng kiểm chứng phương án mới'}
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
