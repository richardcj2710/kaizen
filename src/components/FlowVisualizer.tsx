import { useState } from 'react';
import { Layers, Pause, Play } from 'lucide-react';
import type { QuarterSummary } from '../types/kaizen';

interface FlowVisualizerProps {
  currentSummary: QuarterSummary | null;
  optimizedSummary: QuarterSummary | null;
  activeScenario: 'before' | 'after';
  selectedStageId: string | null;
  onChangeScenario: (scenario: 'before' | 'after') => void;
  onSelectStage: (stageId: string) => void;
}

export function FlowVisualizer({
  currentSummary,
  optimizedSummary,
  activeScenario,
  selectedStageId,
  onChangeScenario,
  onSelectStage,
}: FlowVisualizerProps) {
  const [isPaused, setIsPaused] = useState(false);

  const isAfterView = activeScenario === 'after' && optimizedSummary !== null;
  const activeSummary =
    isAfterView && optimizedSummary ? optimizedSummary : currentSummary;
  const stages = activeSummary?.stages ?? [];
  const hasData = stages.length > 0;

  return (
    <section
      aria-labelledby="flow-visualizer-heading"
      data-testid="flow-visualizer"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors"
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Sơ đồ Dòng chảy 2D (Xưởng May SME · 50–100 Công nhân)
          </p>
          <h2
            id="flow-visualizer-heading"
            className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
          >
            Dòng chảy Công đoạn, Năng suất &amp; Cảnh báo Hàng lỗi
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Nhấn vào từng Khâu để mở bảng chi tiết các Tổ. Khối đỏ (#ef4444) cảnh báo điểm nghẽn
            hoặc có Tổ vượt ngưỡng lỗi (&gt;3.5%).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {optimizedSummary && (
            <div
              role="group"
              aria-label="Chọn kịch bản mô phỏng"
              className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <button
                type="button"
                onClick={() => onChangeScenario('before')}
                aria-pressed={!isAfterView}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  !isAfterView
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Hiện trạng (Trước)
              </button>
              <button
                type="button"
                onClick={() => onChangeScenario('after')}
                aria-pressed={isAfterView}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  isAfterView
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Phương án mới (Sau)
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            disabled={!hasData}
            aria-pressed={isPaused}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Tiếp tục</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" aria-hidden="true" />
                <span>Tạm dừng</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="mt-5 py-12 px-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col items-center justify-center text-center">
          <Layers className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Chưa có dữ liệu sơ đồ dòng chảy 2D
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nạp dữ liệu mẫu SME hoặc tải lên tệp .csv / .xlsx ở Bước 1 để xem dòng chảy chuyền may.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div
            data-scenario={isAfterView ? 'after' : 'before'}
            className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-6 ${
              isPaused ? 'flow-paused' : ''
            }`}
          >
            <div className="min-w-[1110px] flex items-end justify-between gap-1.5">
              {stages.map((stage, idx) => {
                const showRed =
                  !isAfterView && (stage.isBottleneck || stage.isHighDefectStage);
                const isSelected = selectedStageId === stage.id;
                const nextStage = stages[idx + 1];
                const nextIsRed =
                  nextStage &&
                  !isAfterView &&
                  (nextStage.isBottleneck || nextStage.isHighDefectStage);

                const wipBlocksCount = Math.min(6, Math.max(1, Math.ceil(stage.WIP / 25)));
                const particleDurationSec = showRed ? 2.6 : isAfterView ? 0.95 : 1.3;

                const cardBorderClass = showRed
                  ? 'border-red-500 dark:border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.24)]'
                  : isAfterView
                    ? 'border-emerald-500 dark:border-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
                    : 'border-blue-500/80 dark:border-blue-500/70';

                const wipBarColor = showRed
                  ? 'bg-red-500'
                  : isAfterView
                    ? 'bg-emerald-500'
                    : 'bg-blue-500';

                return (
                  <div key={stage.id} className="flex items-center flex-1 min-w-0">
                    <div className="flex-1 flex flex-col items-center">
                      {/* Visual WIP Stack */}
                      <div
                        className="flex flex-col-reverse items-center gap-1 mb-2.5 h-[56px] justify-start"
                        title={`Tồn WIP tại ${stage.id}: ${stage.WIP} sản phẩm`}
                      >
                        {Array.from({ length: wipBlocksCount }).map((_, bIdx) => (
                          <div
                            key={bIdx}
                            className={`w-12 h-1.5 rounded-sm transition-colors duration-300 ${wipBarColor}`}
                          />
                        ))}
                      </div>

                      {/* Interactive Stage Card Button */}
                      <button
                        type="button"
                        onClick={() => onSelectStage(stage.id)}
                        aria-pressed={isSelected}
                        aria-label={`Xem chi tiết các tổ trong khâu ${stage.id} ${stage.TenCongDoan}`}
                        className={`w-full min-w-[156px] text-left rounded-xl border-2 bg-white dark:bg-slate-900 p-3.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${cardBorderClass} ${
                          isSelected
                            ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950'
                            : 'hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-mono text-xs font-bold ${
                              showRed
                                ? 'text-red-600 dark:text-red-400'
                                : isAfterView
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {stage.id}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                            {stage.teamCount} tổ · {stage.SoLaoDong} CN
                          </span>
                        </div>

                        <p
                          className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate"
                          title={stage.TenCongDoan}
                        >
                          {stage.TenCongDoan}
                        </p>

                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] tabular-nums">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Sản lượng:</span>
                            <span
                              className={`font-mono font-bold whitespace-nowrap ${
                                showRed
                                  ? 'text-red-600 dark:text-red-400'
                                  : isAfterView
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {stage.Capacity} sp/h
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Tỷ lệ lỗi:</span>
                            <span
                              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap ${
                                stage.TyLeLoi > 3.5 && !isAfterView
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                  : isAfterView
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {stage.TyLeLoi.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-[10px] font-semibold truncate">
                          {showRed ? (
                            <span className="text-red-600 dark:text-red-400">
                              {stage.isBottleneck && stage.isHighDefectStage
                                ? 'Nghẽn + Lỗi >3.5%'
                                : stage.isBottleneck
                                  ? 'Nút thắt cổ chai'
                                  : 'Vượt ngưỡng lỗi (>3.5%)'}
                            </span>
                          ) : isAfterView ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Đã cân bằng &amp; giảm lỗi
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              WIP: {stage.WIP} sp · Đạt chuẩn
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* 2D Conveyor Connector */}
                    {idx < stages.length - 1 && (
                      <div className="w-10 px-0.5 flex items-center justify-center shrink-0 pb-10">
                        <div className="relative w-full h-5 flex items-center">
                          <svg
                            viewBox="0 0 56 16"
                            className="w-full h-4 overflow-visible"
                            aria-hidden="true"
                          >
                            <line
                              x1="0"
                              y1="8"
                              x2="48"
                              y2="8"
                              stroke={
                                nextIsRed || showRed
                                  ? '#ef4444'
                                  : isAfterView
                                    ? '#10b981'
                                    : '#3b82f6'
                              }
                              strokeWidth="3"
                              strokeDasharray={showRed ? '4 4' : undefined}
                            />
                            <polygon
                              points="46,3 55,8 46,13"
                              fill={
                                nextIsRed || showRed
                                  ? '#ef4444'
                                  : isAfterView
                                    ? '#10b981'
                                    : '#3b82f6'
                              }
                            />
                          </svg>

                          {[0, 0.45, 0.9].map((delayRatio, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                animationDuration: `${particleDurationSec}s`,
                                animationDelay: `${-(particleDurationSec * delayRatio)}s`,
                              }}
                              className={`flow-dot-x absolute left-0 top-1.5 w-2 h-2 rounded-full ${
                                nextIsRed || showRed
                                  ? 'bg-red-500'
                                  : isAfterView
                                    ? 'bg-emerald-500'
                                    : 'bg-blue-500'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-5">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" aria-hidden="true" />
                Khâu ổn định (Lỗi ≤ 3.5%)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" aria-hidden="true" />
                Khâu nghẽn hoặc có Tổ vượt ngưỡng lỗi (&gt; 3.5%)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" aria-hidden="true" />
                Sau Kaizen (Thông chuyền &amp; giảm lỗi)
              </span>
            </div>
            {activeSummary && (
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                Đầu ra chuyền: {activeSummary.hourlyLineThroughput} sp/giờ · Tỷ lệ lỗi chung:{' '}
                {activeSummary.overallDefectRatePct}%
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
