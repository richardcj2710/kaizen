import {
  AlertCircle,
  ArrowRightLeft,
  BadgeDollarSign,
  CheckCircle2,
  DollarSign,
  HeartHandshake,
  Loader2,
  PackageCheck,
  Play,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserMinus,
  Users,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  KaizenAiRecommendation,
  QuarterSummary,
  ThemeMode,
  VerificationMetrics,
} from '../types/kaizen';
import { formatVnd } from '../utils/streamingAggregator';

interface AiKaizenPanelProps {
  theme: ThemeMode;
  hasData: boolean;
  isAnalyzing: boolean;
  aiError: string | null;
  recommendation: KaizenAiRecommendation | null;
  optimizedSummary: QuarterSummary | null;
  verificationMetrics: VerificationMetrics | null;
  showVerification: boolean;
  onAnalyzeWithGemini: () => Promise<void>;
  onActivateVerification: () => void;
}

export function AiKaizenPanel({
  theme,
  hasData,
  isAnalyzing,
  aiError,
  recommendation,
  optimizedSummary,
  verificationMetrics,
  showVerification,
  onAnalyzeWithGemini,
  onActivateVerification,
}: AiKaizenPanelProps) {
  const isDark = theme === 'dark';

  return (
    <section
      aria-labelledby="step-3-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Bước 3 · Tư vấn IE &amp; Quản trị Chất lượng SME (Gemini AI)
          </p>
          <h2
            id="step-3-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            Phân tích Tổ Nghẽn, Giảm Hàng Lỗi &amp; Điều phối Nhân sự (50–100 CN)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Chỉ gửi bản tóm tắt 3 tầng Quý → Khâu → Tổ (không gửi dữ liệu thô) để đề xuất điều
            chuyển liên tổ, xử lý mã công nhân cá biệt và gá cữ / Inline QC.
          </p>
        </div>

        <button
          type="button"
          onClick={onAnalyzeWithGemini}
          disabled={!hasData || isAnalyzing}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 whitespace-nowrap shrink-0"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Đang phân tích 3 tầng dữ liệu...</span>
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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vui lòng nạp dữ liệu chuyền may SME ở Bước 1 trước khi kích hoạt phân tích Gemini AI.
        </p>
      )}

      {aiError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800 dark:text-red-200"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Không thể phân tích với Gemini AI</p>
            <p className="mt-0.5">{aiError}</p>
          </div>
        </div>
      )}

      {recommendation && (
        <div className="space-y-5" data-testid="ai-recommendations-panel">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  Chẩn đoán Tổ Nghẽn &amp; Tỷ lệ Hàng lỗi ({recommendation.bottleneck_stage_id} ·{' '}
                  {recommendation.weakest_team_name})
                </span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.bottleneck_and_defect_diagnosis_vi}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <span className="inline-flex items-center gap-2">
                  <UserMinus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Xử lý Cá biệt (&lt;35% NS / &gt;4.5% lỗi)
                </span>
                <span className="font-mono tabular-nums">
                  {recommendation.flagged_worker_ids.join(', ') ||
                    `Giảm ${recommendation.recommended_layoff_count} vị trí`}
                </span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.outlier_layoff_evaluation_vi}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <ArrowRightLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Điều chuyển Nhân sự Liên Tổ (55%–65%)</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.cross_team_reallocation_vi}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  Gá cữ may chống lệch &amp; Inline QC tại bàn
                </span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  Giảm ~{recommendation.projected_defect_reduction_pct}% lỗi · ROI{' '}
                  {recommendation.estimated_roi_months}T
                </span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.technical_and_quality_kaizen_vi}
              </p>
            </div>
          </div>

          <div
            data-testid="ai-financial-human-cards"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <BadgeDollarSign className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Chiến lược Tối đa hóa Lợi nhuận</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.profit_maximization_strategy_vi}
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/25 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
                <Scale className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Mở khóa Doanh thu vs. Cắt giảm Lãng phí</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.revenue_vs_waste_split_vi}
              </p>
            </div>

            <div className="rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/25 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
                <HeartHandshake className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Bảo toàn Sinh kế Công nhân</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
                {recommendation.human_livelihood_protection_vi}
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                Phương án sẵn sàng kiểm chứng trên sơ đồ 2D ({optimizedSummary?.stages.length ?? 0}{' '}
                khâu) và biểu đồ Trước / Sau.
              </span>
            </div>

            <button
              type="button"
              onClick={onActivateVerification}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {showVerification
                  ? 'Đang hiển thị Kiểm chứng Phương án Mới'
                  : 'Mô phỏng kiểm chứng phương án mới'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Before vs. After Verification Dashboard */}
      {showVerification && verificationMetrics && (
        <div
          data-testid="verification-dashboard"
          className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6"
        >
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Kiểm chứng Trước / Sau Phương án Mới
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              Sản lượng Cân bằng, Giảm Tỷ lệ Hàng lỗi &amp; Hạ Chi phí Đơn vị
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/35 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Năng suất đầu ra chuyền
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-2">
                {verificationMetrics.throughputIncreasePct >= 0
                  ? `+${verificationMetrics.throughputIncreasePct}%`
                  : `${verificationMetrics.throughputIncreasePct}%`}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-1">
                {verificationMetrics.beforeThroughput} → {verificationMetrics.afterThroughput} sp/giờ
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/35 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Giảm tỷ lệ hàng lỗi
                </span>
                <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-2">
                -{verificationMetrics.defectRateReductionPct}%
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-1">
                {verificationMetrics.beforeDefectRatePct}% →{' '}
                {verificationMetrics.afterDefectRatePct}% lỗi
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Giảm chi phí NC / SP
                </span>
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                -{verificationMetrics.unitCostReductionPct}%
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-1">
                {formatVnd(verificationMetrics.beforeUnitCost)} →{' '}
                {formatVnd(verificationMetrics.afterUnitCost)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nhân sự &amp; Giảm WIP
                </span>
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                {verificationMetrics.beforeTotalWorkers} → {verificationMetrics.afterTotalWorkers}{' '}
                <span className="text-sm font-sans font-medium text-slate-600 dark:text-slate-400">
                  CN
                </span>
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 mt-1">
                WIP -{verificationMetrics.wipReductionPct}% · ROI{' '}
                {verificationMetrics.estimatedRoiMonths}T
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            <div className="xl:col-span-7 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                So sánh Sản lượng Trước &amp; Sau Kaizen theo Khâu (sp/giờ)
              </h4>
              <div className="h-[280px] w-full mt-3" data-testid="before-after-chart">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={verificationMetrics.comparisons}
                    margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                    barGap={6}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#1e293b' : '#e2e8f0'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="id"
                      tick={{
                        fill: isDark ? '#cbd5e1' : '#334155',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar
                      dataKey="beforeCapacity"
                      name="Trước Kaizen (sp/h)"
                      fill={isDark ? '#64748b' : '#94a3b8'}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="afterCapacity"
                      name="Sau Kaizen (sp/h)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 p-5 overflow-x-auto">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                Đối chiếu Trước / Sau theo Khâu
              </h4>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-2 px-2 font-semibold">Khâu</th>
                    <th className="py-2 px-2 text-right font-semibold">CN</th>
                    <th className="py-2 px-2 text-right font-semibold">SL (sp/h)</th>
                    <th className="py-2 px-2 text-right font-semibold">% Lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {verificationMetrics.comparisons.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-2">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {row.id}
                        </span>
                        <div
                          className="text-slate-500 dark:text-slate-400 truncate max-w-[130px]"
                          title={row.TenCongDoan}
                        >
                          {row.TenCongDoan}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.beforeWorkers} →{' '}
                        <span className="font-bold text-slate-900 dark:text-white">
                          {row.afterWorkers}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.beforeCapacity} →{' '}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {row.afterCapacity}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.beforeDefectRate.toFixed(1)}% →{' '}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {row.afterDefectRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
