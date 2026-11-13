import type {
  AggregatedFactoryDataset,
  OutlierWorkerStat,
  QuarterFinancials,
  QuarterId,
  QuarterSummary,
  QuarterlyTeamTrendRow,
  SevenYearQuarterPoint,
  StageMetrics,
  TeamMetrics,
} from '../types/kaizen';

export const WORKING_HOURS_PER_MONTH = 208;
export const WORKING_HOURS_PER_QUARTER = 624; // 3 tháng x 208 giờ
export const STAGE_DEFECT_ALERT_THRESHOLD = 3.5; // > 3.5%
export const TEAM_HIGH_DEFECT_THRESHOLD = 4.5; // > 4.5%
export const LOW_EFFICIENCY_THRESHOLD = 35; // < 35%
export const DEFAULT_UNIT_SELLING_PRICE = 120000; // VNĐ/sp
export const DEFAULT_UNIT_MATERIAL_COST = 49000; // VNĐ/sp
export const DEFAULT_REWORK_LABOR_PENALTY = 18000; // VNĐ/sp lỗi (công sửa + KCS lại)

const STAGE_ORDER_MAP: Record<string, string> = {
  'cat & may chap vai': 'CD1',
  'tra co & dieu co': 'CD2',
  'tra tay & may suon': 'CD3',
  'thua khuyet & dom nut': 'CD4',
  'may gau (lai) ao': 'CD5',
  'kcs & dong goi': 'CD6',
};

interface WorkerAccumulator {
  workerId: string;
  effWeightedSum: number;
  effWeight: number;
  defectUnits: number;
  totalUnits: number;
  defectRateSum: number;
  rowCount: number;
}

interface TeamAccumulator {
  quarter: QuarterId;
  stageId: string;
  stageName: string;
  teamName: string;
  rowCount: number;
  hasWorkerIds: boolean;
  workerStats: Map<string, WorkerAccumulator>;
  declaredWorkersMax: number;
  smvSum: number;
  effSum: number;
  wipSum: number;
  totalOutputUnits: number;
  totalDefectUnits: number;
  defectRateSum: number;
  wageSum: number;
  equipCostSum: number;
  unitPriceSum: number;
  unitPriceCount: number;
  materialCostSum: number;
  materialCostCount: number;
  teamDemandMax: number;
  marketContext: string;
  techHints: Set<string>;
}

export function normalizeHeaderName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

export function parseQuarterValue(
  rawQuy: unknown,
  rawNam?: unknown,
  rawTimestamp?: unknown
): QuarterId {
  const s = String(rawQuy ?? '').trim().toUpperCase();
  const yearMatchFromNam = String(rawNam ?? '').trim().match(/^(20\d{2}|19\d{2})$/);
  const explicitYear = yearMatchFromNam ? yearMatchFromNam[1] : '';

  // Match full Year-Quarter formats like 2020-Q1, 2024Q3, 2025/Q2
  const fullMatch = s.match(/(20\d{2}|19\d{2})\s*[-_/]?\s*Q([1-4])/);
  if (fullMatch) {
    return `${fullMatch[1]}-Q${fullMatch[2]}`;
  }

  let qPart = '';
  if (s === 'Q1' || s === 'QUY 1' || s === 'QUÝ 1' || s === '1') qPart = 'Q1';
  else if (s === 'Q2' || s === 'QUY 2' || s === 'QUÝ 2' || s === '2') qPart = 'Q2';
  else if (s === 'Q3' || s === 'QUY 3' || s === 'QUÝ 3' || s === '3') qPart = 'Q3';
  else if (s === 'Q4' || s === 'QUY 4' || s === 'QUÝ 4' || s === '4') qPart = 'Q4';
  else {
    const qMatch = s.match(/Q([1-4])/);
    if (qMatch) qPart = `Q${qMatch[1]}`;
  }

  if (qPart) {
    return explicitYear ? `${explicitYear}-${qPart}` : qPart;
  }

  // Fallback to timestamp / ISO date parsing (YYYY-MM-DD...)
  const tsSource = String(rawTimestamp ?? rawQuy ?? '').trim();
  const dateMatch = tsSource.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (dateMatch) {
    const yr = dateMatch[1];
    const month = Number(dateMatch[2]);
    const q =
      month >= 1 && month <= 3
        ? 'Q1'
        : month >= 4 && month <= 6
          ? 'Q2'
          : month >= 7 && month <= 9
            ? 'Q3'
            : 'Q4';
    return explicitYear ? `${explicitYear}-${q}` : `${yr}-${q}`;
  }

  return explicitYear ? `${explicitYear}-Q1` : 'Q1';
}

export function compareQuarterIds(a: string, b: string): number {
  const ma = a.match(/^(?:(\d{4})-)?Q([1-4])$/i);
  const mb = b.match(/^(?:(\d{4})-)?Q([1-4])$/i);
  if (ma && mb) {
    const ya = Number(ma[1] ?? 0);
    const yb = Number(mb[1] ?? 0);
    if (ya !== yb) return ya - yb;
    return Number(ma[2]) - Number(mb[2]);
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

export function parseNum(raw: unknown, fallback = 0): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : fallback;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    // Fast path for plain ASCII numbers without % or commas
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const cleaned = trimmed.replace(/%/g, '').replace(/\s+/g, '').replace(/,/g, '.');
    if (!cleaned) return fallback;
    const val = Number(cleaned);
    return Number.isFinite(val) ? val : fallback;
  }
  return fallback;
}

/**
 * Direct ASCII byte number parser (zero string allocation).
 * Handles optional leading +/-, integer & fractional digits, and ignores whitespace or trailing '%'.
 */
export function parseNumberBytes(
  buf: Uint8Array,
  start: number,
  end: number,
  fallback = 0
): number {
  let s = start;
  let e = end;
  while (s < e && buf[s] <= 32) s += 1;
  while (e > s && (buf[e - 1] <= 32 || buf[e - 1] === 37)) e -= 1; // trim whitespace & '%'
  if (s >= e) return fallback;

  let sign = 1;
  if (buf[s] === 45) {
    sign = -1;
    s += 1;
  } else if (buf[s] === 43) {
    s += 1;
  }
  if (s >= e) return fallback;

  let intPart = 0;
  let fracPart = 0;
  let fracDiv = 1;
  let inFrac = false;
  let hasDigit = false;

  for (let i = s; i < e; i += 1) {
    const c = buf[i];
    if (c === 46 || c === 44) {
      if (inFrac) break;
      inFrac = true;
    } else if (c >= 48 && c <= 57) {
      hasDigit = true;
      const digit = c - 48;
      if (inFrac) {
        fracPart = fracPart * 10 + digit;
        fracDiv *= 10;
      } else {
        intPart = intPart * 10 + digit;
      }
    } else if (c > 32) {
      // Unexpected non-numeric character
      return fallback;
    }
  }

  return hasDigit ? sign * (intPart + fracPart / fracDiv) : fallback;
}

interface InternEntry {
  bytes: Uint8Array;
  value: string;
}

/**
 * Collision-safe FNV-1a byte-slice string interner.
 * Calls TextDecoder.decode() only once per unique byte sequence across 70M+ rows.
 */
export class ByteStringInterner {
  private cache = new Map<number, InternEntry>();
  private decoder = new TextDecoder('utf-8');
  private readonly maxEntries: number;

  constructor(maxEntries = 50000) {
    this.maxEntries = maxEntries;
  }

  get size(): number {
    return this.cache.size;
  }

  decodeCached(buf: Uint8Array, start: number, end: number): string {
    let s = start;
    let e = end;
    while (s < e && (buf[s] === 32 || buf[s] === 13 || buf[s] === 9)) s += 1;
    while (e > s && (buf[e - 1] === 32 || buf[e - 1] === 13 || buf[e - 1] === 9)) e -= 1;
    if (s >= e) return '';

    const len = e - s;
    let hash = 2166136261;
    for (let i = s; i < e; i += 1) {
      hash ^= buf[i];
      hash = Math.imul(hash, 16777619);
    }
    const key = (hash ^ (len << 16)) >>> 0;

    const existing = this.cache.get(key);
    if (existing && existing.bytes.length === len) {
      let match = true;
      const eb = existing.bytes;
      for (let i = 0; i < len; i += 1) {
        if (eb[i] !== buf[s + i]) {
          match = false;
          break;
        }
      }
      if (match) return existing.value;
    }

    const decoded = this.decoder.decode(buf.subarray(s, e));
    if (!existing && this.cache.size < this.maxEntries) {
      this.cache.set(key, {
        bytes: buf.slice(s, e),
        value: decoded,
      });
    }
    return decoded;
  }
}

export function inferStageId(rawId: string, stageName: string, fallbackIndex: number): string {
  const trimmed = rawId.trim();
  if (trimmed) return trimmed;
  const norm = normalizeHeaderName(stageName).replace(/_/g, ' ');
  return STAGE_ORDER_MAP[norm] || `CD${fallbackIndex}`;
}

export function calculateEffectiveCapacity(
  workers: number,
  smv: number,
  productivityPct: number
): number {
  if (
    !Number.isFinite(workers) ||
    !Number.isFinite(smv) ||
    !Number.isFinite(productivityPct) ||
    workers <= 0 ||
    smv <= 0 ||
    productivityPct <= 0
  ) {
    return 0;
  }
  return Math.round(((workers * 60) / smv) * (productivityPct / 100));
}

export function computeQuarterFinancials(params: {
  quarter: QuarterId;
  marketContext: string;
  hourlyLineThroughput: number;
  overallDefectRatePct: number;
  stages: StageMetrics[];
  marketOrderDemand: number;
  unitSellingPrice: number;
  unitMaterialCost: number;
  reworkPenaltyPerUnit?: number;
  amortizedCapexVnd?: number;
}): QuarterFinancials {
  const {
    quarter,
    marketContext,
    hourlyLineThroughput,
    overallDefectRatePct,
    stages,
    marketOrderDemand,
    unitSellingPrice,
    unitMaterialCost,
    reworkPenaltyPerUnit = DEFAULT_REWORK_LABOR_PENALTY,
    amortizedCapexVnd,
  } = params;

  const grossOutputUnits = Math.max(0, Math.round(hourlyLineThroughput * WORKING_HOURS_PER_QUARTER));
  const defectUnits = Math.max(
    0,
    Math.round((grossOutputUnits * Math.max(0, overallDefectRatePct)) / 100)
  );
  const goodOutputUnits = Math.max(0, grossOutputUnits - defectUnits);
  const demand = Math.max(0, Math.round(marketOrderDemand));
  const sellableOutputUnits = Math.min(goodOutputUnits, demand);
  const unfulfilledDemandUnits = Math.max(0, demand - goodOutputUnits);

  const realizedRevenueVnd = Math.round(sellableOutputUnits * unitSellingPrice);
  const materialCostVnd = Math.round(grossOutputUnits * unitMaterialCost);
  const totalLaborCostVnd = Math.round(
    stages.reduce((sum, st) => sum + st.SoLaoDong * st.Luong_Thang * 3, 0)
  );
  const defectLossVnd = Math.round(
    defectUnits * (unitMaterialCost + reworkPenaltyPerUnit)
  );
  const totalEquipCost = stages.reduce((sum, st) => sum + (st.ChiPhi_ThietBi || 0), 0);
  const capexAmortized =
    amortizedCapexVnd !== undefined
      ? Math.round(amortizedCapexVnd)
      : Math.round(totalEquipCost / 4);

  const totalOperatingCostVnd =
    materialCostVnd + totalLaborCostVnd + defectLossVnd + capexAmortized;
  const netProfitVnd = realizedRevenueVnd - totalOperatingCostVnd;
  const profitMarginPct =
    realizedRevenueVnd > 0
      ? Number(((netProfitVnd / realizedRevenueVnd) * 100).toFixed(1))
      : 0;

  return {
    quarter,
    marketContext: marketContext || 'Thị trường ổn định',
    marketOrderDemand: demand,
    grossOutputUnits,
    goodOutputUnits,
    sellableOutputUnits,
    defectUnits,
    unitSellingPrice: Math.round(unitSellingPrice),
    unitMaterialCost: Math.round(unitMaterialCost),
    reworkPenaltyPerUnit: Math.round(reworkPenaltyPerUnit),
    realizedRevenueVnd,
    materialCostVnd,
    totalLaborCostVnd,
    defectLossVnd,
    amortizedCapexVnd: capexAmortized,
    totalOperatingCostVnd,
    netProfitVnd,
    profitMarginPct,
    unfulfilledDemandUnits,
  };
}

export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export interface ColumnIndexMap {
  nam: number;
  quy: number;
  timestamp: number;
  boiCanhThiTruong: number;
  donGiaBan: number;
  chiPhiNvlSp: number;
  nhuCauDonHangTo: number;
  id: number;
  tenCongDoan: number;
  toSanXuat: number;
  maCongNhan: number;
  soLaoDong: number;
  tgSmv: number;
  tgThucTeGiay: number;
  hieuSuatTb: number;
  wip: number;
  sanLuongCa: number;
  doanhThuDongGop: number;
  soHangLoi: number;
  tyLeLoi: number;
  luongThang: number;
  giaiPhapKyThuat: number;
  chiPhiThietBi: number;
  maxColIndex: number;
}

export function buildColumnIndexMap(headers: string[]): ColumnIndexMap {
  const map: ColumnIndexMap = {
    nam: -1,
    quy: -1,
    timestamp: -1,
    boiCanhThiTruong: -1,
    donGiaBan: -1,
    chiPhiNvlSp: -1,
    nhuCauDonHangTo: -1,
    id: -1,
    tenCongDoan: -1,
    toSanXuat: -1,
    maCongNhan: -1,
    soLaoDong: -1,
    tgSmv: -1,
    tgThucTeGiay: -1,
    hieuSuatTb: -1,
    wip: -1,
    sanLuongCa: -1,
    doanhThuDongGop: -1,
    soHangLoi: -1,
    tyLeLoi: -1,
    luongThang: -1,
    giaiPhapKyThuat: -1,
    chiPhiThietBi: -1,
    maxColIndex: headers.length - 1,
  };

  headers.forEach((header, idx) => {
    const norm = normalizeHeaderName(header);
    const compact = norm.replace(/_/g, '');

    if (compact === 'nam' || compact === 'year') map.nam = idx;
    else if (compact === 'quy' || compact === 'quarter') map.quy = idx;
    else if (compact === 'timestamp' || compact === 'ngay' || compact === 'date' || compact === 'thoigian') map.timestamp = idx;
    else if (compact === 'boicanhthitruong' || compact === 'marketcontext' || compact === 'boicanh') map.boiCanhThiTruong = idx;
    else if (compact === 'dongiaban' || compact === 'unitprice' || compact === 'giaban') map.donGiaBan = idx;
    else if (compact === 'chiphinvlsp' || compact === 'chiphinvl' || compact === 'materialcost') map.chiPhiNvlSp = idx;
    else if (compact === 'nhucaudonhangto' || compact === 'nhucaudonhang' || compact === 'demand') map.nhuCauDonHangTo = idx;
    else if (compact === 'id' || compact === 'macongdoan' || compact === 'stageid') map.id = idx;
    else if (compact === 'tencongdoan' || compact === 'congdoan' || compact === 'khau' || compact === 'stage') map.tenCongDoan = idx;
    else if (compact === 'tosanxuat' || compact === 'to' || compact === 'team') map.toSanXuat = idx;
    else if (compact === 'macongnhan' || compact === 'workerid' || compact === 'manv') map.maCongNhan = idx;
    else if (compact === 'solaodong' || compact === 'laodong' || compact === 'workers') map.soLaoDong = idx;
    else if (compact === 'tgsmv' || compact === 'smv') map.tgSmv = idx;
    else if (compact === 'tgthuctegiay' || compact === 'actualseconds' || compact === 'cycletimesec') map.tgThucTeGiay = idx;
    else if (compact === 'hieusuattb' || compact === 'hieusuat' || compact === 'efficiency' || compact === 'nangsuat') map.hieuSuatTb = idx;
    else if (compact === 'wip') map.wip = idx;
    else if (compact === 'sanluongca' || compact === 'sanluong' || compact === 'output') map.sanLuongCa = idx;
    else if (compact === 'doanhthudonggop' || compact === 'doanhthu' || compact === 'revenue') map.doanhThuDongGop = idx;
    else if (compact === 'sohangloi' || compact === 'hangloi' || compact === 'defectcount' || compact === 'defects') map.soHangLoi = idx;
    else if (compact === 'tyleloi' || compact === 'defectrate') map.tyLeLoi = idx;
    else if (compact === 'luongthang' || compact === 'luong') map.luongThang = idx;
    else if (compact === 'giaiphapkythuat' || compact === 'giaiphap') map.giaiPhapKyThuat = idx;
    else if (compact === 'chiphithietbi' || compact === 'chiphi') map.chiPhiThietBi = idx;
  });

  return map;
}

export class StreamingKaizenAggregator {
  private teamBuckets = new Map<string, TeamAccumulator>();
  // 3-level nested lookup (quarter -> stageId -> teamName) avoids per-row template strings
  private bucketTree = new Map<string, Map<string, Map<string, TeamAccumulator>>>();
  private quarterCache = new Map<string, QuarterId>();
  private stageOrder = new Map<string, number>();
  private stageIdCache = new Map<string, string>();
  private lastBucket: TeamAccumulator | null = null;
  private lastBucketQuarter = '';
  private lastBucketStageId = '';
  private lastBucketTeamName = '';
  private quarterByNamMap = new Map<number, Map<string, QuarterId>>();
  private nextStageSeq = 1;
  private totalRows = 0;

  // Reusable flat field buffer for text-slice fallback
  private reusableFields: string[] = new Array(32).fill('');
  private binaryFallbackDecoder = new TextDecoder('utf-8');

  get rowCount(): number {
    return this.totalRows;
  }

  private getOrCreateBucket(
    quarter: QuarterId,
    stageId: string,
    stageName: string,
    teamName: string
  ): TeamAccumulator {
    const lb = this.lastBucket;
    if (
      lb !== null &&
      this.lastBucketQuarter === quarter &&
      this.lastBucketStageId === stageId &&
      this.lastBucketTeamName === teamName
    ) {
      return lb;
    }

    let stageMap = this.bucketTree.get(quarter);
    if (!stageMap) {
      stageMap = new Map();
      this.bucketTree.set(quarter, stageMap);
    }
    let teamMap = stageMap.get(stageId);
    if (!teamMap) {
      teamMap = new Map();
      stageMap.set(stageId, teamMap);
    }
    let bucket = teamMap.get(teamName);
    if (!bucket) {
      bucket = {
        quarter,
        stageId,
        stageName,
        teamName,
        rowCount: 0,
        hasWorkerIds: false,
        workerStats: new Map<string, WorkerAccumulator>(),
        declaredWorkersMax: 0,
        smvSum: 0,
        effSum: 0,
        wipSum: 0,
        totalOutputUnits: 0,
        totalDefectUnits: 0,
        defectRateSum: 0,
        wageSum: 0,
        equipCostSum: 0,
        unitPriceSum: 0,
        unitPriceCount: 0,
        materialCostSum: 0,
        materialCostCount: 0,
        teamDemandMax: 0,
        marketContext: '',
        techHints: new Set<string>(),
      };
      teamMap.set(teamName, bucket);
      this.teamBuckets.set(`${quarter}::${stageId}::${teamName}`, bucket);
    }

    this.lastBucket = bucket;
    this.lastBucketQuarter = quarter;
    this.lastBucketStageId = stageId;
    this.lastBucketTeamName = teamName;
    return bucket;
  }

  private resolveStageId(rawStageId: string, stageName: string): string {
    // Zero-allocation fast path when standard CDx ID is already supplied
    if (
      rawStageId.length >= 3 &&
      rawStageId.length <= 4 &&
      rawStageId.charCodeAt(0) === 67 &&
      rawStageId.charCodeAt(1) === 68
    ) {
      return rawStageId;
    }

    const stageMap = this.stageIdCache;
    const lookupKey = rawStageId ? `${rawStageId}|${stageName}` : stageName;
    let stageId = stageMap.get(lookupKey);
    if (!stageId) {
      const stageKeyNorm = normalizeHeaderName(stageName);
      if (!this.stageOrder.has(stageKeyNorm)) {
        this.stageOrder.set(stageKeyNorm, this.nextStageSeq);
        this.nextStageSeq += 1;
      }
      stageId = inferStageId(
        rawStageId,
        stageName,
        this.stageOrder.get(stageKeyNorm) ?? 1
      );
      stageMap.set(lookupKey, stageId);
    }
    return stageId;
  }

  private resolveQuarterFastBinary(
    rawQuy: string,
    namNum: number,
    rawTs: string
  ): QuarterId {
    // Zero-allocation fast path for 'YYYY-Qx' (e.g., '2025-Q3')
    if (
      rawQuy.length === 7 &&
      rawQuy.charCodeAt(4) === 45 &&
      rawQuy.charCodeAt(5) === 81 &&
      rawQuy.charCodeAt(6) >= 49 &&
      rawQuy.charCodeAt(6) <= 52
    ) {
      return rawQuy;
    }
    if (rawTs.length === 0) {
      let byQuy = this.quarterByNamMap.get(namNum);
      if (!byQuy) {
        byQuy = new Map();
        this.quarterByNamMap.set(namNum, byQuy);
      }
      let q = byQuy.get(rawQuy);
      if (!q) {
        q = parseQuarterValue(rawQuy, namNum > 0 ? namNum : '', '');
        if (byQuy.size < 256) byQuy.set(rawQuy, q);
      }
      return q;
    }
    return this.resolveQuarterCached(rawQuy, namNum > 0 ? namNum : '', rawTs);
  }

  private resolveQuarterCached(
    rawQuy: string,
    rawNam: string | number,
    rawTs: string
  ): QuarterId {
    const cacheKey = `${rawNam}|${rawQuy}|${rawTs}`;
    let q = this.quarterCache.get(cacheKey);
    if (!q) {
      q = parseQuarterValue(rawQuy, rawNam, rawTs);
      if (this.quarterCache.size < 10000) {
        this.quarterCache.set(cacheKey, q);
      }
    }
    return q;
  }

  private recordBucketRowDirect(
    quarter: QuarterId,
    stageId: string,
    stageName: string,
    teamName: string,
    workerId: string,
    soLaoDong: number,
    smv: number,
    eff: number,
    wip: number,
    shiftOut: number,
    defectUnits: number,
    defectRate: number,
    wage: number,
    equipCost: number,
    tech: string,
    unitPrice: number,
    materialCost: number,
    teamDemand: number,
    marketContext: string
  ): void {
    const bucket = this.getOrCreateBucket(quarter, stageId, stageName, teamName);

    bucket.rowCount += 1;
    bucket.smvSum += smv;
    bucket.effSum += eff;
    bucket.wipSum += wip;
    bucket.totalOutputUnits += shiftOut;
    bucket.totalDefectUnits += defectUnits;
    bucket.defectRateSum += defectRate;
    bucket.wageSum += wage;
    bucket.equipCostSum += equipCost;
    if (unitPrice > 0) {
      bucket.unitPriceSum += unitPrice;
      bucket.unitPriceCount += 1;
    }
    if (materialCost > 0) {
      bucket.materialCostSum += materialCost;
      bucket.materialCostCount += 1;
    }
    if (teamDemand > bucket.teamDemandMax) {
      bucket.teamDemandMax = teamDemand;
    }
    if (marketContext && !bucket.marketContext) {
      bucket.marketContext = marketContext;
    }
    if (tech && tech !== 'Không' && tech !== 'không') {
      bucket.techHints.add(tech);
    }

    if (workerId) {
      bucket.hasWorkerIds = true;
      let ws = bucket.workerStats.get(workerId);
      if (!ws) {
        ws = {
          workerId,
          effWeightedSum: 0,
          effWeight: 0,
          defectUnits: 0,
          totalUnits: 0,
          defectRateSum: 0,
          rowCount: 0,
        };
        bucket.workerStats.set(workerId, ws);
      }
      ws.effWeightedSum += eff;
      ws.effWeight += 1;
      ws.defectUnits += defectUnits;
      ws.totalUnits += shiftOut;
      ws.defectRateSum += defectRate;
      ws.rowCount += 1;
    } else if (soLaoDong > bucket.declaredWorkersMax) {
      bucket.declaredWorkersMax = soLaoDong;
    }

    this.totalRows += 1;
  }

  /**
   * Zero-allocation binary CSV line ingestion using raw byte boundaries in Int32Array,
   * direct ASCII numeric parsing, and FNV-1a interned string caching.
   */
  ingestBinaryCsvLine(
    buf: Uint8Array,
    colStarts: Int32Array,
    colEnds: Int32Array,
    colCount: number,
    cols: ColumnIndexMap,
    interner: ByteStringInterner,
    hasQuotes = false
  ): void {
    if (colCount <= 0) return;
    if (hasQuotes) {
      const lineStr = this.binaryFallbackDecoder.decode(
        buf.subarray(colStarts[0], colEnds[colCount - 1])
      );
      this.ingestRowValues(splitCsvLine(lineStr), cols);
      return;
    }

    const rawStageName =
      cols.tenCongDoan >= 0 && cols.tenCongDoan < colCount
        ? interner.decodeCached(buf, colStarts[cols.tenCongDoan], colEnds[cols.tenCongDoan])
        : '';
    const rawStageId =
      cols.id >= 0 && cols.id < colCount
        ? interner.decodeCached(buf, colStarts[cols.id], colEnds[cols.id])
        : '';
    if (!rawStageName && !rawStageId) return;

    const stageName = rawStageName || rawStageId;
    const stageId = this.resolveStageId(rawStageId, stageName);

    const rawQuy =
      cols.quy >= 0 && cols.quy < colCount
        ? interner.decodeCached(buf, colStarts[cols.quy], colEnds[cols.quy])
        : '';
    const namNum =
      cols.nam >= 0 && cols.nam < colCount
        ? Math.round(parseNumberBytes(buf, colStarts[cols.nam], colEnds[cols.nam], 0))
        : 0;
    const rawTs =
      cols.timestamp >= 0 && cols.timestamp < colCount
        ? interner.decodeCached(buf, colStarts[cols.timestamp], colEnds[cols.timestamp])
        : '';
    const quarter = this.resolveQuarterFastBinary(rawQuy, namNum, rawTs);

    const rawTeam =
      cols.toSanXuat >= 0 && cols.toSanXuat < colCount
        ? interner.decodeCached(buf, colStarts[cols.toSanXuat], colEnds[cols.toSanXuat])
        : '';
    const teamName = rawTeam || `Tổ ${stageId}`;

    const workerId =
      cols.maCongNhan >= 0 && cols.maCongNhan < colCount
        ? interner.decodeCached(buf, colStarts[cols.maCongNhan], colEnds[cols.maCongNhan])
        : '';

    const soLaoDong =
      cols.soLaoDong >= 0 && cols.soLaoDong < colCount
        ? Math.max(1, Math.round(parseNumberBytes(buf, colStarts[cols.soLaoDong], colEnds[cols.soLaoDong], 1)))
        : 1;

    const smv =
      cols.tgSmv >= 0 && cols.tgSmv < colCount
        ? Math.max(0.1, parseNumberBytes(buf, colStarts[cols.tgSmv], colEnds[cols.tgSmv], 1.0))
        : 1.0;

    const actualSec =
      cols.tgThucTeGiay >= 0 && cols.tgThucTeGiay < colCount
        ? parseNumberBytes(buf, colStarts[cols.tgThucTeGiay], colEnds[cols.tgThucTeGiay], 0)
        : 0;

    let eff =
      cols.hieuSuatTb >= 0 && cols.hieuSuatTb < colCount
        ? parseNumberBytes(buf, colStarts[cols.hieuSuatTb], colEnds[cols.hieuSuatTb], 0)
        : 0;
    if (eff > 0 && eff <= 1) eff = eff * 100;
    if (eff <= 0 && actualSec > 0) {
      eff = ((smv * 60) / actualSec) * 100;
    }
    if (eff <= 0) eff = 58;
    eff = Math.min(100, Math.max(10, eff));

    const wip =
      cols.wip >= 0 && cols.wip < colCount
        ? Math.max(0, parseNumberBytes(buf, colStarts[cols.wip], colEnds[cols.wip], 0))
        : 0;

    const shiftOut =
      cols.sanLuongCa >= 0 && cols.sanLuongCa < colCount
        ? Math.max(0, parseNumberBytes(buf, colStarts[cols.sanLuongCa], colEnds[cols.sanLuongCa], 0))
        : Math.max(1, Math.round((60 / smv) * (eff / 100) * 8));

    let defectRate =
      cols.tyLeLoi >= 0 && cols.tyLeLoi < colCount
        ? parseNumberBytes(buf, colStarts[cols.tyLeLoi], colEnds[cols.tyLeLoi], -1)
        : -1;
    if (defectRate > 0 && defectRate < 0.25 && cols.soHangLoi < 0) {
      defectRate = defectRate * 100;
    }
    const defectUnits =
      cols.soHangLoi >= 0 && cols.soHangLoi < colCount
        ? Math.max(0, parseNumberBytes(buf, colStarts[cols.soHangLoi], colEnds[cols.soHangLoi], 0))
        : defectRate >= 0
          ? Math.round((shiftOut * defectRate) / 100)
          : 0;

    if (defectRate < 0) {
      defectRate = shiftOut > 0 ? (defectUnits / shiftOut) * 100 : 0;
    }

    const wage =
      cols.luongThang >= 0 && cols.luongThang < colCount
        ? Math.max(0, parseNumberBytes(buf, colStarts[cols.luongThang], colEnds[cols.luongThang], 7800000))
        : 7800000;

    const equipCost =
      cols.chiPhiThietBi >= 0 && cols.chiPhiThietBi < colCount
        ? Math.max(0, parseNumberBytes(buf, colStarts[cols.chiPhiThietBi], colEnds[cols.chiPhiThietBi], 0))
        : 0;

    const tech =
      cols.giaiPhapKyThuat >= 0 && cols.giaiPhapKyThuat < colCount
        ? interner.decodeCached(buf, colStarts[cols.giaiPhapKyThuat], colEnds[cols.giaiPhapKyThuat])
        : '';

    const unitPrice =
      cols.donGiaBan >= 0 && cols.donGiaBan < colCount
        ? parseNumberBytes(buf, colStarts[cols.donGiaBan], colEnds[cols.donGiaBan], 0)
        : 0;

    const materialCost =
      cols.chiPhiNvlSp >= 0 && cols.chiPhiNvlSp < colCount
        ? parseNumberBytes(buf, colStarts[cols.chiPhiNvlSp], colEnds[cols.chiPhiNvlSp], 0)
        : 0;

    const teamDemand =
      cols.nhuCauDonHangTo >= 0 && cols.nhuCauDonHangTo < colCount
        ? Math.max(0, parseNumberBytes(buf, colStarts[cols.nhuCauDonHangTo], colEnds[cols.nhuCauDonHangTo], 0))
        : 0;

    const marketContext =
      cols.boiCanhThiTruong >= 0 && cols.boiCanhThiTruong < colCount
        ? interner.decodeCached(buf, colStarts[cols.boiCanhThiTruong], colEnds[cols.boiCanhThiTruong])
        : '';

    this.recordBucketRowDirect(
      quarter,
      stageId,
      stageName,
      teamName,
      workerId,
      soLaoDong,
      smv,
      eff,
      wip,
      shiftOut,
      defectUnits,
      defectRate,
      wage,
      equipCost,
      tech,
      unitPrice,
      materialCost,
      teamDemand,
      marketContext
    );
  }

  /**
   * High-throughput zero-array-allocation CSV line scanner using indexOf(',') and charCodeAt().
   * Falls back to quoted parser only when a double quote '"' exists inside the line slice.
   */
  ingestCsvLineSlice(
    text: string,
    lineStart: number,
    lineEnd: number,
    cols: ColumnIndexMap
  ): void {
    let start = lineStart;
    let end = lineEnd;
    if (start < end && text.charCodeAt(start) === 0xfeff) start += 1;
    while (start < end && text.charCodeAt(start) <= 32) start += 1;
    while (end > start && text.charCodeAt(end - 1) <= 32) end -= 1;
    if (start >= end) return;

    const quoteIdx = text.indexOf('"', start);
    if (quoteIdx !== -1 && quoteIdx < end) {
      this.ingestRowValues(splitCsvLine(text.slice(start, end)), cols);
      return;
    }

    const buf = this.reusableFields;
    let colIdx = 0;
    let pos = start;

    while (pos <= end && colIdx < 32) {
      const commaIdx = text.indexOf(',', pos);
      if (commaIdx === -1 || commaIdx >= end) {
        buf[colIdx] = text.slice(pos, end);
        colIdx += 1;
        break;
      }
      buf[colIdx] = text.slice(pos, commaIdx);
      colIdx += 1;
      pos = commaIdx + 1;
    }

    for (let k = colIdx; k <= cols.maxColIndex && k < 32; k += 1) {
      buf[k] = '';
    }

    this.ingestRowValues(buf, cols);
  }

  ingestRowValues(values: unknown[], cols: ColumnIndexMap): void {
    const rawStageName =
      cols.tenCongDoan >= 0 ? String(values[cols.tenCongDoan] ?? '').trim() : '';
    const rawStageId = cols.id >= 0 ? String(values[cols.id] ?? '').trim() : '';
    if (!rawStageName && !rawStageId) return;

    const stageName = rawStageName || rawStageId;
    const stageId = this.resolveStageId(rawStageId, stageName);

    const rawQuy = cols.quy >= 0 ? String(values[cols.quy] ?? '') : '';
    const rawNam = cols.nam >= 0 ? (values[cols.nam] as string | number) : '';
    const rawTs = cols.timestamp >= 0 ? String(values[cols.timestamp] ?? '') : '';
    const quarter = this.resolveQuarterCached(rawQuy, rawNam, rawTs);

    const teamName =
      cols.toSanXuat >= 0 && String(values[cols.toSanXuat] ?? '').trim()
        ? String(values[cols.toSanXuat]).trim()
        : `Tổ ${stageId}`;

    const workerId =
      cols.maCongNhan >= 0 ? String(values[cols.maCongNhan] ?? '').trim() : '';

    const soLaoDong =
      cols.soLaoDong >= 0 ? Math.max(1, Math.round(parseNum(values[cols.soLaoDong], 1))) : 1;

    const smv = cols.tgSmv >= 0 ? Math.max(0.1, parseNum(values[cols.tgSmv], 1.0)) : 1.0;
    const actualSec =
      cols.tgThucTeGiay >= 0 ? parseNum(values[cols.tgThucTeGiay], 0) : 0;

    let eff = cols.hieuSuatTb >= 0 ? parseNum(values[cols.hieuSuatTb], 0) : 0;
    if (eff > 0 && eff <= 1) eff = eff * 100;
    if (eff <= 0 && actualSec > 0) {
      eff = ((smv * 60) / actualSec) * 100;
    }
    if (eff <= 0) eff = 58;
    eff = Math.min(100, Math.max(10, eff));

    const wip = cols.wip >= 0 ? Math.max(0, parseNum(values[cols.wip], 0)) : 0;
    const shiftOut =
      cols.sanLuongCa >= 0
        ? Math.max(0, parseNum(values[cols.sanLuongCa], 0))
        : Math.max(1, Math.round((60 / smv) * (eff / 100) * 8));

    let defectRate = cols.tyLeLoi >= 0 ? parseNum(values[cols.tyLeLoi], -1) : -1;
    if (defectRate > 0 && defectRate < 0.25 && cols.soHangLoi < 0) {
      defectRate = defectRate * 100;
    }
    const defectUnits =
      cols.soHangLoi >= 0
        ? Math.max(0, parseNum(values[cols.soHangLoi], 0))
        : defectRate >= 0
          ? Math.round((shiftOut * defectRate) / 100)
          : 0;

    if (defectRate < 0) {
      defectRate = shiftOut > 0 ? (defectUnits / shiftOut) * 100 : 0;
    }

    const wage =
      cols.luongThang >= 0 ? Math.max(0, parseNum(values[cols.luongThang], 7800000)) : 7800000;
    const equipCost =
      cols.chiPhiThietBi >= 0 ? Math.max(0, parseNum(values[cols.chiPhiThietBi], 0)) : 0;
    const tech =
      cols.giaiPhapKyThuat >= 0
        ? String(values[cols.giaiPhapKyThuat] ?? '').trim() || 'Không'
        : 'Không';

    const unitPrice =
      cols.donGiaBan >= 0 ? parseNum(values[cols.donGiaBan], 0) : 0;
    const materialCost =
      cols.chiPhiNvlSp >= 0 ? parseNum(values[cols.chiPhiNvlSp], 0) : 0;
    const teamDemand =
      cols.nhuCauDonHangTo >= 0 ? Math.max(0, parseNum(values[cols.nhuCauDonHangTo], 0)) : 0;
    const marketContext =
      cols.boiCanhThiTruong >= 0
        ? String(values[cols.boiCanhThiTruong] ?? '').trim()
        : '';

    this.recordBucketRowDirect(
      quarter,
      stageId,
      stageName,
      teamName,
      workerId,
      soLaoDong,
      smv,
      eff,
      wip,
      shiftOut,
      defectUnits,
      defectRate,
      wage,
      equipCost,
      tech,
      unitPrice,
      materialCost,
      teamDemand,
      marketContext
    );
  }

  ingestObjectRow(row: Record<string, unknown>): void {
    const keys = Object.keys(row);
    const cols = buildColumnIndexMap(keys);
    const values = keys.map((k) => row[k]);
    this.ingestRowValues(values, cols);
  }

  finalize(sourceLabel: string): AggregatedFactoryDataset {
    const quartersSet = new Set<QuarterId>();
    const teamMetricsByQuarter = new Map<QuarterId, TeamMetrics[]>();
    const marketContextByQuarter = new Map<QuarterId, string>();

    for (const bucket of this.teamBuckets.values()) {
      quartersSet.add(bucket.quarter);
      if (bucket.marketContext && !marketContextByQuarter.has(bucket.quarter)) {
        marketContextByQuarter.set(bucket.quarter, bucket.marketContext);
      }

      const workerCount = bucket.hasWorkerIds
        ? bucket.workerStats.size
        : Math.max(1, bucket.declaredWorkersMax);

      const weightedSmv = Number((bucket.smvSum / bucket.rowCount).toFixed(2));
      const productivityPct = Math.round(bucket.effSum / bucket.rowCount);
      const defectRatePct =
        bucket.totalOutputUnits > 0
          ? Number(((bucket.totalDefectUnits / bucket.totalOutputUnits) * 100).toFixed(2))
          : Number((bucket.defectRateSum / bucket.rowCount).toFixed(2));

      const avgWipPerRow = bucket.wipSum / Math.max(1, bucket.rowCount);
      const teamWip = bucket.hasWorkerIds
        ? Math.max(1, Math.round(avgWipPerRow * workerCount))
        : Math.max(0, Math.round(avgWipPerRow));

      const hourlyCapacity = calculateEffectiveCapacity(
        workerCount,
        weightedSmv,
        productivityPct
      );

      const unitSellingPrice =
        bucket.unitPriceCount > 0
          ? Math.round(bucket.unitPriceSum / bucket.unitPriceCount)
          : DEFAULT_UNIT_SELLING_PRICE;
      const unitMaterialCost =
        bucket.materialCostCount > 0
          ? Math.round(bucket.materialCostSum / bucket.materialCostCount)
          : DEFAULT_UNIT_MATERIAL_COST;
      const marketOrderDemand =
        bucket.teamDemandMax > 0
          ? Math.round(bucket.teamDemandMax)
          : Math.round(hourlyCapacity * WORKING_HOURS_PER_QUARTER * 1.15);

      const outlierWorkers: OutlierWorkerStat[] = [];
      for (const ws of bucket.workerStats.values()) {
        const wEff = Math.round(ws.effWeightedSum / Math.max(1, ws.effWeight));
        const wDefRate =
          ws.totalUnits > 0
            ? Number(((ws.defectUnits / ws.totalUnits) * 100).toFixed(2))
            : Number((ws.defectRateSum / Math.max(1, ws.rowCount)).toFixed(2));

        const reasons: ('low_efficiency' | 'high_defect')[] = [];
        if (wEff < LOW_EFFICIENCY_THRESHOLD) reasons.push('low_efficiency');
        if (wDefRate > TEAM_HIGH_DEFECT_THRESHOLD) reasons.push('high_defect');

        if (reasons.length > 0) {
          outlierWorkers.push({
            workerId: ws.workerId,
            teamName: bucket.teamName,
            stageId: bucket.stageId,
            efficiencyPct: wEff,
            defectRatePct: wDefRate,
            defectUnits: Math.round(ws.defectUnits),
            reasons,
          });
        }
      }

      const isLowProductivityTeam = productivityPct < LOW_EFFICIENCY_THRESHOLD;
      const isHighDefectTeam = defectRatePct > TEAM_HIGH_DEFECT_THRESHOLD;
      const isAlertTeam =
        isLowProductivityTeam ||
        defectRatePct > STAGE_DEFECT_ALERT_THRESHOLD ||
        outlierWorkers.length > 0;

      const teamMetric: TeamMetrics = {
        teamName: bucket.teamName,
        stageId: bucket.stageId,
        stageName: bucket.stageName,
        quarter: bucket.quarter,
        workerCount,
        weightedSmv,
        productivityPct,
        hourlyCapacity,
        defectCount: Math.round(bucket.totalDefectUnits),
        totalUnitsSampled: Math.round(bucket.totalOutputUnits),
        defectRatePct,
        wip: teamWip,
        monthlyWagePerWorker: Math.round(bucket.wageSum / bucket.rowCount),
        marketOrderDemand,
        unitSellingPrice,
        unitMaterialCost,
        isLowProductivityTeam,
        isHighDefectTeam,
        isAlertTeam,
        outlierWorkers,
      };

      const arr = teamMetricsByQuarter.get(bucket.quarter) ?? [];
      arr.push(teamMetric);
      teamMetricsByQuarter.set(bucket.quarter, arr);
    }

    const quartersAvailable = Array.from(quartersSet).sort(compareQuarterIds);
    const byQuarter: Partial<Record<QuarterId, QuarterSummary>> = {};

    for (const q of quartersAvailable) {
      const teams = teamMetricsByQuarter.get(q) ?? [];
      byQuarter[q] = this.buildQuarterSummary(
        q,
        teams,
        marketContextByQuarter.get(q) ?? 'Thị trường bình thường'
      );
    }

    const allQuartersSummary = this.buildCombinedAllQuartersSummary(
      quartersAvailable,
      byQuarter
    );

    const quarterlyTeamTrends = this.buildQuarterlyTeamTrends(
      quartersAvailable,
      byQuarter
    );

    const historicalSeries: SevenYearQuarterPoint[] = quartersAvailable.map((q) => {
      const qs = byQuarter[q]!;
      return {
        quarter: q,
        marketContext: qs.financials.marketContext,
        hourlyThroughput: qs.hourlyLineThroughput,
        defectRatePct: qs.overallDefectRatePct,
        marketDemandUnits: qs.financials.marketOrderDemand,
        sellableUnits: qs.financials.sellableOutputUnits,
        realizedRevenueVnd: qs.financials.realizedRevenueVnd,
        netProfitVnd: qs.financials.netProfitVnd,
      };
    });

    return {
      sourceLabel,
      totalRowsProcessed: this.totalRows,
      quartersAvailable,
      byQuarter,
      allQuartersSummary,
      quarterlyTeamTrends,
      historicalSeries,
    };
  }

  private buildQuarterSummary(
    quarter: QuarterId,
    teams: TeamMetrics[],
    marketContext: string
  ): QuarterSummary {
    const teamsByStage = new Map<string, TeamMetrics[]>();
    for (const t of teams) {
      const list = teamsByStage.get(t.stageId) ?? [];
      list.push(t);
      teamsByStage.set(t.stageId, list);
    }

    const stageIds = Array.from(teamsByStage.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    const rawStages = stageIds.map((stageId) => {
      const stageTeams = (teamsByStage.get(stageId) ?? []).sort((a, b) =>
        a.teamName.localeCompare(b.teamName)
      );
      const totalWorkers = stageTeams.reduce((s, t) => s + t.workerCount, 0);
      const weightedSmv =
        totalWorkers > 0
          ? Number(
              (
                stageTeams.reduce((s, t) => s + t.weightedSmv * t.workerCount, 0) /
                totalWorkers
              ).toFixed(2)
            )
          : 1;
      const weightedEff =
        totalWorkers > 0
          ? Math.round(
              stageTeams.reduce((s, t) => s + t.productivityPct * t.workerCount, 0) /
                totalWorkers
            )
          : 0;
      const totalCapacity = stageTeams.reduce((s, t) => s + t.hourlyCapacity, 0);
      const totalWip = stageTeams.reduce((s, t) => s + t.wip, 0);
      const totalDefects = stageTeams.reduce((s, t) => s + t.defectCount, 0);
      const totalSampled = stageTeams.reduce((s, t) => s + t.totalUnitsSampled, 0);
      const stageDefectRate =
        totalSampled > 0
          ? Number(((totalDefects / totalSampled) * 100).toFixed(2))
          : Number(
              (
                stageTeams.reduce((s, t) => s + t.defectRatePct, 0) /
                Math.max(1, stageTeams.length)
              ).toFixed(2)
            );
      const avgWage =
        totalWorkers > 0
          ? Math.round(
              stageTeams.reduce(
                (s, t) => s + t.monthlyWagePerWorker * t.workerCount,
                0
              ) / totalWorkers
            )
          : 7800000;

      let equipCost = 0;
      const techs = new Set<string>();
      for (const b of this.teamBuckets.values()) {
        if (b.quarter === quarter && b.stageId === stageId) {
          equipCost += b.hasWorkerIds
            ? Math.round((b.equipCostSum / Math.max(1, b.rowCount)) * b.workerStats.size)
            : Math.round(b.equipCostSum / Math.max(1, b.rowCount));
          b.techHints.forEach((h) => techs.add(h));
        }
      }

      const anyTeamHighDefect = stageTeams.some(
        (t) => t.defectRatePct > STAGE_DEFECT_ALERT_THRESHOLD
      );
      const isHighDefectStage =
        anyTeamHighDefect || stageDefectRate > STAGE_DEFECT_ALERT_THRESHOLD;
      const isLowEff =
        weightedEff < LOW_EFFICIENCY_THRESHOLD ||
        stageTeams.some((t) => t.isLowProductivityTeam);

      return {
        id: stageId,
        TenCongDoan: stageTeams[0]?.stageName ?? stageId,
        quarter,
        teamCount: stageTeams.length,
        SoLaoDong: totalWorkers,
        TG_SMV: weightedSmv,
        HieuSuat_TB: weightedEff,
        Capacity: totalCapacity,
        WIP: totalWip,
        defectCount: totalDefects,
        TyLeLoi: stageDefectRate,
        Luong_Thang: avgWage,
        GiaiPhap_KyThuat: techs.size > 0 ? Array.from(techs).join(' / ') : 'Không',
        ChiPhi_ThietBi: equipCost,
        isBottleneck: false,
        isHighDefectStage,
        isLowEfficiencyOutlier: isLowEff,
        isAlertStage: isHighDefectStage || isLowEff,
        teams: stageTeams,
      } satisfies StageMetrics;
    });

    const minCap =
      rawStages.length > 0 ? Math.min(...rawStages.map((s) => s.Capacity)) : 0;
    const bottleneckIdx = rawStages.findIndex((s) => s.Capacity === minCap);
    const stages = rawStages.map((s, idx) => {
      const isBottleneck = idx === bottleneckIdx;
      return {
        ...s,
        isBottleneck,
        isAlertStage: isBottleneck || s.isHighDefectStage || s.isLowEfficiencyOutlier,
      };
    });

    const totalWorkers = stages.reduce((s, st) => s + st.SoLaoDong, 0);
    const totalWip = stages.reduce((s, st) => s + st.WIP, 0);
    const totalDefectUnits = stages.reduce((s, st) => s + st.defectCount, 0);
    const totalUnitsAll = teams.reduce((s, t) => s + t.totalUnitsSampled, 0);
    const overallDefectRatePct =
      totalUnitsAll > 0
        ? Number(((totalDefectUnits / totalUnitsAll) * 100).toFixed(2))
        : Number(
            (
              stages.reduce((s, st) => s + st.TyLeLoi, 0) / Math.max(1, stages.length)
            ).toFixed(2)
          );
    const weightedProductivityPct =
      totalWorkers > 0
        ? Number(
            (
              stages.reduce((s, st) => s + st.HieuSuat_TB * st.SoLaoDong, 0) /
              totalWorkers
            ).toFixed(1)
          )
        : 0;

    const totalMonthlyPayroll = stages.reduce(
      (s, st) => s + st.SoLaoDong * st.Luong_Thang,
      0
    );
    const monthlyOutput = minCap * WORKING_HOURS_PER_MONTH;
    const unitLaborCost =
      monthlyOutput > 0 ? Math.round(totalMonthlyPayroll / monthlyOutput) : 0;

    // Derive factory quarterly demand from average stage order demand (sum of team demands in a stage)
    const stageDemandTotals = stages.map((st) =>
      st.teams.reduce((sum, t) => sum + t.marketOrderDemand, 0)
    );
    const factoryDemand =
      stageDemandTotals.length > 0
        ? Math.round(
            stageDemandTotals.reduce((s, v) => s + v, 0) / stageDemandTotals.length
          )
        : minCap * WORKING_HOURS_PER_QUARTER;

    const avgUnitPrice =
      teams.length > 0
        ? Math.round(teams.reduce((s, t) => s + t.unitSellingPrice, 0) / teams.length)
        : DEFAULT_UNIT_SELLING_PRICE;
    const avgMaterialCost =
      teams.length > 0
        ? Math.round(teams.reduce((s, t) => s + t.unitMaterialCost, 0) / teams.length)
        : DEFAULT_UNIT_MATERIAL_COST;

    const financials = computeQuarterFinancials({
      quarter,
      marketContext,
      hourlyLineThroughput: minCap,
      overallDefectRatePct,
      stages,
      marketOrderDemand: factoryDemand,
      unitSellingPrice: avgUnitPrice,
      unitMaterialCost: avgMaterialCost,
    });

    return {
      quarter,
      totalWorkers,
      totalQuarterlyOutput: minCap * WORKING_HOURS_PER_QUARTER,
      hourlyLineThroughput: minCap,
      weightedProductivityPct,
      overallDefectRatePct,
      totalDefectUnits,
      totalWip,
      unitLaborCost,
      bottleneckStageId: stages[bottleneckIdx]?.id ?? null,
      stages,
      financials,
    };
  }

  private buildCombinedAllQuartersSummary(
    quarters: QuarterId[],
    byQuarter: Partial<Record<QuarterId, QuarterSummary>>
  ): QuarterSummary {
    const latestQ = quarters[quarters.length - 1] ?? 'Q1';
    const latestSummary = byQuarter[latestQ];
    if (!latestSummary || quarters.length <= 1) {
      return (
        latestSummary ?? {
          quarter: 'Q1',
          totalWorkers: 0,
          totalQuarterlyOutput: 0,
          hourlyLineThroughput: 0,
          weightedProductivityPct: 0,
          overallDefectRatePct: 0,
          totalDefectUnits: 0,
          totalWip: 0,
          unitLaborCost: 0,
          bottleneckStageId: null,
          stages: [],
          financials: computeQuarterFinancials({
            quarter: 'Q1',
            marketContext: 'Chưa có dữ liệu',
            hourlyLineThroughput: 0,
            overallDefectRatePct: 0,
            stages: [],
            marketOrderDemand: 0,
            unitSellingPrice: DEFAULT_UNIT_SELLING_PRICE,
            unitMaterialCost: DEFAULT_UNIT_MATERIAL_COST,
          }),
        }
      );
    }

    const summaries = quarters
      .map((q) => byQuarter[q])
      .filter((s): s is QuarterSummary => Boolean(s));

    // Merge teams across all available quarters so earlier-quarter stages are never dropped
    const groupedTeams = new Map<string, TeamMetrics[]>();
    for (const qSummary of summaries) {
      for (const stage of qSummary.stages) {
        for (const team of stage.teams) {
          const key = `${stage.id}::${team.teamName}`;
          const list = groupedTeams.get(key) ?? [];
          list.push(team);
          groupedTeams.set(key, list);
        }
      }
    }

    const mergedTeams: TeamMetrics[] = Array.from(groupedTeams.values()).map((entries) => {
      const latest = entries[entries.length - 1];
      const n = entries.length;
      const workerCount = Math.max(
        1,
        Math.round(entries.reduce((s, t) => s + t.workerCount, 0) / n)
      );
      const weightedSmv = Number(
        (entries.reduce((s, t) => s + t.weightedSmv, 0) / n).toFixed(2)
      );
      const productivityPct = Math.round(
        entries.reduce((s, t) => s + t.productivityPct, 0) / n
      );
      const hourlyCapacity = calculateEffectiveCapacity(
        workerCount,
        weightedSmv,
        productivityPct
      );
      const defectCount = entries.reduce((s, t) => s + t.defectCount, 0);
      const totalUnitsSampled = entries.reduce((s, t) => s + t.totalUnitsSampled, 0);
      const defectRatePct =
        totalUnitsSampled > 0
          ? Number(((defectCount / totalUnitsSampled) * 100).toFixed(2))
          : Number((entries.reduce((s, t) => s + t.defectRatePct, 0) / n).toFixed(2));
      const wip = Math.round(entries.reduce((s, t) => s + t.wip, 0) / n);
      const monthlyWagePerWorker = Math.round(
        entries.reduce((s, t) => s + t.monthlyWagePerWorker, 0) / n
      );
      const marketOrderDemand = Math.round(
        entries.reduce((s, t) => s + t.marketOrderDemand, 0) / n
      );
      const unitSellingPrice = Math.round(
        entries.reduce((s, t) => s + t.unitSellingPrice, 0) / n
      );
      const unitMaterialCost = Math.round(
        entries.reduce((s, t) => s + t.unitMaterialCost, 0) / n
      );
      const isLowProductivityTeam = productivityPct < LOW_EFFICIENCY_THRESHOLD;
      const isHighDefectTeam = defectRatePct > TEAM_HIGH_DEFECT_THRESHOLD;
      const outlierWorkers = latest.outlierWorkers;
      const isAlertTeam =
        isLowProductivityTeam ||
        defectRatePct > STAGE_DEFECT_ALERT_THRESHOLD ||
        outlierWorkers.length > 0;

      return {
        teamName: latest.teamName,
        stageId: latest.stageId,
        stageName: latest.stageName,
        quarter: latest.quarter,
        workerCount,
        weightedSmv,
        productivityPct,
        hourlyCapacity,
        defectCount,
        totalUnitsSampled,
        defectRatePct,
        wip,
        monthlyWagePerWorker,
        marketOrderDemand,
        unitSellingPrice,
        unitMaterialCost,
        isLowProductivityTeam,
        isHighDefectTeam,
        isAlertTeam,
        outlierWorkers,
      };
    });

    const combinedSummary = this.buildQuarterSummary(
      latestQ,
      mergedTeams,
      `Tổng hợp ${quarters.length} quý (${quarters[0]} → ${latestQ})`
    );
    const totalQuarterlyOutput = summaries.reduce(
      (s, q) => s + q.totalQuarterlyOutput,
      0
    );

    return {
      ...combinedSummary,
      totalQuarterlyOutput,
    };
  }

  private buildQuarterlyTeamTrends(
    quarters: QuarterId[],
    byQuarter: Partial<Record<QuarterId, QuarterSummary>>
  ): QuarterlyTeamTrendRow[] {
    const teamIndex = new Map<
      string,
      {
        teamName: string;
        stageId: string;
        stageName: string;
        orderedEntries: { quarter: QuarterId; team: TeamMetrics }[];
        bySimpleQ: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', TeamMetrics>>;
      }
    >();

    for (const q of quarters) {
      const summary = byQuarter[q];
      if (!summary) continue;
      const qMatch = q.match(/Q([1-4])$/i);
      const simpleKey = qMatch ? (`Q${qMatch[1]}` as 'Q1' | 'Q2' | 'Q3' | 'Q4') : null;

      for (const stage of summary.stages) {
        for (const team of stage.teams) {
          const key = `${stage.id}::${team.teamName}`;
          let entry = teamIndex.get(key);
          if (!entry) {
            entry = {
              teamName: team.teamName,
              stageId: stage.id,
              stageName: stage.TenCongDoan,
              orderedEntries: [],
              bySimpleQ: {},
            };
            teamIndex.set(key, entry);
          }
          entry.orderedEntries.push({ quarter: q, team });
          if (simpleKey) {
            entry.bySimpleQ[simpleKey] = team; // keeps latest year's Q1..Q4 for quick breakdown
          }
        }
      }
    }

    return Array.from(teamIndex.values())
      .sort((a, b) =>
        a.stageId !== b.stageId
          ? a.stageId.localeCompare(b.stageId, undefined, { numeric: true })
          : a.teamName.localeCompare(b.teamName)
      )
      .map((entry) => {
        const firstEntry = entry.orderedEntries[0];
        const latestEntry = entry.orderedEntries[entry.orderedEntries.length - 1];
        const firstDef = firstEntry?.team.defectRatePct ?? 0;
        const lastDef = latestEntry?.team.defectRatePct ?? 0;
        const defectDelta = Number((lastDef - firstDef).toFixed(2));
        const isDefectRisingQoQ =
          entry.orderedEntries.length >= 2 && defectDelta > 0.5;

        const latestOutlierWorkers = latestEntry
          ? latestEntry.team.outlierWorkers.map(
              (w) => `${w.workerId} (${w.efficiencyPct}% NS · ${w.defectRatePct}% lỗi)`
            )
          : [];

        const q1 = entry.bySimpleQ.Q1;
        const q2 = entry.bySimpleQ.Q2;
        const q3 = entry.bySimpleQ.Q3;
        const q4 = entry.bySimpleQ.Q4;

        return {
          teamName: entry.teamName,
          stageId: entry.stageId,
          stageName: entry.stageName,
          firstQuarterLabel: firstEntry?.quarter ?? 'Q1',
          latestQuarterLabel: latestEntry?.quarter ?? 'Q4',
          firstProductivity: firstEntry ? firstEntry.team.productivityPct : null,
          latestProductivity: latestEntry ? latestEntry.team.productivityPct : null,
          firstDefectRate: firstEntry ? firstEntry.team.defectRatePct : null,
          latestDefectRate: latestEntry ? latestEntry.team.defectRatePct : null,
          q1Productivity: q1 ? q1.productivityPct : null,
          q2Productivity: q2 ? q2.productivityPct : null,
          q3Productivity: q3 ? q3.productivityPct : null,
          q4Productivity: q4 ? q4.productivityPct : null,
          q1DefectRate: q1 ? q1.defectRatePct : null,
          q2DefectRate: q2 ? q2.defectRatePct : null,
          q3DefectRate: q3 ? q3.defectRatePct : null,
          q4DefectRate: q4 ? q4.defectRatePct : null,
          defectDeltaFirstToLatest: defectDelta,
          isDefectRisingQoQ,
          latestOutlierWorkers,
        };
      });
  }
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

export function formatCompactVnd(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)} tr`;
  }
  return `${sign}${new Intl.NumberFormat('vi-VN').format(Math.round(abs))} đ`;
}

export function formatRowsVietnamese(rows: number): string {
  if (rows >= 1_000_000) {
    return `${(rows / 1_000_000).toFixed(2)} triệu dòng`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(rows)} dòng`;
}
