import {
  ArrowRightLeft,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProfitComparisonResult, ThemeMode } from '../types/kaizen';
import { formatCompactVnd, formatVnd } from '../utils/streamingAggregator';

interface ProfitComparisonChartsProps {
  comparison: ProfitComparisonResult | null;
  theme: ThemeMode;
}

export function ProfitComparisonCharts({
  comparison,
  theme,
}: ProfitComparisonChartsProps) {
  if (!comparison) {
    return null;
  }

  const isDark = theme === 'dark';
  const {
    beforeFinancials,
    afterFinancials,
    beforeSummary,
    afterSummary,
    retention,
    trendWithForecast,
  } = comparison;

  // Chart 1 data (converted to Triệu VNĐ for clean Y-axis scale while preserving exact VNĐ in tooltip)
  const toMillions = (vnd: number) => Number((vnd / 1_000_000).toFixed(1));
  const financialChartData = [
    {
      metric: 'Doanh thu bán hàng',
      beforeVal: toMillions(beforeFinancials.realizedRevenueVnd),
      afterVal: toMillions(afterFinancials.realizedRevenueVnd),
      beforeExact: beforeFinancials.realizedRevenueVnd,
      afterExact: afterFinancials.realizedRevenueVnd,
    },
    {
      metric: 'Tổng chi phí vận hành',
      beforeVal: toMillions(beforeFinancials.totalOperatingCostVnd),
      afterVal: toMillions(afterFinancials.totalOperatingCostVnd),
      beforeExact: beforeFinancials.totalOperatingCostVnd,
      afterExact: afterFinancials.totalOperatingCostVnd,
    },
    {
      metric: 'Thiệt hại hàng lỗi',
      beforeVal: toMillions(beforeFinancials.defectLossVnd),
      afterVal: toMillions(afterFinancials.defectLossVnd),
      beforeExact: beforeFinancials.defectLossVnd,
      afterExact: afterFinancials.defectLossVnd,
    },
    {
      metric: 'Lợi nhuận ròng',
      beforeVal: toMillions(beforeFinancials.netProfitVnd),
      afterVal: toMillions(afterFinancials.netProfitVnd),
      beforeExact: beforeFinancials.netProfitVnd,
      afterExact: afterFinancials.netProfitVnd,
    },
  ];

  // Chart 2 data (7-year 28 quarters + Forecast) in Tỷ VNĐ
  const toBillions = (vnd: number | null | undefined) =>
    vnd === null || vnd === undefined ? null : Number((vnd / 1_000_000_000).toFixed(2));

  const trendChartData = trendWithForecast.map((pt) => ({
    quarter: pt.quarter,
    marketContext: pt.marketContext,
    revenueTy: toBillions(pt.realizedRevenueVnd),
    profitTy: toBillions(pt.netProfitVnd),
    forecastRevenueTy: toBillions(pt.projectedRevenueVnd),
    forecastProfitTy: toBillions(pt.projectedProfitVnd),
  }));

  // Chart 3 operational metrics (separated by unit scale)
  const throughputChartData = [
    {
      name: 'Năng suất (sp/h)',
      before: beforeSummary.hourlyLineThroughput,
      after: afterSummary.hourlyLineThroughput,
    },
    {
      name: 'Hiệu suất (%)',
      before: beforeSummary.weightedProductivityPct,
      after: afterSummary.weightedProductivityPct,
    },
  ];

  const defectChartData = [
    {
      name: 'Tỷ lệ lỗi (%)',
      before: beforeSummary.overallDefectRatePct,
      after: afterSummary.overallDefectRatePct,
    },
  ];

  return (
    <section
      aria-labelledby="profit-comparison-heading"
      data-testid="profit-comparison-charts"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 transition-colors"
    >
      {/* Header & Strategy Summary */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {comparison.regimeLabelVi}
          </p>
          <h2
            id="profit-comparison-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            So sánh Hiệu quả Tài chính &amp; Vận hành: Trước vs. Sau Tối ưu (Dự tính)
          </h2>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
            {comparison.strategyHeadlineVi}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 tabular-nums">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2">
            <span className="block text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
              Tăng trưởng Lợi nhuận ròng
            </span>
            <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {comparison.profitDeltaPct >= 0
                ? `+${comparison.profitDeltaPct}%`
                : `${comparison.profitDeltaPct}%`}{' '}
              ({formatCompactVnd(comparison.profitDeltaVnd)})
            </span>
          </div>

          <div className="rounded-lg border border-blue-200 dark:border-blue-900/70 bg-blue-50 dark:bg-blue-950/40 px-4 py-2">
            <span className="block text-[11px] font-medium text-blue-800 dark:text-blue-300">
              Chỉ số Nhân văn
            </span>
            <span className="font-mono text-lg font-bold text-blue-700 dark:text-blue-300">
              {retention.humanCenteredIndexPct}% bảo toàn nhân lực
            </span>
          </div>
        </div>
      </div>

      {/* Strategy Bullet Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comparison.strategyDetailsVi.map((detail, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
          >
            <CheckCircle2
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{detail}</span>
          </div>
        ))}
      </div>

      {/* Chart 1 & Chart 2 Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Chart 1: Grouped Financial Bar Chart */}
        <div className="xl:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Biểu đồ 1 · Tài chính: Trước vs. Sau Tối ưu (Triệu VNĐ)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Lợi nhuận sau tối ưu:{' '}
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCompactVnd(afterFinancials.netProfitVnd)}
                </span>{' '}
                ·{' '}
                {comparison.defectLossSavedVnd >= 0
                  ? `Tiết kiệm lỗi ${formatCompactVnd(comparison.defectLossSavedVnd)}`
                  : `Giảm tỷ lệ lỗi ${comparison.defectRateBeforePct}% → ${comparison.defectRateAfterPct}%`}
              </p>
            </div>
          </div>

          <div className="h-[290px] w-full" data-testid="financial-comparison-bar-chart">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                data={financialChartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                barGap={6}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                  vertical={false}
                />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }}
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
                  formatter={(_val: number, name: string, item: { payload?: typeof financialChartData[number] }) => {
                    const p = item.payload;
                    if (!p) return ['', name];
                    const exact =
                      name.includes('Trước') ? p.beforeExact : p.afterExact;
                    return [formatVnd(exact), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar
                  dataKey="beforeVal"
                  name="Trước tối ưu (Hiện trạng)"
                  fill={isDark ? '#64748b' : '#94a3b8'}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="afterVal"
                  name="Sau tối ưu (Dự tính)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 7-Year (28 Quarters) Historical Trend & Forecast Line Chart */}
        <div className="xl:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Biểu đồ 2 · Chuỗi 7 năm (28 Quý) Doanh thu &amp; Lợi nhuận + Dự báo Kaizen (Tỷ VNĐ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phản ánh chu kỳ thị trường 2020–2026 và đường bứt phá lợi nhuận sau khi áp dụng
              KAIZEN.
            </p>
          </div>

          <div className="h-[290px] w-full" data-testid="seven-year-forecast-line-chart">
            <ResponsiveContainer width="100%" height={290}>
              <LineChart
                data={trendChartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                  vertical={false}
                />
                <XAxis
                  dataKey="quarter"
                  tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10 }}
                  axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit=" tỷ"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label: string) => {
                    const row = trendChartData.find((d) => d.quarter === label);
                    return row?.marketContext ? `${label} — ${row.marketContext}` : label;
                  }}
                  formatter={(value: number, name: string) => [`${value} tỷ đ`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line
                  type="monotone"
                  dataKey="revenueTy"
                  name="Doanh thu lịch sử (Tỷ đ)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="profitTy"
                  name="Lợi nhuận ròng lịch sử (Tỷ đ)"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecastRevenueTy"
                  name="Doanh thu dự tính Sau Kaizen"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecastProfitTy"
                  name="Lợi nhuận dự tính Sau Kaizen"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="5 4"
                  dot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Operational Impact + Human Retention Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
            Biểu đồ 3 · Năng suất Chuyền (sp/h) &amp; Giảm Tỷ lệ Hàng lỗi (%)
          </h3>
          <div
            className="grid grid-cols-1 sm:grid-cols-12 gap-4 h-[220px]"
            data-testid="operational-impact-chart"
          >
            <div className="sm:col-span-7 h-full">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={throughputChartData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 4 }}
                  barGap={6}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#1e293b' : '#e2e8f0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }}
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="before"
                    name="Trước tối ưu"
                    fill={isDark ? '#64748b' : '#94a3b8'}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="after"
                    name="Sau tối ưu"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="sm:col-span-5 h-full">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={defectChartData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#1e293b' : '#e2e8f0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val: number, name: string) => [`${val}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="before"
                    name="Trước (% lỗi)"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="after"
                    name="Sau (% lỗi)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Human Retention Card */}
        <div
          data-testid="human-retention-card"
          className="xl:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thẻ Tác động Nhân văn &amp; Bảo toàn Việc làm
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Phân bổ nguồn lực trong khung {retention.initialWorkers} công nhân hiện hữu
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{retention.humanCenteredIndexPct}% Nhân văn</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/70 bg-white dark:bg-slate-900 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Giữ nguyên &amp; Nâng tay nghề</span>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                {retention.retainedAndUpskilledWorkers} CN
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Đào tạo tại bàn + gá cữ
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 dark:border-blue-900/70 bg-white dark:bg-slate-900 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <ArrowRightLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Điều chuyển liên tổ</span>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                {retention.reallocatedCrossTeamWorkers} CN
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Hỗ trợ khâu nghẽn {beforeSummary.bottleneckStageId ?? 'CD4'}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 dark:border-amber-900/70 bg-white dark:bg-slate-900 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <UserMinus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Tinh giản cá biệt (&lt;35%)</span>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                {retention.trimmedOutlierWorkers} CN
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate" title={retention.trimmedWorkerIds.join(', ')}>
                {retention.trimmedWorkerIds.length > 0
                  ? retention.trimmedWorkerIds.join(', ')
                  : '0% sa thải (Giữ 100%)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Lợi nhuận mở khóa doanh thu:{' '}
              <strong className="font-mono text-slate-900 dark:text-white">
                {formatCompactVnd(comparison.revenueUnlockedProfitVnd)}
              </strong>
            </span>
            <span>
              Tiết kiệm lãng phí lỗi &amp; nhân công:{' '}
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                {formatCompactVnd(comparison.wasteReductionProfitVnd)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
