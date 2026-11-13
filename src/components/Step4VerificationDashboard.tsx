import { CheckCircle2, Clock, PackageCheck, TrendingUp, Users } from 'lucide-react';
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
import type { VerificationMetrics } from '../types/kaizen';

interface Step4VerificationDashboardProps {
  metrics: VerificationMetrics;
}

export function Step4VerificationDashboard({ metrics }: Step4VerificationDashboardProps) {
  const {
    beforeThroughput,
    afterThroughput,
    throughputIncreasePct,
    beforeTotalWip,
    afterTotalWip,
    wipReductionPct,
    beforeTotalWorkers,
    afterTotalWorkers,
    zeroLayoffVerified,
    beforeBalanceEfficiencyPct,
    afterBalanceEfficiencyPct,
    estimatedRoiMonths,
    comparisons,
  } = metrics;

  return (
    <section
      aria-labelledby="step-4-heading"
      data-testid="verification-dashboard"
      className="bg-white border border-emerald-200 rounded-xl p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Bước 4 · Dashboard Kiểm chứng Trước / Sau Kaizen
          </p>
          <h2 id="step-4-heading" className="text-lg font-bold text-slate-900 mt-1">
            Kết quả Mô phỏng Phương án Mới
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Đối chiếu trực quan năng suất, lượng bán thành phẩm tồn đọng (WIP) và bảo toàn 100% nhân
            sự sau tái phân bổ.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>
            {zeroLayoffVerified
              ? `Cam kết 0% sa thải: ${afterTotalWorkers}/${beforeTotalWorkers} lao động`
              : `Tổng lao động: ${afterTotalWorkers}`}
          </span>
        </div>
      </div>

      {/* KPI Delta Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              Tăng năng suất toàn chuyền
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
            {throughputIncreasePct >= 0 ? `+${throughputIncreasePct}%` : `${throughputIncreasePct}%`}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-600 mt-1">
            {beforeThroughput} → {afterThroughput} sp/giờ
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Giảm hàng tồn WIP</span>
            <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
            {wipReductionPct >= 0 ? `-${wipReductionPct}%` : `+${Math.abs(wipReductionPct)}%`}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-600 mt-1">
            {beforeTotalWip} → {afterTotalWip} sản phẩm
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Thời gian hoàn vốn thiết bị
            </span>
            <Clock className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {estimatedRoiMonths}{' '}
            <span className="text-sm font-sans font-medium text-slate-600">tháng</span>
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-600 mt-1">
            Cân bằng: {beforeBalanceEfficiencyPct}% → {afterBalanceEfficiencyPct}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Bảo toàn nhân sự</span>
            <Users className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            0% <span className="text-sm font-sans font-medium text-slate-600">sa thải</span>
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-600 mt-1">
            {beforeTotalWorkers} → {afterTotalWorkers} công nhân giữ nguyên
          </p>
        </div>
      </div>

      {/* Side-by-side Before / After Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <div className="xl:col-span-7 rounded-lg border border-slate-200 p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              So sánh Năng suất Trước &amp; Sau Kaizen theo từng công đoạn (sp/giờ)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cột xanh ngọc (#10b981) thể hiện năng suất mới sau điều chuyển lao động và cải tiến kỹ
              thuật.
            </p>
          </div>
          <div className="h-[320px] w-full" data-testid="before-after-chart">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={comparisons}
                margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                barGap={6}
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
                  formatter={(value: number, name: string) => [
                    `${value} sp/giờ`,
                    name === 'beforeCapacity' ? 'Trước Kaizen' : 'Sau Kaizen (Phương án mới)',
                  ]}
                  labelFormatter={(label: string) => {
                    const row = comparisons.find((c) => c.id === label);
                    return row ? `${row.id}: ${row.TenCongDoan}` : label;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  formatter={(value: string) =>
                    value === 'beforeCapacity'
                      ? 'Hiện trạng (Trước Kaizen)'
                      : 'Phương án mới (Sau Kaizen)'
                  }
                />
                <Bar
                  dataKey="beforeCapacity"
                  name="beforeCapacity"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="afterCapacity"
                  name="afterCapacity"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 rounded-lg border border-slate-200 p-5 overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Chi tiết Thay đổi theo Công đoạn
          </h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                <th className="py-2 px-2.5 font-semibold">Công đoạn</th>
                <th className="py-2 px-2.5 text-right font-semibold whitespace-nowrap">
                  Lao động
                </th>
                <th className="py-2 px-2.5 text-right font-semibold whitespace-nowrap">SMV</th>
                <th className="py-2 px-2.5 text-right font-semibold whitespace-nowrap">
                  Năng suất
                </th>
                <th className="py-2 px-2.5 text-right font-semibold whitespace-nowrap">WIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisons.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-2.5">
                    <span className="font-mono font-semibold text-slate-900">{row.id}</span>
                    <div className="text-slate-600 truncate max-w-[140px]" title={row.TenCongDoan}>
                      {row.TenCongDoan}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    <span className="text-slate-500">{row.beforeWorkers}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-slate-900">{row.afterWorkers}</span>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    <span className="text-slate-500">{row.beforeSmv.toFixed(1)}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-semibold text-emerald-700">
                      {row.afterSmv.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    <span className="text-slate-500">{row.beforeCapacity}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-bold text-emerald-600">{row.afterCapacity}</span>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    <span className="text-slate-500">{row.beforeWip}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-semibold text-slate-900">{row.afterWip}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
