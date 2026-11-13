import type {
  AggregatedFactoryDataset,
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

export function buildCompactAiPayload(
  dataset: AggregatedFactoryDataset,
  activeQuarter: QuarterFilter,
  activeSummary: QuarterSummary,
  marketInputs?: MarketSimulationInputs,
  profitComparison?: ProfitComparisonResult | null
) {
  return {
    selectedQuarter: activeQuarter,
    totalRowsAggregated: dataset.totalRowsProcessed,
    quartersSpan:
      dataset.quartersAvailable.length > 0
        ? `${dataset.quartersAvailable[0]} -> ${dataset.quartersAvailable[dataset.quartersAvailable.length - 1]}`
        : activeSummary.quarter,
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
      marketOrderDemand: activeSummary.financials.marketOrderDemand,
      goodOutputUnits: activeSummary.financials.goodOutputUnits,
      sellableOutputUnits: activeSummary.financials.sellableOutputUnits,
      defectUnits: activeSummary.financials.defectUnits,
      unitSellingPrice: activeSummary.financials.unitSellingPrice,
      unitMaterialCost: activeSummary.financials.unitMaterialCost,
      realizedRevenueVnd: activeSummary.financials.realizedRevenueVnd,
      defectLossVnd: activeSummary.financials.defectLossVnd,
      totalOperatingCostVnd: activeSummary.financials.totalOperatingCostVnd,
      netProfitVnd: activeSummary.financials.netProfitVnd,
      unfulfilledDemandUnits: activeSummary.financials.unfulfilledDemandUnits,
    },
    marketSimulationInputs: marketInputs ?? null,
    projectedProfitSimulation: profitComparison
      ? {
          regime: profitComparison.regime,
          regimeLabelVi: profitComparison.regimeLabelVi,
          beforeRevenueVnd: profitComparison.beforeFinancials.realizedRevenueVnd,
          afterRevenueVnd: profitComparison.afterFinancials.realizedRevenueVnd,
          beforeProfitVnd: profitComparison.beforeFinancials.netProfitVnd,
          afterProfitVnd: profitComparison.afterFinancials.netProfitVnd,
          profitDeltaVnd: profitComparison.profitDeltaVnd,
          profitDeltaPct: profitComparison.profitDeltaPct,
          defectLossSavedVnd: profitComparison.defectLossSavedVnd,
          revenueUnlockedProfitVnd: profitComparison.revenueUnlockedProfitVnd,
          wasteReductionProfitVnd: profitComparison.wasteReductionProfitVnd,
          retention: profitComparison.retention,
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
        workerCount: t.workerCount,
        productivityPct: t.productivityPct,
        hourlyCapacity: t.hourlyCapacity,
        defectRatePct: t.defectRatePct,
        defectCount: t.defectCount,
        wip: t.wip,
        outlierWorkers: t.outlierWorkers.map((w) => ({
          workerId: w.workerId,
          efficiencyPct: w.efficiencyPct,
          defectRatePct: w.defectRatePct,
          reasons: w.reasons,
        })),
      })),
    })),
    quarterlyTeamTrends: dataset.quarterlyTeamTrends.map((tr) => ({
      teamName: tr.teamName,
      stageId: tr.stageId,
      firstQuarterLabel: tr.firstQuarterLabel,
      latestQuarterLabel: tr.latestQuarterLabel,
      firstProductivity: tr.firstProductivity,
      latestProductivity: tr.latestProductivity,
      firstDefectRate: tr.firstDefectRate,
      latestDefectRate: tr.latestDefectRate,
      defectDeltaFirstToLatest: tr.defectDeltaFirstToLatest,
      isDefectRisingQoQ: tr.isDefectRisingQoQ,
    })),
  };
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

  const res = await fetch('/api/kaizen/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: compactPayload,
      activeSummary,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as Partial<GeminiAnalyzeResponse> & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload.error || `Yêu cầu phân tích thất bại (Mã lỗi ${res.status}).`);
  }

  if (!payload.recommendation || !payload.optimizedSummary) {
    throw new Error('Phản hồi từ máy chủ không chứa cấu trúc phương án Kaizen hợp lệ.');
  }

  return {
    recommendation: payload.recommendation,
    optimizedSummary: payload.optimizedSummary,
  };
}
