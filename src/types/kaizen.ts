export type ThemeMode = 'light' | 'dark';
export type QuarterId = string; // e.g. '2020-Q1'..'2026-Q4' or 'Q1'..'Q4'
export type QuarterFilter = 'ALL' | QuarterId;

export interface OutlierWorkerStat {
  workerId: string;
  teamName: string;
  stageId: string;
  efficiencyPct: number;
  defectRatePct: number;
  defectUnits: number;
  reasons: ('low_efficiency' | 'high_defect')[];
}

export interface TeamMetrics {
  teamName: string;
  stageId: string;
  stageName: string;
  quarter: QuarterId;
  workerCount: number;
  weightedSmv: number;
  productivityPct: number;
  hourlyCapacity: number;
  defectCount: number;
  totalUnitsSampled: number;
  defectRatePct: number;
  wip: number;
  monthlyWagePerWorker: number;
  marketOrderDemand: number;
  unitSellingPrice: number;
  unitMaterialCost: number;
  isLowProductivityTeam: boolean; // < 35%
  isHighDefectTeam: boolean; // > 4.5%
  isAlertTeam: boolean; // > 3.5% defect or < 35% productivity
  outlierWorkers: OutlierWorkerStat[];
}

export interface StageMetrics {
  id: string;
  TenCongDoan: string;
  quarter: QuarterId;
  teamCount: number;
  SoLaoDong: number;
  TG_SMV: number;
  HieuSuat_TB: number;
  Capacity: number;
  WIP: number;
  defectCount: number;
  TyLeLoi: number;
  Luong_Thang: number;
  GiaiPhap_KyThuat: string;
  ChiPhi_ThietBi: number;
  isBottleneck: boolean;
  isHighDefectStage: boolean; // any team > 3.5% or stage > 3.5%
  isLowEfficiencyOutlier: boolean; // < 35%
  isAlertStage: boolean;
  teams: TeamMetrics[];
}

export interface QuarterFinancials {
  quarter: QuarterId;
  marketContext: string;
  marketOrderDemand: number;
  grossOutputUnits: number;
  goodOutputUnits: number;
  sellableOutputUnits: number;
  defectUnits: number;
  unitSellingPrice: number;
  unitMaterialCost: number;
  reworkPenaltyPerUnit: number;
  realizedRevenueVnd: number;
  materialCostVnd: number;
  totalLaborCostVnd: number;
  defectLossVnd: number;
  amortizedCapexVnd: number;
  totalOperatingCostVnd: number;
  netProfitVnd: number;
  profitMarginPct: number;
  unfulfilledDemandUnits: number;
}

export interface QuarterSummary {
  quarter: QuarterId;
  totalWorkers: number;
  totalQuarterlyOutput: number;
  hourlyLineThroughput: number;
  weightedProductivityPct: number;
  overallDefectRatePct: number;
  totalDefectUnits: number;
  totalWip: number;
  unitLaborCost: number;
  bottleneckStageId: string | null;
  stages: StageMetrics[];
  financials: QuarterFinancials;
}

export interface QuarterlyTeamTrendRow {
  teamName: string;
  stageId: string;
  stageName: string;
  firstQuarterLabel: string;
  latestQuarterLabel: string;
  firstProductivity: number | null;
  latestProductivity: number | null;
  firstDefectRate: number | null;
  latestDefectRate: number | null;
  q1Productivity: number | null;
  q2Productivity: number | null;
  q3Productivity: number | null;
  q4Productivity: number | null;
  q1DefectRate: number | null;
  q2DefectRate: number | null;
  q3DefectRate: number | null;
  q4DefectRate: number | null;
  defectDeltaFirstToLatest: number;
  isDefectRisingQoQ: boolean;
  latestOutlierWorkers: string[];
}

export interface SevenYearQuarterPoint {
  quarter: QuarterId;
  marketContext: string;
  hourlyThroughput: number;
  defectRatePct: number;
  marketDemandUnits: number;
  sellableUnits: number;
  realizedRevenueVnd: number;
  netProfitVnd: number;
  projectedRevenueVnd?: number | null;
  projectedProfitVnd?: number | null;
}

export interface AggregatedFactoryDataset {
  sourceLabel: string;
  totalRowsProcessed: number;
  quartersAvailable: QuarterId[];
  byQuarter: Partial<Record<QuarterId, QuarterSummary>>;
  allQuartersSummary: QuarterSummary;
  quarterlyTeamTrends: QuarterlyTeamTrendRow[];
  historicalSeries: SevenYearQuarterPoint[];
}

export interface IngestionProgress {
  status: 'idle' | 'processing' | 'done' | 'error';
  filesProcessed: number;
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  bytesRead: number;
  totalBytes: number;
  rowsAggregated: number;
  speedMbPerSec: number;
  errorMessage?: string;
}

export interface MarketSimulationInputs {
  demandDeltaPct: number; // -30 to +40
  priceDeltaPct: number; // -15 to +25
  kaizenBudgetVnd: number; // e.g., 0 to 150,000,000 VND
}

export interface WorkerRetentionSummary {
  initialWorkers: number;
  finalWorkers: number;
  retainedAndUpskilledWorkers: number;
  reallocatedCrossTeamWorkers: number;
  trimmedOutlierWorkers: number;
  trimmedWorkerIds: string[];
  humanCenteredIndexPct: number;
}

export interface ProfitComparisonResult {
  regime: 'demand_surge' | 'balanced' | 'market_downturn';
  regimeLabelVi: string;
  strategyHeadlineVi: string;
  strategyDetailsVi: string[];
  beforeSummary: QuarterSummary;
  afterSummary: QuarterSummary;
  beforeFinancials: QuarterFinancials;
  afterFinancials: QuarterFinancials;
  revenueDeltaVnd: number;
  revenueDeltaPct: number;
  profitDeltaVnd: number;
  profitDeltaPct: number;
  defectLossSavedVnd: number;
  revenueUnlockedProfitVnd: number;
  wasteReductionProfitVnd: number;
  throughputDeltaPct: number;
  defectRateBeforePct: number;
  defectRateAfterPct: number;
  retention: WorkerRetentionSummary;
  deployedInvestmentsVi: string[];
  trendWithForecast: SevenYearQuarterPoint[];
}

export interface OptimizedStageUpdate {
  id: string;
  SoLaoDong: number;
  TG_SMV: number;
  HieuSuat_TB: number;
  TyLeLoi: number;
  WIP: number;
}

export interface KaizenAiRecommendation {
  bottleneck_stage_id: string;
  weakest_team_name: string;
  flagged_worker_ids: string[];
  bottleneck_and_defect_diagnosis_vi: string;
  cross_team_reallocation_vi: string;
  outlier_layoff_evaluation_vi: string;
  technical_and_quality_kaizen_vi: string;
  profit_maximization_strategy_vi: string;
  revenue_vs_waste_split_vi: string;
  human_livelihood_protection_vi: string;
  recommended_layoff_count: number;
  projected_defect_reduction_pct: number;
  estimated_roi_months: number;
  optimized_stages: OptimizedStageUpdate[];
}

export interface VerificationMetrics {
  beforeThroughput: number;
  afterThroughput: number;
  throughputIncreasePct: number;
  beforeDefectRatePct: number;
  afterDefectRatePct: number;
  defectRateReductionPct: number;
  beforeUnitCost: number;
  afterUnitCost: number;
  unitCostReductionPct: number;
  beforeTotalWip: number;
  afterTotalWip: number;
  wipReductionPct: number;
  beforeTotalWorkers: number;
  afterTotalWorkers: number;
  workerDelta: number;
  estimatedRoiMonths: number;
  comparisons: {
    id: string;
    TenCongDoan: string;
    beforeCapacity: number;
    afterCapacity: number;
    beforeDefectRate: number;
    afterDefectRate: number;
    beforeWorkers: number;
    afterWorkers: number;
    beforeEfficiency: number;
    afterEfficiency: number;
    beforeWip: number;
    afterWip: number;
  }[];
}

export interface GeminiHealthStatus {
  state: 'checking' | 'connected' | 'disconnected';
  ok: boolean;
  model: string;
  latencyMs: number;
  message: string;
}

