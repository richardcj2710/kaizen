import { Calculator, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  MarketSimulationInputs,
  QuarterFinancials,
  QuarterSummary,
} from '../types/kaizen';
import { formatCompactVnd, formatVnd } from '../utils/streamingAggregator';

interface ProfitSimulatorSectionProps {
  activeSummary: QuarterSummary | null;
  inputs: MarketSimulationInputs;
  previewBaseline: QuarterFinancials | null;
  onChangeInputs: (next: MarketSimulationInputs) => void;
  onRunAutoOptimize: () => void;
}

export function ProfitSimulatorSection({
  activeSummary,
  inputs,
  previewBaseline,
  onChangeInputs,
  onRunAutoOptimize,
}: ProfitSimulatorSectionProps) {
  if (!activeSummary || !previewBaseline) {
    return null;
  }

  const isDemandSurplus =
    previewBaseline.unfulfilledDemandUnits > 0 && inputs.demandDeltaPct >= -5;

  return (
    <section
      aria-labelledby="profit-simulator-heading"
      data-testid="profit-simulator-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 transition-colors"
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Công cụ Dự đoán Tài chính Theo Nhu cầu Thị trường
          </p>
          <h2
            id="profit-simulator-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            Bộ giả lập Dự đoán &amp; Tối ưu Lợi nhuận Nhân văn
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Điều chỉnh biến động đơn hàng, giá bán và ngân sách gá cữ/máy chuyên dùng để hệ thống
            tính toán phương án tối đa hóa lợi nhuận ròng mà vẫn bảo vệ việc làm cho công nhân.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunAutoOptimize}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:whitespace-nowrap max-w-full text-center shrink-0"
        >
          <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Tự động tính phương án Lợi nhuận tối ưu &amp; Nhân văn</span>
        </button>
      </div>

      {/* Interactive Market What-If Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="slider-demand-delta"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              Biến động nhu cầu thị trường
            </label>
            <span
              className={`font-mono text-sm font-bold tabular-nums ${
                inputs.demandDeltaPct >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {inputs.demandDeltaPct >= 0
                ? `+${inputs.demandDeltaPct}%`
                : `${inputs.demandDeltaPct}%`}
            </span>
          </div>
          <input
            id="slider-demand-delta"
            type="range"
            min={-30}
            max={40}
            step={5}
            value={inputs.demandDeltaPct}
            onChange={(e) =>
              onChangeInputs({
                ...inputs,
                demandDeltaPct: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>-30% (Suy giảm)</span>
            <span>0%</span>
            <span>+40% (Bùng nổ)</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="slider-price-delta"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              Biến động đơn giá bán
            </label>
            <span
              className={`font-mono text-sm font-bold tabular-nums ${
                inputs.priceDeltaPct >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {inputs.priceDeltaPct >= 0
                ? `+${inputs.priceDeltaPct}%`
                : `${inputs.priceDeltaPct}%`}
            </span>
          </div>
          <input
            id="slider-price-delta"
            type="range"
            min={-15}
            max={25}
            step={1}
            value={inputs.priceDeltaPct}
            onChange={(e) =>
              onChangeInputs({
                ...inputs,
                priceDeltaPct: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>-15%</span>
            <span>{formatVnd(previewBaseline.unitSellingPrice)}/sp</span>
            <span>+25%</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="input-kaizen-budget"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              Ngân sách gá cữ / máy (VNĐ)
            </label>
            <span className="font-mono text-sm font-bold tabular-nums text-blue-700 dark:text-blue-400">
              {formatCompactVnd(inputs.kaizenBudgetVnd)}
            </span>
          </div>
          <input
            id="input-kaizen-budget"
            type="range"
            min={0}
            max={120_000_000}
            step={5_000_000}
            value={inputs.kaizenBudgetVnd}
            onChange={(e) =>
              onChangeInputs({
                ...inputs,
                kaizenBudgetVnd: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>0 đ</span>
            <span>50 tr</span>
            <span>120 tr</span>
          </div>
        </div>
      </div>

      {/* Real-time Baseline Financial Preview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 tabular-nums">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nhu cầu đơn hàng kỳ
          </p>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {new Intl.NumberFormat('vi-VN').format(previewBaseline.marketOrderDemand)} sp
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sản lượng bán được (Hiện trạng)
          </p>
          <p className="text-base font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5">
            {new Intl.NumberFormat('vi-VN').format(previewBaseline.sellableOutputUnits)} sp
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Doanh thu thực hiện (Trước)
          </p>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {formatCompactVnd(previewBaseline.realizedRevenueVnd)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Thiệt hại hàng lỗi (Trước)
          </p>
          <p className="text-base font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
            {formatCompactVnd(previewBaseline.defectLossVnd)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {isDemandSurplus ? (
              <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            )}
            <span>Lợi nhuận ròng (Trước)</span>
          </p>
          <p
            className={`text-base font-bold font-mono mt-0.5 ${
              previewBaseline.netProfitVnd >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCompactVnd(previewBaseline.netProfitVnd)}
          </p>
        </div>
      </div>
    </section>
  );
}
