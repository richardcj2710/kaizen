import type {
  BeforeAfterStationComparison,
  BottleneckSimulation,
  OptimizedStation,
  StationInput,
  StationWithMetrics,
  VerificationMetrics,
} from '../types/kaizen';

export const SAMPLE_POLO_LINE: StationInput[] = [
  {
    id: 'CD1',
    TenCongDoan: 'Cắt & May chắp vai',
    SoLaoDong: 2,
    TG_SMV: 0.8,
    WIP: 15,
    Luong_Thang: 8000000,
    GiaiPhap_KyThuat: 'Không',
    ChiPhi_ThietBi: 0,
  },
  {
    id: 'CD2',
    TenCongDoan: 'Tra cổ & Diễu cổ',
    SoLaoDong: 3,
    TG_SMV: 1.4,
    WIP: 20,
    Luong_Thang: 9000000,
    GiaiPhap_KyThuat: 'Không',
    ChiPhi_ThietBi: 0,
  },
  {
    id: 'CD3',
    TenCongDoan: 'Tra tay & May sườn',
    SoLaoDong: 4,
    TG_SMV: 1.2,
    WIP: 18,
    Luong_Thang: 8000000,
    GiaiPhap_KyThuat: 'Không',
    ChiPhi_ThietBi: 0,
  },
  {
    id: 'CD4',
    TenCongDoan: 'Thùa khuyết & Đơm nút',
    SoLaoDong: 1,
    TG_SMV: 2.5,
    WIP: 85,
    Luong_Thang: 7500000,
    GiaiPhap_KyThuat: 'Gá cữ định hình / Máy đơm nút tự động',
    ChiPhi_ThietBi: 45000000,
  },
  {
    id: 'CD5',
    TenCongDoan: 'May gấu (Lai) áo',
    SoLaoDong: 3,
    TG_SMV: 1.0,
    WIP: 10,
    Luong_Thang: 7500000,
    GiaiPhap_KyThuat: 'Không',
    ChiPhi_ThietBi: 0,
  },
  {
    id: 'CD6',
    TenCongDoan: 'KCS & Đóng gói',
    SoLaoDong: 2,
    TG_SMV: 0.7,
    WIP: 5,
    Luong_Thang: 7000000,
    GiaiPhap_KyThuat: 'Không',
    ChiPhi_ThietBi: 0,
  },
];

export function calculateStationCapacity(soLaoDong: number, tgSmv: number): number {
  if (!Number.isFinite(soLaoDong) || !Number.isFinite(tgSmv) || soLaoDong <= 0 || tgSmv <= 0) {
    return 0;
  }
  return Math.round((soLaoDong * 60) / tgSmv);
}

export function simulateLine(stations: StationInput[]): BottleneckSimulation {
  if (stations.length === 0) {
    return {
      stations: [],
      bottleneckStation: null,
      bottleneckId: null,
      lineThroughput: 0,
      totalWorkers: 0,
      totalWip: 0,
      totalMonthlyLaborCost: 0,
      totalEquipmentCost: 0,
      averageCapacity: 0,
      balanceEfficiencyPct: 0,
    };
  }

  const capacities = stations.map((s) => calculateStationCapacity(s.SoLaoDong, s.TG_SMV));
  const minCapacity = Math.min(...capacities);
  const bottleneckIndex = capacities.indexOf(minCapacity);

  const enriched: StationWithMetrics[] = stations.map((station, idx) => ({
    ...station,
    Capacity: capacities[idx],
    isBottleneck: idx === bottleneckIndex,
  }));

  const bottleneckStation = enriched[bottleneckIndex] ?? null;
  const totalWorkers = enriched.reduce((sum, s) => sum + s.SoLaoDong, 0);
  const totalWip = enriched.reduce((sum, s) => sum + s.WIP, 0);
  const totalMonthlyLaborCost = enriched.reduce(
    (sum, s) => sum + s.SoLaoDong * s.Luong_Thang,
    0
  );
  const totalEquipmentCost = enriched.reduce((sum, s) => sum + s.ChiPhi_ThietBi, 0);
  const sumCapacity = enriched.reduce((sum, s) => sum + s.Capacity, 0);
  const averageCapacity = Math.round(sumCapacity / enriched.length);
  const maxCapacity = Math.max(...capacities);
  const balanceEfficiencyPct =
    maxCapacity > 0 ? Math.round((sumCapacity / (enriched.length * maxCapacity)) * 100) : 0;

  return {
    stations: enriched,
    bottleneckStation,
    bottleneckId: bottleneckStation?.id ?? null,
    lineThroughput: minCapacity,
    totalWorkers,
    totalWip,
    totalMonthlyLaborCost,
    totalEquipmentCost,
    averageCapacity,
    balanceEfficiencyPct,
  };
}

export function enforceZeroLayoffInvariant(
  originalStations: StationInput[],
  aiOptimizedStations: OptimizedStation[]
): StationInput[] {
  if (originalStations.length === 0) return [];

  const targetTotalWorkers = originalStations.reduce((sum, s) => sum + s.SoLaoDong, 0);
  const aiById = new Map(aiOptimizedStations.map((s) => [s.id.trim().toUpperCase(), s]));

  const merged: StationInput[] = originalStations.map((orig) => {
    const match = aiById.get(orig.id.trim().toUpperCase());
    const rawWorkers = match ? Math.round(Number(match.SoLaoDong)) : orig.SoLaoDong;
    const rawSmv = match ? Number(match.TG_SMV) : orig.TG_SMV;
    const rawWip = match ? Math.round(Number(match.WIP)) : orig.WIP;

    return {
      ...orig,
      SoLaoDong: Number.isFinite(rawWorkers) && rawWorkers >= 1 ? rawWorkers : 1,
      TG_SMV: Number.isFinite(rawSmv) && rawSmv > 0 ? Number(rawSmv.toFixed(2)) : orig.TG_SMV,
      WIP: Number.isFinite(rawWip) && rawWip >= 0 ? rawWip : orig.WIP,
    };
  });

  // Ensure exact conservation of workers (0% layoffs, no phantom hires)
  let currentTotal = merged.reduce((sum, s) => sum + s.SoLaoDong, 0);
  let safetyCounter = 0;

  while (currentTotal !== targetTotalWorkers && safetyCounter < 100) {
    safetyCounter += 1;
    if (currentTotal < targetTotalWorkers) {
      // Add worker to the lowest-capacity station
      let minIdx = 0;
      let minCap = Infinity;
      merged.forEach((s, i) => {
        const cap = calculateStationCapacity(s.SoLaoDong, s.TG_SMV);
        if (cap < minCap) {
          minCap = cap;
          minIdx = i;
        }
      });
      merged[minIdx] = { ...merged[minIdx], SoLaoDong: merged[minIdx].SoLaoDong + 1 };
      currentTotal += 1;
    } else {
      // Remove excess worker from highest-capacity station with > 1 worker
      let maxIdx = -1;
      let maxCap = -1;
      merged.forEach((s, i) => {
        if (s.SoLaoDong > 1) {
          const cap = calculateStationCapacity(s.SoLaoDong, s.TG_SMV);
          if (cap > maxCap) {
            maxCap = cap;
            maxIdx = i;
          }
        }
      });
      if (maxIdx === -1) break;
      merged[maxIdx] = { ...merged[maxIdx], SoLaoDong: merged[maxIdx].SoLaoDong - 1 };
      currentTotal -= 1;
    }
  }

  return merged;
}

export function computeVerificationMetrics(
  beforeStations: StationInput[],
  afterStations: StationInput[],
  estimatedRoiMonths: number
): VerificationMetrics {
  const beforeSim = simulateLine(beforeStations);
  const afterSim = simulateLine(afterStations);

  const throughputIncreasePct =
    beforeSim.lineThroughput > 0
      ? Math.round(
          ((afterSim.lineThroughput - beforeSim.lineThroughput) / beforeSim.lineThroughput) * 100
        )
      : 0;

  const wipReductionPct =
    beforeSim.totalWip > 0
      ? Math.round(((beforeSim.totalWip - afterSim.totalWip) / beforeSim.totalWip) * 100)
      : 0;

  const comparisons: BeforeAfterStationComparison[] = beforeSim.stations.map((before, idx) => {
    const after = afterSim.stations[idx] ?? before;
    const capacityDeltaPct =
      before.Capacity > 0
        ? Math.round(((after.Capacity - before.Capacity) / before.Capacity) * 100)
        : 0;

    return {
      id: before.id,
      TenCongDoan: before.TenCongDoan,
      beforeCapacity: before.Capacity,
      afterCapacity: after.Capacity,
      beforeWorkers: before.SoLaoDong,
      afterWorkers: after.SoLaoDong,
      beforeSmv: before.TG_SMV,
      afterSmv: after.TG_SMV,
      beforeWip: before.WIP,
      afterWip: after.WIP,
      capacityDeltaPct,
    };
  });

  return {
    beforeThroughput: beforeSim.lineThroughput,
    afterThroughput: afterSim.lineThroughput,
    throughputIncreasePct,
    beforeTotalWip: beforeSim.totalWip,
    afterTotalWip: afterSim.totalWip,
    wipReductionPct,
    beforeTotalWorkers: beforeSim.totalWorkers,
    afterTotalWorkers: afterSim.totalWorkers,
    zeroLayoffVerified: beforeSim.totalWorkers === afterSim.totalWorkers,
    beforeBalanceEfficiencyPct: beforeSim.balanceEfficiencyPct,
    afterBalanceEfficiencyPct: afterSim.balanceEfficiencyPct,
    estimatedRoiMonths: Number.isFinite(estimatedRoiMonths)
      ? Number(estimatedRoiMonths.toFixed(1))
      : 0,
    afterBottleneckId: afterSim.bottleneckId,
    comparisons,
  };
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}
