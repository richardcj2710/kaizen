import { AlertTriangle, BarChart3, Layers, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BottleneckSimulation } from '../types/kaizen';
import { formatVnd } from '../utils/simulation';

interface Step2LineAnalysisProps {
  simulation: BottleneckSimulation;
}

export function Step2LineAnalysis({ simulation }: Step2LineAnalysisProps) {
  const {
    stations,
    bottleneckStation,
    lineThroughput,
    totalWorkers,
    totalWip,
    balanceEfficiencyPct,
  } = simulation;

  const hasData = stations.length > 0;

  return (
    <section aria-labelledby="step-2-heading" className="space-y-6">
      {hasData && bottleneckStation && (
        <div
          role="status"
          data-testid="bottleneck-alert-card"
          className="rounded-xl border border-red-200 bg-red-50 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700">
                Cảnh báo Điểm nghẽn (Nút thắt cổ chai)
              </p>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {bottleneckStation.id} — {bottleneckStation.TenCongDoan}
              </h3>
              <p className="text-sm text-red-900 mt-1">
                Công đoạn này quyết định sản lượng đầu ra tối đa của toàn chuyền hiện tại (
                <span className="font-mono font-semibold tabular-nums">{lineThroughput}</span>{' '}
                sp/giờ), đang tồn đọng{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {bottleneckStation.WIP}
                </span>{' '}
                sản phẩm WIP.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-red-200">
            <div>
              <p className="text-xs text-red-700 font-medium">Năng suất chuyền</p>
              <p className="text-xl font-bold text-red-700 font-mono tabular-nums mt-0.5">
                {lineThroughput} <span className="text-xs font-sans font-normal">sp/giờ</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Tổng hàng tồn WIP</p>
              <p className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {totalWip} <span className="text-xs font-sans font-normal">sp</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Tổng nhân sự</p>
              <p className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {totalWorkers} <span className="text-xs font-sans font-normal">người</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Cân bằng chuyền</p>
              <p className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {balanceEfficiencyPct}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Data Table Card (Full Width so all 9 columns render cleanly) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold text-blue-600">
                Bước 2 · Bảng thông số &amp; Năng suất hiện trạng
              </p>
              <h2 id="step-2-heading" className="text-lg font-bold text-slate-900 mt-1">
                Danh sách Công đoạn Chuyền may
              </h2>
            </div>
            {hasData && (
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    {totalWorkers}
                  </span>{' '}
                  công nhân
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    {totalWip}
                  </span>{' '}
                  WIP
                </span>
              </div>
            )}
          </div>

          {!hasData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu công đoạn</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Nhấn &ldquo;Nạp dữ liệu mẫu (Chuyền áo Polo 6 công đoạn)&rdquo; hoặc tải lên tệp
                .xlsx / .csv ở Bước 1 để xem bảng thông số và tính toán năng suất.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                    <th className="py-2.5 px-3 whitespace-nowrap">Mã</th>
                    <th className="py-2.5 px-3">Tên công đoạn</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Lao động</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">TG SMV (phút)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Năng suất (sp/giờ)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">WIP (sp)</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Lương/tháng</th>
                    <th className="py-2.5 px-3">Giải pháp kỹ thuật</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Chi phí TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stations.map((station) => (
                    <tr
                      key={station.id}
                      data-bottleneck={station.isBottleneck ? 'true' : 'false'}
                      className={
                        station.isBottleneck
                          ? 'bg-red-50/80 hover:bg-red-50'
                          : 'hover:bg-slate-50/80'
                      }
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {station.id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-medium min-w-[180px]">
                        <div>{station.TenCongDoan}</div>
                        {station.isBottleneck && (
                          <span className="inline-block text-[11px] font-semibold text-red-700 mt-0.5">
                            Nút thắt cổ chai
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {station.SoLaoDong}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                        {station.TG_SMV.toFixed(1)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          station.isBottleneck ? 'text-red-600' : 'text-blue-700'
                        }`}
                      >
                        {station.Capacity}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                          station.isBottleneck ? 'font-bold text-red-700' : 'text-slate-700'
                        }`}
                      >
                        {station.WIP}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatVnd(station.Luong_Thang)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 min-w-[180px]">
                        {station.GiaiPhap_KyThuat}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatVnd(station.ChiPhi_ThietBi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chart Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-blue-600">Trực quan hóa điểm nghẽn</p>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Biểu đồ Năng suất &amp; Điểm nghẽn Hiện trạng
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cột đỏ (#ef4444) biểu thị công đoạn nút thắt cổ chai; cột xanh dương (#3b82f6) là công
              đoạn bình thường.
            </p>
          </div>

          {!hasData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-14 px-4 text-center bg-slate-50/70 rounded-lg border border-dashed border-slate-200 mt-4">
              <BarChart3 className="w-8 h-8 text-slate-400 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-600">
                Khung biểu đồ mô phỏng sẽ kích hoạt ở bước phân tích
              </p>
            </div>
          ) : (
            <div className="mt-4 flex-1 min-h-[320px] w-full" data-testid="current-line-chart">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={stations}
                  margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="id"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Capacity') return [`${value} sp/giờ`, 'Năng suất (Capacity)'];
                      if (name === 'WIP') return [`${value} sp`, 'Hàng tồn (WIP)'];
                      return [value, name];
                    }}
                    labelFormatter={(label: string) => {
                      const found = stations.find((s) => s.id === label);
                      return found ? `${found.id}: ${found.TenCongDoan}` : label;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    formatter={(value: string) =>
                      value === 'Capacity' ? 'Năng suất (sp/giờ)' : 'Hàng tồn WIP (sp)'
                    }
                  />
                  <Bar dataKey="Capacity" name="Capacity" radius={[4, 4, 0, 0]}>
                    {stations.map((entry) => (
                      <Cell
                        key={`cap-${entry.id}`}
                        fill={entry.isBottleneck ? '#ef4444' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="WIP" name="WIP" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
