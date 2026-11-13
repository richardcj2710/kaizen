import type {
  MarketSimulationInputs,
  OutlierWorkerStat,
  ProfitComparisonResult,
  QuarterFinancials,
  QuarterSummary,
  SevenYearQuarterPoint,
  StageMetrics,
  WorkerRetentionSummary,
} from '../types/kaizen';
import {
  DEFAULT_REWORK_LABOR_PENALTY,
  WORKING_HOURS_PER_MONTH,
  WORKING_HOURS_PER_QUARTER,
  calculateEffectiveCapacity,
  computeQuarterFinancials,
} from './streamingAggregator';

export function simulateMarketBaseline(
  baseSummary: QuarterSummary,
  inputs: MarketSimulationInputs
): QuarterFinancials {
  const demandMultiplier = 1 + inputs.demandDeltaPct / 100;
  const priceMultiplier = 1 + inputs.priceDeltaPct / 100;

  const adjustedDemand = Math.max(
    1000,
    Math.round(baseSummary.financials.marketOrderDemand * demandMultiplier)
  );
  const adjustedPrice = Math.max(
    30000,
    Math.round(baseSummary.financials.unitSellingPrice * priceMultiplier)
  );

  return computeQuarterFinancials({
    quarter: baseSummary.quarter,
    marketContext: baseSummary.financials.marketContext,
    hourlyLineThroughput: baseSummary.hourlyLineThroughput,
    overallDefectRatePct: baseSummary.overallDefectRatePct,
    stages: baseSummary.stages,
    marketOrderDemand: adjustedDemand,
    unitSellingPrice: adjustedPrice,
    unitMaterialCost: baseSummary.financials.unitMaterialCost,
    reworkPenaltyPerUnit: DEFAULT_REWORK_LABOR_PENALTY,
  });
}

function collectOutlierWorkers(stages: StageMetrics[]): OutlierWorkerStat[] {
  const result: OutlierWorkerStat[] = [];
  for (const st of stages) {
    for (const t of st.teams) {
      for (const w of t.outlierWorkers) {
        result.push(w);
      }
    }
  }
  // Sort worst efficiency + highest defect first
  return result.sort(
    (a, b) => a.efficiencyPct - b.efficiencyPct || b.defectRatePct - a.defectRatePct
  );
}

function recalculateSummaryWithFinancials(
  baseSummary: QuarterSummary,
  stages: StageMetrics[],
  marketOrderDemand: number,
  unitSellingPrice: number,
  unitMaterialCost: number,
  amortizedCapexVnd: number
): QuarterSummary {
  const rawStages = stages.map((st) => {
    const cap = calculateEffectiveCapacity(st.SoLaoDong, st.TG_SMV, st.HieuSuat_TB);
    const isHighDefectStage =
      st.TyLeLoi > 3.5 || st.teams.some((t) => t.defectRatePct > 3.5);
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

  const finalStages = rawStages.map((st, idx) => {
    const isBottleneck = idx === bottleneckIdx;
    return {
      ...st,
      isBottleneck,
      isAlertStage: isBottleneck || st.isHighDefectStage || st.isLowEfficiencyOutlier,
    };
  });

  const totalWorkers = finalStages.reduce((s, st) => s + st.SoLaoDong, 0);
  const totalWip = finalStages.reduce((s, st) => s + st.WIP, 0);
  const totalMonthlyPayroll = finalStages.reduce(
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
            finalStages.reduce((s, st) => s + st.HieuSuat_TB * st.SoLaoDong, 0) /
            totalWorkers
          ).toFixed(1)
        )
      : 0;

  const overallDefectRatePct =
    totalWorkers > 0
      ? Number(
          (
            finalStages.reduce((s, st) => s + st.TyLeLoi * st.SoLaoDong, 0) /
            totalWorkers
          ).toFixed(2)
        )
      : 0;

  const financials = computeQuarterFinancials({
    quarter: baseSummary.quarter,
    marketContext: baseSummary.financials.marketContext,
    hourlyLineThroughput: minCap,
    overallDefectRatePct,
    stages: finalStages,
    marketOrderDemand,
    unitSellingPrice,
    unitMaterialCost,
    amortizedCapexVnd,
  });

  return {
    ...baseSummary,
    totalWorkers,
    hourlyLineThroughput: minCap,
    totalQuarterlyOutput: minCap * WORKING_HOURS_PER_QUARTER,
    weightedProductivityPct,
    overallDefectRatePct,
    totalWip,
    unitLaborCost,
    bottleneckStageId: finalStages[bottleneckIdx]?.id ?? null,
    stages: finalStages,
    financials,
  };
}

/**
 * Deterministic Revenue-Driven Profit Prediction & Human-Centered Optimizer.
 * Evaluates Market Demand vs. Bottleneck Capacity and picks the profit-maximizing,
 * worker-protective intervention plan.
 */
export function autoOptimizeHumanCenteredPlan(
  baseSummary: QuarterSummary,
  inputs: MarketSimulationInputs,
  historicalSeries: SevenYearQuarterPoint[]
): ProfitComparisonResult {
  const beforeFinancials = simulateMarketBaseline(baseSummary, inputs);
  const beforeSummary: QuarterSummary = {
    ...baseSummary,
    financials: beforeFinancials,
  };

  const adjustedDemand = beforeFinancials.marketOrderDemand;
  const adjustedPrice = beforeFinancials.unitSellingPrice;
  const unitMaterialCost = beforeFinancials.unitMaterialCost;

  const isDemandSurge =
    adjustedDemand > beforeFinancials.goodOutputUnits * 1.03;
  const isDownturn =
    inputs.demandDeltaPct <= -10 ||
    adjustedDemand < beforeFinancials.goodOutputUnits * 0.97;

  const regime: ProfitComparisonResult['regime'] = isDemandSurge
    ? 'demand_surge'
    : isDownturn
      ? 'market_downturn'
      : 'balanced';

  const regimeLabelVi =
    regime === 'demand_surge'
      ? 'Nhu cầu tăng vượt công suất (Mở rộng nút thắt đón doanh thu)'
      : regime === 'market_downturn'
        ? 'Thị trường suy giảm (Giữ nhân sự cốt lõi · Cắt giảm thiệt hại lỗi)'
        : 'Thị trường ổn định (Cân bằng chuyền & tối ưu biên lợi nhuận)';

  // Deep clone stages for optimization
  const workingStages: StageMetrics[] = baseSummary.stages.map((st) => ({
    ...st,
    teams: st.teams.map((t) => ({ ...t })),
  }));

  const budget = Math.max(0, inputs.kaizenBudgetVnd);
  const deployedInvestmentsVi: string[] = [];
  let capexSpent = 0;
  let reallocatedWorkers = 0;

  // Step 1: Deploy budget-constrained Jigs (Gá cữ may) & Inline QC across high-defect/bottleneck stages
  const hasJigBudget = budget >= 8_000_000;
  const hasMachineBudget = budget >= 45_000_000;

  if (hasJigBudget) {
    const jigSpend =
      regime === 'market_downturn'
        ? Math.min(budget, 12_000_000)
        : Math.min(budget, hasMachineBudget ? 18_000_000 : budget * 0.8);
    capexSpent += jigSpend;
    deployedInvestmentsVi.push(
      'Gá cữ may chống lệch + Kiểm tra chất lượng tại bàn (Inline QC)'
    );
  }

  // Required hourly capacity to satisfy market order demand (accounting for target defect rate)
  const targetHourlyOutput = Math.min(
    Math.ceil(adjustedDemand / WORKING_HOURS_PER_QUARTER / 0.986),
    Math.max(beforeSummary.hourlyLineThroughput * 2.5, 260)
  );

  // Step 2: Apply regime-aware technical / quality upgrades
  workingStages.forEach((st) => {
    const isBottleneck = st.isBottleneck;
    if (isBottleneck && hasMachineBudget && regime === 'demand_surge') {
      const machineSpend = Math.min(budget - capexSpent, 42_000_000);
      if (machineSpend >= 20_000_000) {
        capexSpent += machineSpend;
        // Programmable buttonholer / jig reduces SMV by ~15% realistically
        st.TG_SMV = Number(Math.max(0.5, st.TG_SMV * 0.85).toFixed(2));
        st.GiaiPhap_KyThuat = 'Máy chuyên dùng lập trình + Gá cữ chống lệch';
        deployedInvestmentsVi.push(
          `Máy chuyên dùng lập trình cho ${st.id} (${st.TenCongDoan})`
        );
      }
    }

    // Inline QC + Jigs slash defect rate across all regimes
    const defectCutFactor = hasJigBudget ? 0.52 : 0.72;
    st.TyLeLoi = Number(Math.max(0.9, st.TyLeLoi * defectCutFactor).toFixed(2));

    if (regime === 'market_downturn') {
      // In downturns, avoid overproduction Muda: pace line throughput to demand instead of inflating speed above beforeSummary
      st.HieuSuat_TB = Math.min(62, Math.max(st.HieuSuat_TB, 48));
      st.WIP = Math.max(4, Math.round(st.WIP * 0.6));
    } else {
      if (st.HieuSuat_TB < 56) {
        st.HieuSuat_TB = Math.min(62, Math.max(st.HieuSuat_TB + 10, 56));
      } else {
        st.HieuSuat_TB = Math.min(64, st.HieuSuat_TB + 2);
      }
      st.WIP = Math.max(4, Math.round(st.WIP * (isBottleneck ? 0.35 : 0.72)));
    }

    st.Capacity = calculateEffectiveCapacity(st.SoLaoDong, st.TG_SMV, st.HieuSuat_TB);
  });

  // Step 3: Regime-specific cross-team reallocation & selective outlier evaluation
  const outliers = collectOutlierWorkers(workingStages);
  const trimmedWorkerIds: string[] = [];

  if (regime === 'demand_surge' || regime === 'balanced') {
    // Reallocate skilled workers (55%–65%) from over-capacity stages to bottleneck stages without exceeding headcount
    for (let iter = 0; iter < 14; iter += 1) {
      workingStages.forEach((st) => {
        st.Capacity = calculateEffectiveCapacity(
          st.SoLaoDong,
          st.TG_SMV,
          st.HieuSuat_TB
        );
      });

      const minStage = workingStages.reduce((a, b) =>
        a.Capacity < b.Capacity ? a : b
      );
      if (minStage.Capacity >= targetHourlyOutput) break;

      let donor: StageMetrics | null = null;
      let bestDonorSlack = 0;

      for (const candidate of workingStages) {
        if (candidate.id === minStage.id || candidate.SoLaoDong <= 4) continue;
        const capAfterGive = calculateEffectiveCapacity(
          candidate.SoLaoDong - 1,
          candidate.TG_SMV,
          candidate.HieuSuat_TB
        );
        const slack = capAfterGive - minStage.Capacity;
        if (capAfterGive >= minStage.Capacity && slack > bestDonorSlack) {
          bestDonorSlack = slack;
          donor = candidate;
        }
      }

      if (!donor) break;
      donor.SoLaoDong -= 1;
      minStage.SoLaoDong += 1;
      reallocatedWorkers += 1;
    }

    // Selectively replace/trim only extreme outliers (<35% eff & >4.5% defect) if excess slack exists above target demand
    for (const ow of outliers) {
      if (trimmedWorkerIds.length >= 2) break;
      const st = workingStages.find((s) => s.id === ow.stageId);
      if (!st || st.SoLaoDong <= 5) continue;
      const capWithoutOutlier = calculateEffectiveCapacity(
        st.SoLaoDong - 1,
        st.TG_SMV,
        Math.min(64, st.HieuSuat_TB + 2)
      );
      const otherMin = Math.min(
        ...workingStages.filter((s) => s.id !== st.id).map((s) => s.Capacity)
      );
      if (capWithoutOutlier >= Math.min(targetHourlyOutput, otherMin)) {
        st.SoLaoDong -= 1;
        st.HieuSuat_TB = Math.min(64, st.HieuSuat_TB + 2);
        st.TyLeLoi = Number(Math.max(1.0, st.TyLeLoi * 0.9).toFixed(2));
        trimmedWorkerIds.push(ow.workerId);
      }
    }
  } else {
    // MARKET DOWNTURN: Protect core workforce (no mass layoffs!).
    // Trim ONLY severe <35% / >4.5% outliers when doing so keeps good output >= demand and strictly improves net profit.
    const requiredHourlyForDemand = Math.ceil(
      adjustedDemand / WORKING_HOURS_PER_QUARTER / 0.985
    );

    for (const ow of outliers) {
      if (trimmedWorkerIds.length >= 3) break;
      if (ow.efficiencyPct >= 35 && ow.defectRatePct <= 4.5) continue;

      const st = workingStages.find((s) => s.id === ow.stageId);
      if (!st || st.SoLaoDong <= 4) continue;

      const capWithout = calculateEffectiveCapacity(
        st.SoLaoDong - 1,
        st.TG_SMV,
        Math.min(62, st.HieuSuat_TB + 2)
      );
      if (capWithout >= requiredHourlyForDemand) {
        st.SoLaoDong -= 1;
        st.HieuSuat_TB = Math.min(62, st.HieuSuat_TB + 2);
        st.TyLeLoi = Number(Math.max(0.9, st.TyLeLoi * 0.84).toFixed(2));
        trimmedWorkerIds.push(ow.workerId);
      }
    }

    // Also pull excess WIP / Pull pacing: ensure bottleneck stage doesn't overproduce raw material beyond demand
    const minStage = workingStages.reduce((a, b) =>
      a.Capacity < b.Capacity ? a : b
    );
    if (minStage.Capacity > beforeSummary.hourlyLineThroughput) {
      // Pace line rhythm down to market order demand (Just-In-Time Pull) so fabric isn't wasted on unsold units
      const pacedHourly = Math.max(
        requiredHourlyForDemand,
        Math.min(beforeSummary.hourlyLineThroughput, minStage.Capacity)
      );
      const pacedEff = Math.max(
        40,
        Math.min(
          62,
          Math.round((pacedHourly * minStage.TG_SMV * 100) / (minStage.SoLaoDong * 60))
        )
      );
      minStage.HieuSuat_TB = pacedEff;
      minStage.Capacity = calculateEffectiveCapacity(
        minStage.SoLaoDong,
        minStage.TG_SMV,
        minStage.HieuSuat_TB
      );
    }
  }

  // Sync stage teams proportionally for drill-down consistency
  workingStages.forEach((st) => {
    st.Capacity = calculateEffectiveCapacity(st.SoLaoDong, st.TG_SMV, st.HieuSuat_TB);
    const totalPrevTeamWorkers = st.teams.reduce((s, t) => s + t.workerCount, 0);
    let remainingWorkers = st.SoLaoDong;

    st.teams = st.teams.map((t, tIdx) => {
      const isLast = tIdx === st.teams.length - 1;
      const newCount = isLast
        ? Math.max(1, remainingWorkers)
        : Math.max(
            1,
            Math.round((t.workerCount / Math.max(1, totalPrevTeamWorkers)) * st.SoLaoDong)
          );
      remainingWorkers = Math.max(0, remainingWorkers - newCount);

      const newEff = Math.min(65, Math.max(t.productivityPct, st.HieuSuat_TB));
      const newDef = Number(Math.min(t.defectRatePct, st.TyLeLoi).toFixed(2));
      return {
        ...t,
        workerCount: newCount,
        productivityPct: newEff,
        hourlyCapacity: calculateEffectiveCapacity(newCount, st.TG_SMV, newEff),
        defectRatePct: newDef,
        wip: Math.max(2, Math.round(st.WIP / Math.max(1, st.teams.length))),
        isLowProductivityTeam: false,
        isHighDefectTeam: newDef > 4.5,
        isAlertTeam: newDef > 3.5,
        outlierWorkers: t.outlierWorkers.filter(
          (w) => !trimmedWorkerIds.includes(w.workerId)
        ),
      };
    });
  });

  // Amortize KAIZEN CapEx over 4 quarters (1 year) per Net_Profit formula
  const effectiveCapex = capexSpent > 0 ? capexSpent : Math.min(budget, 15_000_000);
  const amortizedKaizenCapex = Math.round(effectiveCapex / 4);

  const afterSummary = recalculateSummaryWithFinancials(
    baseSummary,
    workingStages,
    adjustedDemand,
    adjustedPrice,
    unitMaterialCost,
    amortizedKaizenCapex
  );
  const afterFinancials = afterSummary.financials;

  const revenueDeltaVnd =
    afterFinancials.realizedRevenueVnd - beforeFinancials.realizedRevenueVnd;
  const revenueDeltaPct =
    beforeFinancials.realizedRevenueVnd > 0
      ? Number(
          ((revenueDeltaVnd / beforeFinancials.realizedRevenueVnd) * 100).toFixed(1)
        )
      : 0;

  const profitDeltaVnd =
    afterFinancials.netProfitVnd - beforeFinancials.netProfitVnd;
  const profitDeltaPct =
    Math.abs(beforeFinancials.netProfitVnd) > 0
      ? Number(
          (
            (profitDeltaVnd / Math.abs(beforeFinancials.netProfitVnd)) *
            100
          ).toFixed(1)
        )
      : 0;

  const defectLossSavedVnd =
    beforeFinancials.defectLossVnd - afterFinancials.defectLossVnd;
  const revenueUnlockedProfitVnd = Math.max(
    0,
    Math.round(
      (afterFinancials.sellableOutputUnits - beforeFinancials.sellableOutputUnits) *
        (adjustedPrice - unitMaterialCost)
    )
  );
  const wasteReductionProfitVnd = Math.max(
    0,
    defectLossSavedVnd +
      (beforeFinancials.totalLaborCostVnd - afterFinancials.totalLaborCostVnd)
  );

  const throughputDeltaPct =
    beforeSummary.hourlyLineThroughput > 0
      ? Math.round(
          ((afterSummary.hourlyLineThroughput -
            beforeSummary.hourlyLineThroughput) /
            beforeSummary.hourlyLineThroughput) *
            100
        )
      : 0;

  const initialWorkers = beforeSummary.totalWorkers;
  const finalWorkers = afterSummary.totalWorkers;
  const trimmedOutlierWorkers = Math.max(0, initialWorkers - finalWorkers);
  const retainedAndUpskilledWorkers = Math.max(
    0,
    finalWorkers - reallocatedWorkers
  );
  const humanCenteredIndexPct =
    initialWorkers > 0
      ? Number(((finalWorkers / initialWorkers) * 100).toFixed(1))
      : 100;

  const retention: WorkerRetentionSummary = {
    initialWorkers,
    finalWorkers,
    retainedAndUpskilledWorkers,
    reallocatedCrossTeamWorkers: reallocatedWorkers,
    trimmedOutlierWorkers,
    trimmedWorkerIds,
    humanCenteredIndexPct,
  };

  // Build 7-year historical + forecast trajectory
  const trendWithForecast: SevenYearQuarterPoint[] = historicalSeries.map(
    (pt, idx) => {
      const isLast = idx === historicalSeries.length - 1;
      if (!isLast) {
        return {
          ...pt,
          projectedRevenueVnd: null,
          projectedProfitVnd: null,
        };
      }
      return {
        ...pt,
        projectedRevenueVnd: pt.realizedRevenueVnd,
        projectedProfitVnd: pt.netProfitVnd,
      };
    }
  );

  trendWithForecast.push({
    quarter: 'Dự báo Sau Kaizen',
    marketContext: regimeLabelVi,
    hourlyThroughput: afterSummary.hourlyLineThroughput,
    defectRatePct: afterSummary.overallDefectRatePct,
    marketDemandUnits: adjustedDemand,
    sellableUnits: afterFinancials.sellableOutputUnits,
    realizedRevenueVnd: beforeFinancials.realizedRevenueVnd,
    netProfitVnd: beforeFinancials.netProfitVnd,
    projectedRevenueVnd: afterFinancials.realizedRevenueVnd,
    projectedProfitVnd: afterFinancials.netProfitVnd,
  });

  const strategyHeadlineVi =
    regime === 'demand_surge'
      ? `Mở khóa nút thắt ${beforeSummary.bottleneckStageId ?? 'CD4'} · Thu hồi ${new Intl.NumberFormat('vi-VN').format(afterFinancials.sellableOutputUnits - beforeFinancials.sellableOutputUnits)} sp đơn hàng bị nghẽn`
      : regime === 'market_downturn'
        ? `Bảo vệ ${humanCenteredIndexPct}% nhân sự cốt lõi · Cắt giảm ${Math.round(((defectLossSavedVnd) / Math.max(1, beforeFinancials.defectLossVnd)) * 100)}% thiệt hại hàng lỗi`
        : `Cân bằng chuyền & Giảm phế phẩm · Tăng lợi nhuận ròng +${profitDeltaPct}%`;

  const strategyDetailsVi: string[] = [
    reallocatedWorkers > 0
      ? `Điều chuyển liên tổ ${reallocatedWorkers} công nhân lành nghề (55%–65% hiệu suất) từ khâu dư công suất sang khâu nút thắt ${beforeSummary.bottleneckStageId ?? 'CD4'} để nâng đầu ra chuyền lên ${afterSummary.hourlyLineThroughput} sp/giờ.`
      : `Giữ ổn định biên chế ${finalWorkers}/${initialWorkers} công nhân cốt lõi, tập trung đào tạo tại bàn để duy trì hiệu suất 56%–64%.`,
    deployedInvestmentsVi.length > 0
      ? `Triển khai ${deployedInvestmentsVi.join(' + ')} (khấu hao ${new Intl.NumberFormat('vi-VN').format(amortizedKaizenCapex)} đ/quý), giúp giảm tỷ lệ hàng lỗi từ ${beforeSummary.overallDefectRatePct}% xuống ${afterSummary.overallDefectRatePct}%.`
      : 'Chuẩn hóa thao tác & kiểm soát chéo tại bàn không phát sinh CapEx lớn.',
    trimmedOutlierWorkers > 0
      ? `Tinh giản có chọn lọc ${trimmedOutlierWorkers} vị trí cá biệt (${trimmedWorkerIds.join(', ')}) dưới ngưỡng 35% hiệu suất / >4.5% lỗi để bảo vệ biên lợi nhuận chung.`
      : 'Không thực hiện sa thải nhân sự (0% sa thải) — toàn bộ công nhân được bảo toàn việc làm.',
  ];

  return {
    regime,
    regimeLabelVi,
    strategyHeadlineVi,
    strategyDetailsVi,
    beforeSummary,
    afterSummary,
    beforeFinancials,
    afterFinancials,
    revenueDeltaVnd,
    revenueDeltaPct,
    profitDeltaVnd,
    profitDeltaPct,
    defectLossSavedVnd,
    revenueUnlockedProfitVnd,
    wasteReductionProfitVnd,
    throughputDeltaPct,
    defectRateBeforePct: beforeSummary.overallDefectRatePct,
    defectRateAfterPct: afterSummary.overallDefectRatePct,
    retention,
    deployedInvestmentsVi,
    trendWithForecast,
  };
}
