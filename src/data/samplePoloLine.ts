import type { QuarterId } from '../types/kaizen';

export interface RawProductionRow {
  Nam: number;
  Quy: QuarterId;
  BoiCanh_ThiTruong: string;
  DonGia_Ban: number;
  ChiPhi_NVL_SP: number;
  NhuCau_DonHang_To: number;
  id: string;
  TenCongDoan: string;
  ToSanXuat: string;
  MaCongNhan: string;
  SoLaoDong: number;
  TG_SMV: number;
  TG_ThucTe_Giay: number;
  WIP: number;
  Luong_Thang: number;
  HieuSuat_TB: number;
  SanLuong_Ca: number;
  DoanhThu_DongGop: number;
  SoHangLoi: number;
  TyLeLoi: number;
  GiaiPhap_KyThuat: string;
  ChiPhi_ThietBi: number;
}

interface MacroQuarterRegime {
  year: number;
  qNum: 1 | 2 | 3 | 4;
  quarterId: string;
  context: string;
  unitPrice: number;
  materialCost: number;
  factoryOrderDemand: number;
  effModifier: number;
  defectDrift: number;
}

const MACRO_TIMELINE: MacroQuarterRegime[] = [
  // 2020: Pandemic disruption & initial adjustment
  { year: 2020, qNum: 1, quarterId: '2020-Q1', context: 'Đầu dịch COVID-19 · Đơn hàng giảm nhẹ', unitPrice: 108000, materialCost: 46000, factoryOrderDemand: 58000, effModifier: -2, defectDrift: -0.2 },
  { year: 2020, qNum: 2, quarterId: '2020-Q2', context: 'Giãn cách · Đứt gãy đơn hàng xuất khẩu', unitPrice: 102000, materialCost: 47000, factoryOrderDemand: 46000, effModifier: -5, defectDrift: 0.1 },
  { year: 2020, qNum: 3, quarterId: '2020-Q3', context: 'Phục hồi từng phần · May hàng thiết yếu', unitPrice: 105000, materialCost: 46500, factoryOrderDemand: 54000, effModifier: -3, defectDrift: 0.0 },
  { year: 2020, qNum: 4, quarterId: '2020-Q4', context: 'Đơn hàng bù cuối năm', unitPrice: 110000, materialCost: 47000, factoryOrderDemand: 63000, effModifier: -1, defectDrift: -0.1 },

  // 2021: Rebound & Q3 lockdown squeeze
  { year: 2021, qNum: 1, quarterId: '2021-Q1', context: 'Đơn hàng Mỹ/EU tăng trở lại', unitPrice: 112000, materialCost: 47500, factoryOrderDemand: 65000, effModifier: 0, defectDrift: -0.1 },
  { year: 2021, qNum: 2, quarterId: '2021-Q2', context: 'Nhu cầu xuất khẩu tăng mạnh', unitPrice: 115000, materialCost: 48000, factoryOrderDemand: 70000, effModifier: 1, defectDrift: 0.0 },
  { year: 2021, qNum: 3, quarterId: '2021-Q3', context: '3 tại chỗ · Chi phí cao & thiếu hụt nhẹ', unitPrice: 114000, materialCost: 50000, factoryOrderDemand: 52000, effModifier: -4, defectDrift: 0.3 },
  { year: 2021, qNum: 4, quarterId: '2021-Q4', context: 'Mở cửa trở lại · Đơn dồn cao điểm', unitPrice: 118000, materialCost: 49000, factoryOrderDemand: 73000, effModifier: 1, defectDrift: 0.1 },

  // 2022: Peak export boom H1, slowdown H2
  { year: 2022, qNum: 1, quarterId: '2022-Q1', context: 'Bùng nổ đơn hàng hậu dịch', unitPrice: 122000, materialCost: 49500, factoryOrderDemand: 76000, effModifier: 2, defectDrift: 0.0 },
  { year: 2022, qNum: 2, quarterId: '2022-Q2', context: 'Cao điểm xuất khẩu Q2/2022', unitPrice: 125000, materialCost: 50500, factoryOrderDemand: 79000, effModifier: 2, defectDrift: 0.1 },
  { year: 2022, qNum: 3, quarterId: '2022-Q3', context: 'Lạm phát toàn cầu · Chững đơn', unitPrice: 120000, materialCost: 51000, factoryOrderDemand: 62000, effModifier: 0, defectDrift: 0.2 },
  { year: 2022, qNum: 4, quarterId: '2022-Q4', context: 'Tồn kho đối tác tăng · Giảm đơn cuối năm', unitPrice: 116000, materialCost: 50500, factoryOrderDemand: 56000, effModifier: -1, defectDrift: 0.2 },

  // 2023: Textile downturn / recessionary demand dip
  { year: 2023, qNum: 1, quarterId: '2023-Q1', context: 'Suy giảm dệt may · Đơn hàng nhỏ lẻ', unitPrice: 110000, materialCost: 49000, factoryOrderDemand: 49000, effModifier: -2, defectDrift: 0.2 },
  { year: 2023, qNum: 2, quarterId: '2023-Q2', context: 'Đáy suy giảm đơn hàng · Cạnh tranh giá', unitPrice: 106000, materialCost: 48500, factoryOrderDemand: 44000, effModifier: -3, defectDrift: 0.3 },
  { year: 2023, qNum: 3, quarterId: '2023-Q3', context: 'Thắt chặt biên lợi nhuận · Đơn FOB ngắn', unitPrice: 108000, materialCost: 48500, factoryOrderDemand: 48000, effModifier: -2, defectDrift: 0.3 },
  { year: 2023, qNum: 4, quarterId: '2023-Q4', context: 'Tín hiệu hồi phục đơn hàng mùa xuân', unitPrice: 112000, materialCost: 48500, factoryOrderDemand: 57000, effModifier: 0, defectDrift: 0.2 },

  // 2024: Gradual recovery
  { year: 2024, qNum: 1, quarterId: '2024-Q1', context: 'Phục hồi ổn định · Đơn hàng Polo dài hạn', unitPrice: 115000, materialCost: 48500, factoryOrderDemand: 63000, effModifier: 0, defectDrift: 0.1 },
  { year: 2024, qNum: 2, quarterId: '2024-Q2', context: 'Tăng tốc giao hàng mùa hè', unitPrice: 117000, materialCost: 49000, factoryOrderDemand: 67000, effModifier: 1, defectDrift: 0.2 },
  { year: 2024, qNum: 3, quarterId: '2024-Q3', context: 'Mở rộng khách hàng EU · Áp lực tiến độ', unitPrice: 118000, materialCost: 49000, factoryOrderDemand: 70000, effModifier: 1, defectDrift: 0.3 },
  { year: 2024, qNum: 4, quarterId: '2024-Q4', context: 'Cao điểm đơn hàng cuối năm 2024', unitPrice: 121000, materialCost: 49500, factoryOrderDemand: 73000, effModifier: 1, defectDrift: 0.4 },

  // 2025: Strong demand growth exposing bottleneck in CD4 & quality drift in Tổ 4B/6B
  { year: 2025, qNum: 1, quarterId: '2025-Q1', context: 'Đơn hàng tăng +14% · Nghẽn nhẹ khâu nút', unitPrice: 122000, materialCost: 49500, factoryOrderDemand: 72000, effModifier: 1, defectDrift: 0.4 },
  { year: 2025, qNum: 2, quarterId: '2025-Q2', context: 'Đơn hàng vượt công suất chuyền hiện tại', unitPrice: 124000, materialCost: 50000, factoryOrderDemand: 75000, effModifier: 1, defectDrift: 0.5 },
  { year: 2025, qNum: 3, quarterId: '2025-Q3', context: 'Nhu cầu cao · Rủi ro trễ hạn giao hàng', unitPrice: 125000, materialCost: 50000, factoryOrderDemand: 76000, effModifier: 0, defectDrift: 0.6 },
  { year: 2025, qNum: 4, quarterId: '2025-Q4', context: 'Cao điểm 2025 · Áp lực nghẽn CD4', unitPrice: 126000, materialCost: 50500, factoryOrderDemand: 78000, effModifier: 0, defectDrift: 0.7 },

  // 2026: Current year (4 quarters) — high demand unmet due to CD4 bottleneck & rising defect drift
  { year: 2026, qNum: 1, quarterId: '2026-Q1', context: 'Mở đầu 2026 · Đơn hàng cao, nghẽn CD4', unitPrice: 127000, materialCost: 50500, factoryOrderDemand: 74000, effModifier: 0, defectDrift: 0.8 },
  { year: 2026, qNum: 2, quarterId: '2026-Q2', context: 'Nhu cầu tăng trưởng · Lỗi Tổ 4B tăng', unitPrice: 128000, materialCost: 50500, factoryOrderDemand: 76000, effModifier: 0, defectDrift: 1.0 },
  { year: 2026, qNum: 3, quarterId: '2026-Q3', context: 'Đơn hàng xuất khẩu lớn · Thất thoát doanh thu', unitPrice: 130000, materialCost: 51000, factoryOrderDemand: 78000, effModifier: 0, defectDrift: 1.2 },
  { year: 2026, qNum: 4, quarterId: '2026-Q4', context: 'Cao điểm 2026 · Cần Kaizen thông chuyền', unitPrice: 132000, materialCost: 51000, factoryOrderDemand: 79000, effModifier: 0, defectDrift: 1.4 },
];

interface TeamBlueprint {
  stageId: string;
  stageName: string;
  teamName: string;
  workers: number;
  smv: number;
  baseEff: number;
  baseDefect: number;
  baseWip: number;
  wage: number;
  tech: string;
  equipCost: number;
  hasQualityDrift?: boolean;
  outlierWorkers?: {
    workerId: string;
    baseEff: number;
    baseDefect: number;
  }[];
}

// 76 total SME workers across 6 stages and 12 teams
const SME_BLUEPRINTS: TeamBlueprint[] = [
  {
    stageId: 'CD1',
    stageName: 'Cắt & May chắp vai',
    teamName: 'Tổ 1A',
    workers: 7,
    smv: 0.8,
    baseEff: 62,
    baseDefect: 1.6,
    baseWip: 14,
    wage: 8000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD1',
    stageName: 'Cắt & May chắp vai',
    teamName: 'Tổ 1B',
    workers: 6,
    smv: 0.8,
    baseEff: 59,
    baseDefect: 1.9,
    baseWip: 12,
    wage: 8000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD2',
    stageName: 'Tra cổ & Diễu cổ',
    teamName: 'Tổ 2A',
    workers: 7,
    smv: 1.4,
    baseEff: 58,
    baseDefect: 2.2,
    baseWip: 22,
    wage: 9000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD2',
    stageName: 'Tra cổ & Diễu cổ',
    teamName: 'Tổ 2B',
    workers: 6,
    smv: 1.4,
    baseEff: 56,
    baseDefect: 2.4,
    baseWip: 18,
    wage: 9000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD3',
    stageName: 'Tra tay & May sườn',
    teamName: 'Tổ 3A',
    workers: 8,
    smv: 1.2,
    baseEff: 61,
    baseDefect: 1.8,
    baseWip: 17,
    wage: 8000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD3',
    stageName: 'Tra tay & May sườn',
    teamName: 'Tổ 3B',
    workers: 7,
    smv: 1.2,
    baseEff: 59,
    baseDefect: 2.0,
    baseWip: 15,
    wage: 8000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD4',
    stageName: 'Thùa khuyết & Đơm nút',
    teamName: 'Tổ 4A',
    workers: 5,
    smv: 2.5,
    baseEff: 55,
    baseDefect: 2.2,
    baseWip: 46,
    wage: 7500000,
    tech: 'Gá cữ định hình / Máy đơm nút tự động',
    equipCost: 22500000,
  },
  {
    stageId: 'CD4',
    stageName: 'Thùa khuyết & Đơm nút',
    teamName: 'Tổ 4B',
    workers: 5,
    smv: 2.5,
    baseEff: 42,
    baseDefect: 3.9,
    baseWip: 92,
    wage: 7500000,
    tech: 'Gá cữ may chống lệch + Inline QC',
    equipCost: 22500000,
    hasQualityDrift: true,
    outlierWorkers: [
      { workerId: 'CN-047', baseEff: 32, baseDefect: 5.2 },
      { workerId: 'CN-049', baseEff: 34, baseDefect: 4.8 },
    ],
  },
  {
    stageId: 'CD5',
    stageName: 'May gấu (Lai) áo',
    teamName: 'Tổ 5A',
    workers: 7,
    smv: 1.0,
    baseEff: 59,
    baseDefect: 1.7,
    baseWip: 10,
    wage: 7500000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD5',
    stageName: 'May gấu (Lai) áo',
    teamName: 'Tổ 5B',
    workers: 6,
    smv: 1.0,
    baseEff: 57,
    baseDefect: 1.9,
    baseWip: 9,
    wage: 7500000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD6',
    stageName: 'KCS & Đóng gói',
    teamName: 'Tổ 6A',
    workers: 6,
    smv: 0.7,
    baseEff: 61,
    baseDefect: 1.3,
    baseWip: 6,
    wage: 7000000,
    tech: 'Không',
    equipCost: 0,
  },
  {
    stageId: 'CD6',
    stageName: 'KCS & Đóng gói',
    teamName: 'Tổ 6B',
    workers: 6,
    smv: 0.7,
    baseEff: 52,
    baseDefect: 2.9,
    baseWip: 11,
    wage: 7000000,
    tech: 'Không',
    equipCost: 0,
    hasQualityDrift: true,
    outlierWorkers: [
      { workerId: 'CN-074', baseEff: 33, baseDefect: 4.7 },
    ],
  },
];

export function generateSampleSmeRows(): RawProductionRow[] {
  const rows: RawProductionRow[] = [];
  let workerSeq = 1;

  // Assign stable worker IDs across all 28 quarters (76 workers)
  const teamWorkerIds = new Map<string, string[]>();
  for (const bp of SME_BLUEPRINTS) {
    const ids: string[] = [];
    const presetOutliers = bp.outlierWorkers?.map((o) => o.workerId) ?? [];
    for (const ow of presetOutliers) {
      ids.push(ow);
    }
    while (ids.length < bp.workers) {
      const code = `CN-${String(workerSeq).padStart(3, '0')}`;
      workerSeq += 1;
      if (!ids.includes(code)) {
        ids.push(code);
      }
    }
    teamWorkerIds.set(bp.teamName, ids);
  }

  MACRO_TIMELINE.forEach((macro, qIdx) => {
    const progressionRatio = qIdx / Math.max(1, MACRO_TIMELINE.length - 1);
    const wageInflationFactor = 1 + (macro.year - 2020) * 0.035;

    for (const bp of SME_BLUEPRINTS) {
      const ids = teamWorkerIds.get(bp.teamName) ?? [];
      const outlierMap = new Map(
        (bp.outlierWorkers ?? []).map((o) => [o.workerId, o])
      );

      // Team quarterly order demand proportional to factory order demand / 2 teams in stage
      const teamDemand = Math.round(macro.factoryOrderDemand / 2);

      for (const workerId of ids) {
        const outlier = outlierMap.get(workerId);

        let eff = outlier
          ? outlier.baseEff + macro.effModifier * 0.5 - (bp.hasQualityDrift ? progressionRatio * 6 : 0)
          : bp.baseEff + macro.effModifier - (bp.hasQualityDrift ? progressionRatio * 9 : 0);

        let defectRate = outlier
          ? outlier.baseDefect + macro.defectDrift * 1.4 + (bp.hasQualityDrift ? progressionRatio * 2.1 : 0)
          : bp.baseDefect + (bp.hasQualityDrift ? macro.defectDrift * 1.5 + progressionRatio * 1.9 : Math.max(-0.2, macro.defectDrift * 0.15));

        eff = Math.round(Math.min(68, Math.max(24, eff)));
        defectRate = Number(Math.min(10, Math.max(1.0, defectRate)).toFixed(2));

        const actualSeconds = Math.round((bp.smv * 60) / (eff / 100));
        const shiftOutput = Math.max(
          1,
          Math.round(((60 / bp.smv) * (eff / 100)) * 8)
        );
        const defectUnits = Math.max(
          0,
          Math.round((shiftOutput * defectRate) / 100)
        );
        const goodShiftUnits = Math.max(0, shiftOutput - defectUnits);
        const monthlyWage = Math.round((bp.wage * wageInflationFactor) / 50000) * 50000;

        rows.push({
          Nam: macro.year,
          Quy: macro.quarterId,
          BoiCanh_ThiTruong: macro.context,
          DonGia_Ban: macro.unitPrice,
          ChiPhi_NVL_SP: macro.materialCost,
          NhuCau_DonHang_To: teamDemand,
          id: bp.stageId,
          TenCongDoan: bp.stageName,
          ToSanXuat: bp.teamName,
          MaCongNhan: workerId,
          SoLaoDong: 1,
          TG_SMV: bp.smv,
          TG_ThucTe_Giay: actualSeconds,
          WIP: Math.max(1, Math.round((bp.baseWip * (1 + (bp.hasQualityDrift ? progressionRatio * 0.5 : 0))) / bp.workers)),
          Luong_Thang: monthlyWage,
          HieuSuat_TB: eff,
          SanLuong_Ca: shiftOutput,
          DoanhThu_DongGop: goodShiftUnits * macro.unitPrice,
          SoHangLoi: defectUnits,
          TyLeLoi: defectRate,
          GiaiPhap_KyThuat: bp.tech,
          ChiPhi_ThietBi: Math.round(bp.equipCost / bp.workers),
        });
      }
    }
  });

  return rows;
}
