import { useCallback, useEffect, useMemo, useState } from 'react';
import { AiKaizenPanel } from './components/AiKaizenPanel';
import { DataInputPanel } from './components/DataInputPanel';
import { FlowVisualizer } from './components/FlowVisualizer';
import { Header } from './components/Header';
import { ProfitComparisonCharts } from './components/ProfitComparisonCharts';
import { ProfitSimulatorSection } from './components/ProfitSimulatorSection';
import { QuarterlyTrendsSection } from './components/QuarterlyTrendsSection';
import { StationTable } from './components/StationTable';
import { generateSampleSmeRows } from './data/samplePoloLine';
import {
  analyzeLineWithGemini,
  checkGeminiHealth,
} from './services/geminiService';
import type {
  AggregatedFactoryDataset,
  GeminiHealthStatus,
  IngestionProgress,
  KaizenAiRecommendation,
  MarketSimulationInputs,
  ProfitComparisonResult,
  QuarterFilter,
  QuarterSummary,
  ThemeMode,
} from './types/kaizen';
import {
  aggregateFilesInWorker,
  downloadSampleExcelFile,
} from './utils/excelParser';
import {
  autoOptimizeHumanCenteredPlan,
  simulateMarketBaseline,
} from './utils/profitPredictor';
import {
  buildSampleSmeDataset,
  computeVerificationMetrics,
  normalizeOptimizedStages,
  recalculateQuarterSummary,
} from './utils/simulationEngine';
import { formatCompactVnd } from './utils/streamingAggregator';

const THEME_STORAGE_KEY = 'kaizen-theme';

const IDLE_PROGRESS: IngestionProgress = {
  status: 'idle',
  filesProcessed: 0,
  currentFileIndex: 0,
  totalFiles: 0,
  currentFileName: '',
  bytesRead: 0,
  totalBytes: 0,
  rowsAggregated: 0,
  speedMbPerSec: 0,
};

const DEFAULT_MARKET_INPUTS: MarketSimulationInputs = {
  demandDeltaPct: 0,
  priceDeltaPct: 0,
  kaizenBudgetVnd: 55_000_000,
};

function getInitialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

function parseYearAndQuarter(q: string): { year: string | null; qtr: string } {
  const m = q.match(/^(\d{4})-(Q[1-4])$/i);
  if (m) return { year: m[1], qtr: m[2].toUpperCase() };
  return { year: null, qtr: q.toUpperCase() };
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [dataset, setDataset] = useState<AggregatedFactoryDataset | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [editedSummary, setEditedSummary] = useState<QuarterSummary | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const [marketInputs, setMarketInputs] =
    useState<MarketSimulationInputs>(DEFAULT_MARKET_INPUTS);
  const [profitComparison, setProfitComparison] =
    useState<ProfitComparisonResult | null>(null);

  const [progress, setProgress] = useState<IngestionProgress>(IDLE_PROGRESS);
  const [inputError, setInputError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<KaizenAiRecommendation | null>(null);
  const [optimizedSummary, setOptimizedSummary] = useState<QuarterSummary | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [visualizerScenario, setVisualizerScenario] = useState<'before' | 'after'>('before');
  const [geminiHealth, setGeminiHealth] = useState<GeminiHealthStatus>({
    state: 'checking',
    ok: false,
    model: 'gemini-4-hydrogen',
    latencyMs: 0,
    message: 'Đang kiểm tra kết nối Gemini...',
  });

  const handleRefreshGeminiHealth = useCallback(async () => {
    setGeminiHealth((prev) => ({
      ...prev,
      state: 'checking',
      message: 'Đang kiểm tra kết nối Gemini...',
    }));
    const next = await checkGeminiHealth();
    setGeminiHealth(next);
  }, []);

  useEffect(() => {
    let active = true;
    checkGeminiHealth().then((status) => {
      if (active) setGeminiHealth(status);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const availableYears = useMemo(() => {
    if (!dataset) return [] as string[];
    const set = new Set<string>();
    for (const q of dataset.quartersAvailable) {
      const parsed = parseYearAndQuarter(q);
      if (parsed.year) set.add(parsed.year);
    }
    return Array.from(set).sort();
  }, [dataset]);

  const baseActiveSummary: QuarterSummary | null = useMemo(() => {
    if (!dataset) return null;
    if (quarterFilter === 'ALL') return dataset.allQuartersSummary;
    return dataset.byQuarter[quarterFilter] ?? dataset.allQuartersSummary;
  }, [dataset, quarterFilter]);

  const activeSummary = editedSummary ?? baseActiveSummary;

  const previewBaseline = useMemo(() => {
    if (!activeSummary) return null;
    return simulateMarketBaseline(activeSummary, marketInputs);
  }, [activeSummary, marketInputs]);

  const verificationMetrics = useMemo(() => {
    if (!activeSummary || !optimizedSummary || !recommendation) return null;
    return computeVerificationMetrics(
      activeSummary,
      optimizedSummary,
      recommendation.estimated_roi_months
    );
  }, [activeSummary, optimizedSummary, recommendation]);

  const resetAiAndProfitState = () => {
    setAiError(null);
    setRecommendation(null);
    setOptimizedSummary(null);
    setProfitComparison(null);
    setShowVerification(false);
    setVisualizerScenario('before');
  };

  const handleLoadSample = () => {
    setInputError(null);
    setProgress(IDLE_PROGRESS);
    resetAiAndProfitState();
    setEditedSummary(null);
    setMarketInputs(DEFAULT_MARKET_INPUTS);
    const sample = buildSampleSmeDataset();
    setDataset(sample);
    const latestYear =
      sample.quartersAvailable.length > 0
        ? parseYearAndQuarter(sample.quartersAvailable[sample.quartersAvailable.length - 1]).year
        : null;
    setSelectedYear(latestYear ?? 'ALL');
    setQuarterFilter(
      sample.quartersAvailable.length > 0
        ? sample.quartersAvailable[sample.quartersAvailable.length - 1]
        : 'ALL'
    );
    setSelectedStageId('CD4');
  };

  const handleUploadFiles = async (files: File[]) => {
    setInputError(null);
    resetAiAndProfitState();
    setEditedSummary(null);

    try {
      const aggregated = await aggregateFilesInWorker(files, (prog) => {
        setProgress(prog);
      });
      setProgress((prev) => ({
        ...prev,
        status: 'done',
        filesProcessed: files.length,
        currentFileIndex: files.length,
        totalFiles: files.length,
        bytesRead: prev.totalBytes,
        rowsAggregated: aggregated.totalRowsProcessed,
      }));
      const firstYear =
        aggregated.quartersAvailable.length > 0
          ? parseYearAndQuarter(
              aggregated.quartersAvailable[aggregated.quartersAvailable.length - 1]
            ).year
          : null;
      setSelectedYear(firstYear ?? 'ALL');
      setQuarterFilter('ALL');
      setDataset(aggregated);
      setSelectedStageId(aggregated.allQuartersSummary.bottleneckStageId);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể xử lý luồng dữ liệu từ các tệp đã chọn.';
      setProgress((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
      setInputError(msg);
    }
  };

  const handleDownloadTemplate = () => {
    const rows = generateSampleSmeRows();
    downloadSampleExcelFile(rows);
  };

  const handleClearData = () => {
    setDataset(null);
    setEditedSummary(null);
    setSelectedStageId(null);
    setSelectedYear('ALL');
    setQuarterFilter('ALL');
    setProgress(IDLE_PROGRESS);
    setInputError(null);
    resetAiAndProfitState();
  };

  const handleSelectYear = (year: string) => {
    setSelectedYear(year);
    setEditedSummary(null);
    resetAiAndProfitState();

    if (!dataset) return;
    if (year === 'ALL') {
      setQuarterFilter('ALL');
      return;
    }

    const matchingQuarters = dataset.quartersAvailable.filter((q) =>
      q.startsWith(`${year}-`)
    );
    if (matchingQuarters.length > 0) {
      // Keep same quarter slot (Q1..Q4) if present, else pick latest in that year
      const currentQPart = parseYearAndQuarter(quarterFilter).qtr;
      const preferred =
        matchingQuarters.find((q) => q.endsWith(`-${currentQPart}`)) ??
        matchingQuarters[matchingQuarters.length - 1];
      setQuarterFilter(preferred);
    }
  };

  const handleSelectQuarter = (q: QuarterFilter) => {
    setQuarterFilter(q);
    if (q !== 'ALL') {
      const parsed = parseYearAndQuarter(q);
      if (parsed.year) setSelectedYear(parsed.year);
    }
    setEditedSummary(null);
    resetAiAndProfitState();
  };

  const handleUpdateStageField = (
    stageId: string,
    field: 'SoLaoDong' | 'TG_SMV' | 'HieuSuat_TB' | 'TyLeLoi' | 'WIP',
    value: number
  ) => {
    if (!activeSummary) return;
    const nextStages = activeSummary.stages.map((st) =>
      st.id === stageId ? { ...st, [field]: value } : st
    );
    setEditedSummary(recalculateQuarterSummary({ ...activeSummary, stages: nextStages }));
    resetAiAndProfitState();
  };

  const handleChangeMarketInputs = (next: MarketSimulationInputs) => {
    setMarketInputs(next);
    if (profitComparison && activeSummary && dataset) {
      const updated = autoOptimizeHumanCenteredPlan(
        activeSummary,
        next,
        dataset.historicalSeries
      );
      setProfitComparison(updated);
      setOptimizedSummary(updated.afterSummary);
    }
  };

  const handleRunAutoOptimize = () => {
    if (!activeSummary || !dataset) return;
    const comparison = autoOptimizeHumanCenteredPlan(
      activeSummary,
      marketInputs,
      dataset.historicalSeries
    );
    setProfitComparison(comparison);
    setOptimizedSummary(comparison.afterSummary);
    setVisualizerScenario('after');
  };

  const handleAnalyzeWithGemini = async () => {
    if (!dataset || !activeSummary) return;
    setIsAnalyzing(true);
    setAiError(null);
    setShowVerification(false);
    setVisualizerScenario('before');

    try {
      const result = await analyzeLineWithGemini(
        dataset,
        quarterFilter,
        activeSummary,
        marketInputs,
        profitComparison
      );
      const safeOptimized = normalizeOptimizedStages(
        activeSummary,
        result.recommendation.optimized_stages
      );
      setRecommendation(result.recommendation);
      setOptimizedSummary(safeOptimized);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Lỗi kết nối đến dịch vụ phân tích Gemini AI.';
      setAiError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleActivateVerification = () => {
    setShowVerification(true);
    setVisualizerScenario('after');
  };

  const quarterSlotButtons = ['Q1', 'Q2', 'Q3', 'Q4'].map((qSlot) => {
    if (!dataset) return { label: qSlot, value: qSlot, available: false };
    if (availableYears.length > 0) {
      const targetYear =
        selectedYear !== 'ALL' ? selectedYear : availableYears[availableYears.length - 1];
      const fullId = `${targetYear}-${qSlot}`;
      return {
        label: qSlot,
        value: fullId,
        available: dataset.quartersAvailable.includes(fullId),
      };
    }
    return {
      label: qSlot,
      value: qSlot,
      available: dataset.quartersAvailable.includes(qSlot),
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        stageCount={activeSummary?.stages.length ?? 0}
        totalWorkers={activeSummary?.totalWorkers ?? 0}
        totalRowsProcessed={dataset?.totalRowsProcessed ?? 0}
        geminiHealth={geminiHealth}
        onRefreshGeminiHealth={handleRefreshGeminiHealth}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DataInputPanel
          hasData={Boolean(dataset)}
          sourceLabel={dataset?.sourceLabel ?? null}
          errorMessage={inputError}
          progress={progress}
          onLoadSample={handleLoadSample}
          onUploadFiles={handleUploadFiles}
          onDownloadTemplate={handleDownloadTemplate}
          onClearData={handleClearData}
        />

        {/* Year + Quarter Selector & Factory Executive Summary Strip */}
        {dataset && activeSummary && (
          <section
            aria-label="Bộ lọc Năm Quý và Chỉ số Tài chính Toàn Xưởng"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 transition-colors"
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {availableYears.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="year-filter-select"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                    >
                      Năm:
                    </label>
                    <select
                      id="year-filter-select"
                      value={selectedYear}
                      onChange={(e) => handleSelectYear(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <option value="ALL">Tất cả ({availableYears[0]}–{availableYears[availableYears.length - 1]})</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Năm {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quý:
                  </span>
                  <div
                    role="group"
                    aria-label="Chọn Quý phân tích"
                    className="inline-flex flex-wrap items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectQuarter('ALL')}
                      aria-pressed={quarterFilter === 'ALL'}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        quarterFilter === 'ALL'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Tổng hợp ({dataset.quartersAvailable.length} Quý)
                    </button>

                    {quarterSlotButtons.map((opt) => {
                      const active = quarterFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!opt.available}
                          onClick={() => handleSelectQuarter(opt.value)}
                          aria-pressed={active}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Bối cảnh kỳ <strong className="font-mono text-slate-900 dark:text-white">{quarterFilter === 'ALL' ? 'Toàn chu kỳ' : quarterFilter}</strong>:{' '}
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {activeSummary.financials.marketContext}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 tabular-nums">
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Tổng nhân sự xưởng
                </p>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {activeSummary.totalWorkers} CN
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Sản lượng kỳ
                </p>
                <p className="text-base font-bold font-mono text-blue-700 dark:text-blue-400">
                  {new Intl.NumberFormat('vi-VN').format(activeSummary.totalQuarterlyOutput)} sp
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Năng suất TB gia quyền
                </p>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {activeSummary.weightedProductivityPct}%
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Tỷ lệ hàng lỗi xưởng
                </p>
                <p
                  className={`text-base font-bold font-mono ${
                    activeSummary.overallDefectRatePct > 3.0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {activeSummary.overallDefectRatePct}%
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Doanh thu thực hiện
                </p>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {formatCompactVnd(activeSummary.financials.realizedRevenueVnd)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Lợi nhuận ròng
                </p>
                <p
                  className={`text-base font-bold font-mono ${
                    activeSummary.financials.netProfitVnd >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCompactVnd(activeSummary.financials.netProfitVnd)}
                </p>
              </div>
            </div>
          </section>
        )}

        <FlowVisualizer
          currentSummary={activeSummary}
          optimizedSummary={
            showVerification || profitComparison ? optimizedSummary : null
          }
          activeScenario={visualizerScenario}
          selectedStageId={selectedStageId}
          onChangeScenario={setVisualizerScenario}
          onSelectStage={(id) => setSelectedStageId(id)}
        />

        <ProfitSimulatorSection
          activeSummary={activeSummary}
          inputs={marketInputs}
          previewBaseline={previewBaseline}
          onChangeInputs={handleChangeMarketInputs}
          onRunAutoOptimize={handleRunAutoOptimize}
        />

        <ProfitComparisonCharts comparison={profitComparison} theme={theme} />

        {dataset && (
          <QuarterlyTrendsSection
            trends={dataset.quarterlyTeamTrends}
            theme={theme}
          />
        )}

        <StationTable
          summary={activeSummary}
          theme={theme}
          selectedStageId={selectedStageId}
          onSelectStage={setSelectedStageId}
          onUpdateStageField={handleUpdateStageField}
        />

        <AiKaizenPanel
          theme={theme}
          hasData={Boolean(activeSummary)}
          isAnalyzing={isAnalyzing}
          aiError={aiError}
          recommendation={recommendation}
          optimizedSummary={optimizedSummary}
          verificationMetrics={verificationMetrics}
          showVerification={showVerification}
          onAnalyzeWithGemini={handleAnalyzeWithGemini}
          onActivateVerification={handleActivateVerification}
        />
      </main>
    </div>
  );
}

export default App;
