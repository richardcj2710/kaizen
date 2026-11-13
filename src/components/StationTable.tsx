import { AlertTriangle, ChevronDown, ChevronUp, Users } from 'lucide-react';
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
import type { QuarterSummary, StageMetrics, ThemeMode } from '../types/kaizen';
import { formatVnd } from '../utils/streamingAggregator';

interface StationTableProps {
  summary: QuarterSummary | null;
  theme: ThemeMode;
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  onUpdateStageField: (
    stageId: string,
    field: 'SoLaoDong' | 'TG_SMV' | 'HieuSuat_TB' | 'TyLeLoi' | 'WIP',
    value: number
  ) => void;
}

export function StationTable({
  summary,
  theme,
  selectedStageId,
  onSelectStage,
  onUpdateStageField,
}: StationTableProps) {
  const stages = summary?.stages ?? [];
  const hasData = stages.length > 0;
  const isDark = theme === 'dark';

  const selectedStage: StageMetrics | null =
    stages.find((st) => st.id === selectedStageId) ?? null;

  const bottleneckStage =
    stages.find((st) => st.isBottleneck) ?? null;
  const highDefectStages = stages.filter((st) => st.isHighDefectStage);

  return (
    <section aria-labelledby="step-2-heading" className="space-y-6">
      {hasData && summary && (bottleneckStage || highDefectStages.length > 0) && (
        <div
          role="status"
          data-testid="bottleneck-alert-card"
          className="rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 transition-colors"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                Cảnh báo Nút thắt &amp; Chất lượng Hàng lỗi (&gt; 3.5%)
              </p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {bottleneckStage
                  ? `Nghẽn chính: ${bottleneckStage.id} — ${bottleneckStage.TenCongDoan}`
                  : 'Cảnh báo vượt ngưỡng hàng lỗi'}
              </h3>
              <p className="text-sm text-red-900 dark:text-red-200 mt-1">
                Sản lượng chuyền hiện đạt{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {summary.hourlyLineThroughput}
                </span>{' '}
                sp/giờ · Khâu vượt ngưỡng lỗi (&gt;3.5%):{' '}
                <span className="font-mono font-semibold">
                  {highDefectStages.map((s) => `${s.id} (${s.TyLeLoi.toFixed(1)}%)`).join(', ') ||
                    'Không có'}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-red-200 dark:border-red-900/60">
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Đầu ra chuyền</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-300 font-mono tabular-nums mt-0.5">
                {summary.hourlyLineThroughput}{' '}
                <span className="text-xs font-sans font-normal">sp/giờ</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                Tỷ lệ lỗi toàn xưởng
              </p>
              <p className="text-xl font-bold text-red-700 dark:text-red-300 font-mono tabular-nums mt-0.5">
                {summary.overallDefectRatePct}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Chi phí NC/SP</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                {formatVnd(summary.unitLaborCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Tổng WIP</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                {summary.totalWip} <span className="text-xs font-sans font-normal">sp</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage Summary Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Bước 2 · Bảng Tổng hợp theo Khâu &amp; Truy xuất Tổ (Stage-to-Team Drill-Down)
            </p>
            <h2
              id="step-2-heading"
              className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
            >
              Thông số từng Khâu Sản xuất
            </h2>
          </div>
          {hasData && summary && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Nhấn nút &ldquo;Xem Tổ&rdquo; ở mỗi dòng để phân tích chi tiết từng Tổ sản xuất
            </span>
          )}
        </div>

        {!hasData ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Chưa có dữ liệu các khâu sản xuất
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nạp dữ liệu mẫu SME hoặc tải lên các tệp .csv/.xlsx ở Bước 1.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                  <th className="py-2.5 px-3 whitespace-nowrap">Khâu</th>
                  <th className="py-2.5 px-3">Tên công đoạn</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Số Tổ</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Lao động</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">SMV</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Hiệu suất (%)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Sản lượng (sp/h)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Tỷ lệ lỗi (%)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">WIP (sp)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Chi tiết Tổ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stages.map((stage) => {
                  const isFlagged = stage.isBottleneck || stage.isHighDefectStage || stage.isLowEfficiencyOutlier;
                  const isOpen = selectedStageId === stage.id;
                  return (
                    <tr
                      key={stage.id}
                      data-bottleneck={stage.isBottleneck ? 'true' : 'false'}
                      data-high-defect={stage.isHighDefectStage ? 'true' : 'false'}
                      className={
                        isFlagged
                          ? 'bg-red-50/75 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/45'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {stage.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 min-w-[170px]">
                        <div>{stage.TenCongDoan}</div>
                        <div className="flex flex-wrap gap-x-2 text-[11px] font-semibold mt-0.5">
                          {stage.isBottleneck && (
                            <span className="text-red-700 dark:text-red-400">Nút thắt cổ chai</span>
                          )}
                          {stage.isHighDefectStage && (
                            <span className="text-red-600 dark:text-red-400">
                              Cảnh báo lỗi &gt;3.5%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {stage.teamCount}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={1}
                          max={200}
                          aria-label={`Số lao động khâu ${stage.id}`}
                          value={stage.SoLaoDong}
                          onChange={(e) =>
                            onUpdateStageField(
                              stage.id,
                              'SoLaoDong',
                              Math.max(1, Math.round(Number(e.target.value) || 1))
                            )
                          }
                          className="w-14 text-right font-mono tabular-nums px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0.1}
                          max={30}
                          step={0.1}
                          aria-label={`SMV khâu ${stage.id}`}
                          value={stage.TG_SMV}
                          onChange={(e) =>
                            onUpdateStageField(
                              stage.id,
                              'TG_SMV',
                              Math.max(0.1, Number(e.target.value) || 0.1)
                            )
                          }
                          className="w-16 text-right font-mono tabular-nums px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={10}
                          max={100}
                          aria-label={`Hiệu suất khâu ${stage.id}`}
                          value={stage.HieuSuat_TB}
                          onChange={(e) =>
                            onUpdateStageField(
                              stage.id,
                              'HieuSuat_TB',
                              Math.min(100, Math.max(10, Math.round(Number(e.target.value) || 10)))
                            )
                          }
                          className={`w-16 text-right font-mono tabular-nums font-bold px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            stage.HieuSuat_TB < 35
                              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400'
                          }`}
                        />
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          stage.isBottleneck
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {stage.Capacity}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          step={0.1}
                          aria-label={`Tỷ lệ lỗi khâu ${stage.id}`}
                          value={stage.TyLeLoi}
                          onChange={(e) =>
                            onUpdateStageField(
                              stage.id,
                              'TyLeLoi',
                              Math.min(50, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className={`w-16 text-right font-mono tabular-nums font-bold px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            stage.TyLeLoi > 3.5
                              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          aria-label={`WIP khâu ${stage.id}`}
                          value={stage.WIP}
                          onChange={(e) =>
                            onUpdateStageField(
                              stage.id,
                              'WIP',
                              Math.max(0, Math.round(Number(e.target.value) || 0))
                            )
                          }
                          className="w-16 text-right font-mono tabular-nums px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectStage(isOpen ? null : stage.id)}
                          aria-expanded={isOpen}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                            isOpen
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span>{isOpen ? 'Thu gọn' : `Xem ${stage.teamCount} Tổ`}</span>
                          {isOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expandable Stage-to-Team Drill-Down Panel */}
      {selectedStage && (
        <div
          data-testid="team-drilldown-panel"
          className="bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-800 rounded-xl p-6 space-y-5 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Truy xuất chi tiết Tổ sản xuất · Khâu {selectedStage.id}
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Chi tiết Năng suất &amp; Hàng lỗi từng Tổ — {selectedStage.TenCongDoan}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                {selectedStage.SoLaoDong} CN · {selectedStage.teamCount} Tổ
              </span>
              <button
                type="button"
                onClick={() => onSelectStage(null)}
                className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            <div className="xl:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                So sánh Năng suất (%) &amp; Tỷ lệ lỗi (%) giữa các Tổ
              </h4>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={selectedStage.teams}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#1e293b' : '#e2e8f0'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="teamName"
                      tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 12, fontWeight: 600 }}
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
                      dataKey="productivityPct"
                      name="Năng suất tổ (%)"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="defectRatePct"
                      name="Tỷ lệ lỗi (%)"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-7 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-2 px-2.5 font-semibold">Tổ sản xuất</th>
                    <th className="py-2 px-2.5 text-right font-semibold">Số CN</th>
                    <th className="py-2 px-2.5 text-right font-semibold">Năng suất (%)</th>
                    <th className="py-2 px-2.5 text-right font-semibold">SL (sp/h)</th>
                    <th className="py-2 px-2.5 text-right font-semibold">Tỷ lệ lỗi (%)</th>
                    <th className="py-2 px-2.5 text-right font-semibold">WIP</th>
                    <th className="py-2 px-2.5 font-semibold">Công nhân cờ đỏ (&lt;35% NS / &gt;4.5% lỗi)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStage.teams.map((team) => {
                    const isRedTeam =
                      team.productivityPct < 35 ||
                      team.defectRatePct > 4.5 ||
                      team.outlierWorkers.length > 0;
                    return (
                      <tr
                        key={team.teamName}
                        className={
                          isRedTeam
                            ? 'bg-red-50/80 dark:bg-red-950/35'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {team.teamName}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                          {team.workerCount}
                        </td>
                        <td
                          className={`py-2.5 px-2.5 text-right font-mono tabular-nums font-bold ${
                            team.productivityPct < 35
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {team.productivityPct}%
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                          {team.hourlyCapacity}
                        </td>
                        <td
                          className={`py-2.5 px-2.5 text-right font-mono tabular-nums font-bold ${
                            team.defectRatePct > 3.5
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {team.defectRatePct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {team.wip}
                        </td>
                        <td className="py-2.5 px-2.5">
                          {team.outlierWorkers.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {team.outlierWorkers.map((ow) => (
                                <span
                                  key={ow.workerId}
                                  className="inline-block font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                >
                                  {ow.workerId}: {ow.efficiencyPct}% NS · {ow.defectRatePct}% lỗi
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Đạt chuẩn</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
