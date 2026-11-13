import type {
  AggregatedFactoryDataset,
  GeminiHealthStatus,
  KaizenAiRecommendation,
  MarketSimulationInputs,
  ProfitComparisonResult,
  QuarterFilter,
  QuarterSummary,
} from '../types/kaizen';

export interface GeminiAnalyzeResponse {
  recommendation: KaizenAiRecommendation;
  optimizedSummary: QuarterSummary;
}

const MAX_PAYLOAD_BYTES = 12 * 1024; // Strictly under 12 KB
const ANALYZE_TIMEOUT_MS = 35_000;
const HEALTH_TIMEOUT_MS = 12_000;
const RETRY_DELAYS_MS = [1500, 3000];

const utf8Encoder = new TextEncoder();

export async function checkGeminiHealth(): Promise<GeminiHealthStatus> {
  const startMs = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const res = await fetch('/api/gemini/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Partial<GeminiHealthStatus>;
    const latencyMs =
      typeof data.latencyMs === 'number'
        ? data.latencyMs
        : Math.round(performance.now() - startMs);

    if (!res.ok) {
      return {
        state: 'disconnected',
        ok: false,
        model: data.model || 'gemini-4-hydrogen',
        latencyMs,
        message: data.message || `Lỗi máy chủ (${res.status})`,
      };
    }

    return {
      state: data.ok ? 'connected' : 'disconnected',
      ok: Boolean(data.ok),
      model: data.model || 'gemini-4-hydrogen',
      latencyMs,
      message:
        data.message ||
        (data.ok ? 'Đang hoạt động' : 'Lỗi kết nối mạng'),
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return {
      state: 'disconnected',
      ok: false,
      model: 'gemini-4-hydrogen',
      latencyMs: Math.round(performance.now() - startMs),
      message: isTimeout ? 'Hết thời gian kiểm tra kết nối' : 'Lỗi kết nối mạng',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function buildCompactAiPayload(
  dataset: AggregatedFactoryDataset,
  activeQuarter: QuarterFilter,
  activeSummary: QuarterSummary,
  marketInputs?: MarketSimulationInputs,
  profitComparison?: ProfitComparisonResult | null
) {
  const recentQuarters = dataset.quartersAvailable.slice(-4);
  const recentSeries = dataset.historicalSeries.slice(-4).map((pt) => ({
    q: pt.quarter,
    out: pt.hourlyThroughput,
    def: pt.defectRatePct,
    rev: pt.realizedRevenueVnd,
    prof: pt.netProfitVnd,
  }));

  // Keep only teams with outlier/rising defects or bottleneck relevance, capped under 12KB
  const sortedTrends = [...dataset.quarterlyTeamTrends]
    .sort((a, b) => Number(b.isDefectRisingQoQ) - Number(a.isDefectRisingQoQ) || b.defectDeltaFirstToLatest - a.defectDeltaFirstToLatest)
    .slice(0, 8)
    .map((tr) => ({
      team: tr.teamName,
      st: tr.stageId,
      span: `${tr.firstQuarterLabel}->${tr.latestQuarterLabel}`,
      eff: `${tr.firstProductivity ?? '-'}->${tr.latestProductivity ?? '-'}`,
      def: `${tr.firstDefectRate ?? '-'}->${tr.latestDefectRate ?? '-'}`,
      delta: tr.defectDeltaFirstToLatest,
      rising: tr.isDefectRisingQoQ,
    }));

  const payload = {
    selectedQuarter: activeQuarter,
    totalRowsAggregated: dataset.totalRowsProcessed,
    recentQuarters,
    recentSeries,
    quarterOverview: {
      quarter: activeSummary.quarter,
      marketContext: activeSummary.financials.marketContext,
      totalWorkers: activeSummary.totalWorkers,
      hourlyLineThroughput: activeSummary.hourlyLineThroughput,
      weightedProductivityPct: activeSummary.weightedProductivityPct,
      overallDefectRatePct: activeSummary.overallDefectRatePct,
      totalWip: activeSummary.totalWip,
      unitLaborCost: activeSummary.unitLaborCost,
      bottleneckStageId: activeSummary.bottleneckStageId,
    },
    financialBaseline: {
      demand: activeSummary.financials.marketOrderDemand,
      goodUnits: activeSummary.financials.goodOutputUnits,
      sellableUnits: activeSummary.financials.sellableOutputUnits,
      defectUnits: activeSummary.financials.defectUnits,
      price: activeSummary.financials.unitSellingPrice,
      matCost: activeSummary.financials.unitMaterialCost,
      rev: activeSummary.financials.realizedRevenueVnd,
      defLoss: activeSummary.financials.defectLossVnd,
      netProfit: activeSummary.financials.netProfitVnd,
      unfulfilled: activeSummary.financials.unfulfilledDemandUnits,
    },
    marketSimulationInputs: marketInputs ?? null,
    projectedProfitSimulation: profitComparison
      ? {
          regime: profitComparison.regime,
          beforeRev: profitComparison.beforeFinancials.realizedRevenueVnd,
          afterRev: profitComparison.afterFinancials.realizedRevenueVnd,
          beforeProfit: profitComparison.beforeFinancials.netProfitVnd,
          afterProfit: profitComparison.afterFinancials.netProfitVnd,
          profitDeltaPct: profitComparison.profitDeltaPct,
          defectSaved: profitComparison.defectLossSavedVnd,
          revUnlocked: profitComparison.revenueUnlockedProfitVnd,
          wasteReduced: profitComparison.wasteReductionProfitVnd,
          retention: {
            init: profitComparison.retention.initialWorkers,
            final: profitComparison.retention.finalWorkers,
            reallocated: profitComparison.retention.reallocatedCrossTeamWorkers,
            trimmedIds: profitComparison.retention.trimmedWorkerIds.slice(0, 3),
            indexPct: profitComparison.retention.humanCenteredIndexPct,
          },
        }
      : null,
    stages: activeSummary.stages.map((st) => ({
      id: st.id,
      TenCongDoan: st.TenCongDoan,
      SoLaoDong: st.SoLaoDong,
      TG_SMV: st.TG_SMV,
      HieuSuat_TB: st.HieuSuat_TB,
      Capacity: st.Capacity,
      TyLeLoi: st.TyLeLoi,
      WIP: st.WIP,
      Luong_Thang: st.Luong_Thang,
      ChiPhi_ThietBi: st.ChiPhi_ThietBi,
      isBottleneck: st.isBottleneck,
      isHighDefectStage: st.isHighDefectStage,
      teams: st.teams.map((t) => ({
        teamName: t.teamName,
        workers: t.workerCount,
        eff: t.productivityPct,
        cap: t.hourlyCapacity,
        defPct: t.defectRatePct,
        wip: t.wip,
        // Cap to top 3 worst outlier workers per team
        worstOutliers: [...t.outlierWorkers]
          .sort(
            (a, b) =>
              a.efficiencyPct - b.efficiencyPct || b.defectRatePct - a.defectRatePct
          )
          .slice(0, 3)
          .map((w) => ({
            id: w.workerId,
            eff: w.efficiencyPct,
            def: w.defectRatePct,
          })),
      })),
    })),
    quarterlyTeamTrends: sortedTrends,
  };

  // Ensure total serialized size remains strictly under 12 KB
  if (utf8Encoder.encode(JSON.stringify(payload)).length >= MAX_PAYLOAD_BYTES) {
    payload.quarterlyTeamTrends = payload.quarterlyTeamTrends.slice(0, 4);
    payload.recentSeries = payload.recentSeries.slice(-2);
  }
  if (utf8Encoder.encode(JSON.stringify(payload)).length >= MAX_PAYLOAD_BYTES) {
    payload.quarterlyTeamTrends = [];
  }

  return payload;
}

/**
 * Minimal QuarterSummary projection sent alongside compact payload so server normalization
 * stays well under 12 KB without transferring full 76-worker metadata arrays.
 */
function trimActiveSummaryForServer(activeSummary: QuarterSummary): QuarterSummary {
  return {
    ...activeSummary,
    stages: activeSummary.stages.map((st) => ({
      ...st,
      teams: st.teams.map((t) => ({
        ...t,
        outlierWorkers: [...t.outlierWorkers]
          .sort(
            (a, b) =>
              a.efficiencyPct - b.efficiencyPct || b.defectRatePct - a.defectRatePct
          )
          .slice(0, 3),
      })),
    })),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeLineWithGemini(
  dataset: AggregatedFactoryDataset,
  activeQuarter: QuarterFilter,
  activeSummary: QuarterSummary,
  marketInputs?: MarketSimulationInputs,
  profitComparison?: ProfitComparisonResult | null
): Promise<GeminiAnalyzeResponse> {
  const compactPayload = buildCompactAiPayload(
    dataset,
    activeQuarter,
    activeSummary,
    marketInputs,
    profitComparison
  );
  const trimmedActiveSummary = trimActiveSummaryForServer(activeSummary);

  const bodyString = JSON.stringify({
    summary: compactPayload,
    activeSummary: trimmedActiveSummary,
  });

  let lastError: Error = new Error('Lỗi kết nối mạng đến máy chủ phân tích Gemini AI.');

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

    try {
      const res = await fetch('/api/kaizen/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyString,
        signal: controller.signal,
      });

      const payload = (await res.json().catch(() => ({}))) as Partial<GeminiAnalyzeResponse> & {
        error?: string;
      };

      if (!res.ok) {
        const errMsg =
          payload.error || `Yêu cầu phân tích thất bại (Mã lỗi ${res.status}).`;
        if (isRetryableStatus(res.status) && attempt < RETRY_DELAYS_MS.length) {
          lastError = new Error(errMsg);
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw new Error(errMsg);
      }

      if (!payload.recommendation || !payload.optimizedSummary) {
        throw new Error('Phản hồi từ máy chủ không chứa cấu trúc phương án Kaizen hợp lệ.');
      }

      return {
        recommendation: payload.recommendation,
        optimizedSummary: payload.optimizedSummary,
      };
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const isNetworkTypeErr = err instanceof TypeError;

      if (isAbort) {
        lastError = new Error(
          'Hết thời gian chờ phản hồi từ Gemini AI (quá 35 giây). Vui lòng thử lại.'
        );
      } else if (isNetworkTypeErr) {
        lastError = new Error('Lỗi kết nối mạng khi gọi API phân tích Gemini.');
      } else if (err instanceof Error) {
        lastError = err;
      }

      const canRetry = (isAbort || isNetworkTypeErr) && attempt < RETRY_DELAYS_MS.length;
      if (canRetry) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

