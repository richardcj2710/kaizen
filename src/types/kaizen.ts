export interface StationInput {
  id: string;
  TenCongDoan: string;
  SoLaoDong: number;
  TG_SMV: number;
  WIP: number;
  Luong_Thang: number;
  GiaiPhap_KyThuat: string;
  ChiPhi_ThietBi: number;
}

export interface StationWithMetrics extends StationInput {
  Capacity: number;
  isBottleneck: boolean;
}

export interface BottleneckSimulation {
  stations: StationWithMetrics[];
  bottleneckStation: StationWithMetrics | null;
  bottleneckId: string | null;
  lineThroughput: number;
  totalWorkers: number;
  totalWip: number;
  totalMonthlyLaborCost: number;
  totalEquipmentCost: number;
  averageCapacity: number;
  balanceEfficiencyPct: number;
}

export interface OptimizedStation {
  id: string;
  SoLaoDong: number;
  TG_SMV: number;
  WIP: number;
}

export interface KaizenAiRecommendation {
  bottleneck_id: string;
  root_cause_vi: string;
  human_reallocation_vi: string;
  technical_kaizen_vi: string;
  estimated_roi_months: number;
  optimized_stations: OptimizedStation[];
}

export interface BeforeAfterStationComparison {
  id: string;
  TenCongDoan: string;
  beforeCapacity: number;
  afterCapacity: number;
  beforeWorkers: number;
  afterWorkers: number;
  beforeSmv: number;
  afterSmv: number;
  beforeWip: number;
  afterWip: number;
  capacityDeltaPct: number;
}

export interface VerificationMetrics {
  beforeThroughput: number;
  afterThroughput: number;
  throughputIncreasePct: number;
  beforeTotalWip: number;
  afterTotalWip: number;
  wipReductionPct: number;
  beforeTotalWorkers: number;
  afterTotalWorkers: number;
  zeroLayoffVerified: boolean;
  beforeBalanceEfficiencyPct: number;
  afterBalanceEfficiencyPct: number;
  estimatedRoiMonths: number;
  afterBottleneckId: string | null;
  comparisons: BeforeAfterStationComparison[];
}
