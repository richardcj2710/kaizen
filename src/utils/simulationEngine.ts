import { generateSampleSmeRows } from '../data/samplePoloLine';
import type {
  AggregatedFactoryDataset,
  OptimizedStageUpdate,
  QuarterSummary,
  StageMetrics,
  VerificationMetrics,
} from '../types/kaizen';
import {
  STAGE_DEFECT_ALERT_THRESHOLD,
  StreamingKaizenAggregator,
  WORKING_HOURS_PER_MONTH,
  calculateEffectiveCapacity,
  computeQuarterFinancials,
} from './streamingAggregator';

export function buildSampleSmeDataset(): AggregatedFactoryDataset {
  const rows = generateSampleSmeRows();
  const aggregator = new StreamingKaizenAggregator();
  for (const row of rows) {
    aggregator.ingestObjectRow(row as unknown as Record<string, unknown>);
  }
  return aggregator.finalize(
    'Dữ liệu mẫu SME — 7 năm (2020-Q1 → 2026-Q4 · 28 Quý · 76 CN · 12 Tổ)'
  );
}

export function recalculateQuarterSummary(summary: QuarterSummary): QuarterSummary {
  const rawStages = summary.stages.map((st) => {
    const cap = calculateEffectiveCapacity(st.SoLaoDong, st.TG_SMV, st.HieuSuat_TB);
    const isHighDefectStage =
      st.TyLeLoi > STAGE_DEFECT_ALERT_THRESHOLD ||
      st.teams.some((t) => t.defectRatePct > STAGE_DEFECT_ALERT_THRESHOLD);
    const isLowEfficiencyOutlier = st.HieuSuat_TB < 35;

    return {
      ...st,
      Capacity: cap,
      isBottleneck: false,
      isHighDefectStage,
      isLowEfficiencyOutlier,
      isAlertStage: isHighDefectStage || isLowEfficiencyOutlier,
    };
  });

  const minCap = rawStages.length > 0 ? Math.min(...rawStages.map((s) => s.Capacity)) : 0;
  const bottleneckIdx = rawStages.findIndex((s) => s.Capacity === minCap);

  const stages = rawStages.map((st, idx) => {
    const isBottleneck = idx === bottleneckIdx;
    return {
      ...st,
      isBottleneck,
      isAlertStage: isBottleneck || st.isHighDefectStage || st.isLowEfficiencyOutlier,
    };
  });

  const totalWorkers = stages.reduce((s, st) => s + st.SoLaoDong, 0);
  const totalWip = stages.reduce((s, st) => s + st.WIP, 0);
  const totalMonthlyPayroll = stages.reduce(
    (s, st) => s + st.SoLaoDong * st.Luong_Thang,
    0
  );
  const monthlyOutput = minCap * WORKING_HOURS_PER_MONTH;
  const unitLaborCost =
    monthlyOutput > 0 ? Math.round(totalMonthlyPayroll / monthlyOutput) : 0;

  const weightedProductivityPct =
    totalWorkers > 0
      ? Number(
          (
            stages.reduce((s, st) => s + st.HieuSuat_TB * st.SoLaoDong, 0) /
            totalWorkers
          ).toFixed(1)
        )
      : 0;

  const overallDefectRatePct =
    totalWorkers > 0
      ? Number(
          (
            stages.reduce((s, st) => s + st.TyLeLoi * st.SoLaoDong, 0) /
            totalWorkers
          ).toFixed(2)
        )
      : 0;

  const financials = computeQuarterFinancials({
    quarter: summary.quarter,
    marketContext: summary.financials?.marketContext ?? 'Thị trường ổn định',
    hourlyLineThroughput: minCap,
    overallDefectRatePct,
    stages,
    marketOrderDemand:
      summary.financials?.marketOrderDemand ?? minCap * 624,
    unitSellingPrice: summary.financials?.unitSellingPrice ?? 120000,
    unitMaterialCost: summary.financials?.unitMaterialCost ?? 49000,
  });

  return {
    ...summary,
    totalWorkers,
    hourlyLineThroughput: minCap,
    totalQuarterlyOutput: minCap * 624,
    weightedProductivityPct,
    overallDefectRatePct,
    totalWip,
    unitLaborCost,
    bottleneckStageId: stages[bottleneckIdx]?.id ?? null,
    stages,
    financials,
  };
}

export function normalizeOptimizedStages(
  beforeSummary: QuarterSummary,
  aiStages: OptimizedStageUpdate[]
): QuarterSummary {
  const originalWorkers = beforeSummary.totalWorkers;
  const aiMap = new Map(aiStages.map((s) => [s.id.trim().toUpperCase(), s]));

  const updatedStages: StageMetrics[] = beforeSummary.stages.map((orig) => {
    const match = aiMap.get(orig.id.trim().toUpperCase());
    const workers = match ? Math.max(1, Math.round(Number(match.SoLaoDong))) : orig.SoLaoDong;
    const smv =
      match && Number(match.TG_SMV) > 0
        ? Number(Number(match.TG_SMV).toFixed(2))
        : orig.TG_SMV;
    const rawEff = match ? Number(match.HieuSuat_TB) : orig.HieuSuat_TB;
    // Enforce realistic SME factory ceiling (25% - 70%)
    const eff = Number.isFinite(rawEff)
      ? Math.min(70, Math.max(25, Math.round(rawEff)))
      : orig.HieuSuat_TB;
    const rawDefect = match ? Number(match.TyLeLoi) : orig.TyLeLoi;
    const defectRate = Number.isFinite(rawDefect)
      ? Math.min(15, Math.max(0.5, Number(rawDefect.toFixed(2))))
      : orig.TyLeLoi;
    const wip =
      match && Number.isFinite(Number(match.WIP)) && Number(match.WIP) >= 0
        ? Math.round(Number(match.WIP))
        : orig.WIP;

    const updatedTeams = orig.teams.map((t) => ({
      ...t,
      productivityPct: Math.max(t.productivityPct, Math.min(68, eff)),
      defectRatePct: Math.min(t.defectRatePct, defectRate),
      isLowProductivityTeam: false,
      isHighDefectTeam: defectRate > 4.5,
      isAlertTeam: defectRate > STAGE_DEFECT_ALERT_THRESHOLD,
    }));

    return {
      ...orig,
      SoLaoDong: workers,
      TG_SMV: smv,
      HieuSuat_TB: eff,
      TyLeLoi: defectRate,
      WIP: wip,
      teams: updatedTeams,
    };
  });

  // Never allow total headcount to exceed original SME headcount
  let totalAfter = updatedStages.reduce((s, st) => s + st.SoLaoDong, 0);
  let guard = 0;
  while (totalAfter > originalWorkers && guard < 100) {
    guard += 1;
    let maxIdx = -1;
    let maxCap = -1;
    updatedStages.forEach((st, idx) => {
      if (st.SoLaoDong > 1) {
        const cap = calculateEffectiveCapacity(st.SoLaoDong, st.TG_SMV, st.HieuSuat_TB);
        if (cap > maxCap) {
          maxCap = cap;
          maxIdx = idx;
        }
      }
    });
    if (maxIdx === -1) break;
    updatedStages[maxIdx] = {
      ...updatedStages[maxIdx],
      SoLaoDong: updatedStages[maxIdx].SoLaoDong - 1,
    };
    totalAfter -= 1;
  }

  return recalculateQuarterSummary({
    ...beforeSummary,
    stages: updatedStages,
  });
}

export function computeVerificationMetrics(
  beforeSummary: QuarterSummary,
  afterSummary: QuarterSummary,
  estimatedRoiMonths: number
): VerificationMetrics {
  const beforeThroughput = beforeSummary.hourlyLineThroughput;
  const afterThroughput = afterSummary.hourlyLineThroughput;
  const throughputIncreasePct =
    beforeThroughput > 0
      ? Math.round(((afterThroughput - beforeThroughput) / beforeThroughput) * 100)
      : 0;

  const beforeDefectRatePct = beforeSummary.overallDefectRatePct;
  const afterDefectRatePct = afterSummary.overallDefectRatePct;
  const defectRateReductionPct =
    beforeDefectRatePct > 0
      ? Math.round(
          ((beforeDefectRatePct - afterDefectRatePct) / beforeDefectRatePct) * 100
        )
      : 0;

  const beforeUnitCost = beforeSummary.unitLaborCost;
  const afterUnitCost = afterSummary.unitLaborCost;
  const unitCostReductionPct =
    beforeUnitCost > 0
      ? Math.round(((beforeUnitCost - afterUnitCost) / beforeUnitCost) * 100)
      : 0;

  const beforeTotalWip = beforeSummary.totalWip;
  const afterTotalWip = afterSummary.totalWip;
  const wipReductionPct =
    beforeTotalWip > 0
      ? Math.round(((beforeTotalWip - afterTotalWip) / beforeTotalWip) * 100)
      : 0;

  const comparisons = beforeSummary.stages.map((before, idx) => {
    const after = afterSummary.stages[idx] ?? before;
    return {
      id: before.id,
      TenCongDoan: before.TenCongDoan,
      beforeCapacity: before.Capacity,
      afterCapacity: after.Capacity,
      beforeDefectRate: before.TyLeLoi,
      afterDefectRate: after.TyLeLoi,
      beforeWorkers: before.SoLaoDong,
      afterWorkers: after.SoLaoDong,
      beforeEfficiency: before.HieuSuat_TB,
      afterEfficiency: after.HieuSuat_TB,
      beforeWip: before.WIP,
      afterWip: after.WIP,
    };
  });

  return {
    beforeThroughput,
    afterThroughput,
    throughputIncreasePct,
    beforeDefectRatePct,
    afterDefectRatePct,
    defectRateReductionPct,
    beforeUnitCost,
    afterUnitCost,
    unitCostReductionPct,
    beforeTotalWip,
    afterTotalWip,
    wipReductionPct,
    beforeTotalWorkers: beforeSummary.totalWorkers,
    afterTotalWorkers: afterSummary.totalWorkers,
    workerDelta: afterSummary.totalWorkers - beforeSummary.totalWorkers,
    estimatedRoiMonths: Number.isFinite(estimatedRoiMonths)
      ? Number(estimatedRoiMonths.toFixed(1))
      : 0,
    comparisons,
  };
}
