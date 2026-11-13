import { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
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
import type { QuarterlyTeamTrendRow, ThemeMode } from '../types/kaizen';

interface QuarterlyTrendsSectionProps {
  trends: QuarterlyTeamTrendRow[];
  theme: ThemeMode;
}

export function QuarterlyTrendsSection({
  trends,
  theme,
}: QuarterlyTrendsSectionProps) {
  const [chartMetric, setChartMetric] = useState<'defect' | 'productivity'>('defect');
  const isDark = theme === 'dark';

  if (trends.length === 0) {
    return null;
  }

  const risingDefectTeams = trends.filter((t) => t.isDefectRisingQoQ);

  return (
    <section
      aria-labelledby="quarterly-trends-heading"
      data-testid="quarterly-trends-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 transition-colors"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Phân tích Chuỗi Thời gian Theo Tổ (Đa năm &amp; Q1–Q4 gần nhất)
          </p>
          <h2
            id="quarterly-trends-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            So sánh Năng suất &amp; Tỷ lệ hàng lỗi theo Quý
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Theo dõi diễn biến từng Tổ từ kỳ đầu ({trends[0]?.firstQuarterLabel ?? 'Q1'}) đến kỳ
            cuối ({trends[0]?.latestQuarterLabel ?? 'Q4'}); cảnh báo đỏ các Tổ có tỷ lệ hàng lỗi
            tăng ({risingDefectTeams.length} tổ cần lưu ý).
          </p>
        </div>

        <div
          role="group"
          aria-label="Chọn chỉ số biểu đồ theo quý"
          className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
        >
          <button
            type="button"
            onClick={() => setChartMetric('defect')}
            aria-pressed={chartMetric === 'defect'}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              chartMetric === 'defect'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tỷ lệ hàng lỗi (% Lỗi)
          </button>
          <button
            type="button"
            onClick={() => setChartMetric('productivity')}
            aria-pressed={chartMetric === 'productivity'}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              chartMetric === 'productivity'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Năng suất Tổ (%)
          </button>
        </div>
      </div>

      {/* Grouped Q1-Q4 BarChart */}
      <div className="h-[300px] w-full" data-testid="quarterly-trend-chart">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={trends}
            margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#1e293b' : '#e2e8f0'}
              vertical={false}
            />
            <XAxis
              dataKey="teamName"
              tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 12 }}
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
              formatter={(value: number, name: string) => [
                `${value}%`,
                name,
              ]}
              labelFormatter={(label: string) => {
                const row = trends.find((t) => t.teamName === label);
                return row ? `${row.teamName} (${row.stageId} · ${row.stageName})` : label;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />

            {chartMetric === 'defect' ? (
              <>
                <Bar dataKey="q1DefectRate" name="Q1 (% Lỗi)" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="q2DefectRate" name="Q2 (% Lỗi)" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="q3DefectRate" name="Q3 (% Lỗi)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="q4DefectRate" name="Q4 (% Lỗi)" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </>
            ) : (
              <>
                <Bar dataKey="q1Productivity" name="Q1 (% NS)" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="q2Productivity" name="Q2 (% NS)" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="q3Productivity" name="Q3 (% NS)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="q4Productivity" name="Q4 (% NS)" fill="#10b981" radius={[3, 3, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Team QoQ Trend Table */}
      <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
              <th className="py-2 px-3 font-semibold">Tổ / Khâu</th>
              <th className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                NS ({trends[0]?.firstQuarterLabel ?? 'Đầu'} →{' '}
                {trends[0]?.latestQuarterLabel ?? 'Cuối'})
              </th>
              <th className="py-2 px-3 text-right font-semibold whitespace-nowrap">Q1 Lỗi</th>
              <th className="py-2 px-3 text-right font-semibold whitespace-nowrap">Q2 Lỗi</th>
              <th className="py-2 px-3 text-right font-semibold whitespace-nowrap">Q3 Lỗi</th>
              <th className="py-2 px-3 text-right font-semibold whitespace-nowrap">Q4 Lỗi</th>
              <th className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                Xu hướng Đầu → Cuối
              </th>
              <th className="py-2 px-3 font-semibold">Công nhân cờ đỏ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {trends.map((row) => {
              const firstProd = row.firstProductivity ?? row.q1Productivity;
              const latestProd = row.latestProductivity ?? row.q4Productivity;
              const latestDef = row.latestDefectRate ?? row.q4DefectRate ?? 0;
              return (
                <tr
                  key={`${row.stageId}-${row.teamName}`}
                  className={
                    row.isDefectRisingQoQ
                      ? 'bg-red-50/75 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/45'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }
                >
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {row.teamName}
                    </span>{' '}
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      ({row.stageId})
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {firstProd ?? '-'}% →{' '}
                    <span
                      className={
                        (latestProd ?? 60) < 35
                          ? 'font-bold text-red-600 dark:text-red-400'
                          : 'font-semibold'
                      }
                    >
                      {latestProd ?? '-'}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {row.q1DefectRate !== null ? `${row.q1DefectRate.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {row.q2DefectRate !== null ? `${row.q2DefectRate.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {row.q3DefectRate !== null ? `${row.q3DefectRate.toFixed(1)}%` : '—'}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                      latestDef > 3.5
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {row.q4DefectRate !== null
                      ? `${row.q4DefectRate.toFixed(1)}%`
                      : row.latestDefectRate !== null
                        ? `${row.latestDefectRate.toFixed(1)}%`
                        : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    {row.isDefectRisingQoQ ? (
                      <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        +{row.defectDeltaFirstToLatest.toFixed(1)}% (Tăng lỗi)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                        <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {row.defectDeltaFirstToLatest > 0
                          ? `+${row.defectDeltaFirstToLatest.toFixed(1)}`
                          : row.defectDeltaFirstToLatest.toFixed(1)}
                        %
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    {row.latestOutlierWorkers.length > 0 ? (
                      <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                        {row.latestOutlierWorkers.join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Không có</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
