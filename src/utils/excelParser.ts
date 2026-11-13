import * as XLSX from 'xlsx';
import type { StationInput } from '../types/kaizen';

const EXPECTED_COLUMNS = [
  'id',
  'TenCongDoan',
  'SoLaoDong',
  'TG_SMV',
  'WIP',
  'Luong_Thang',
  'GiaiPhap_KyThuat',
  'ChiPhi_ThietBi',
] as const;

const COLUMN_ALIASES: Record<string, (typeof EXPECTED_COLUMNS)[number]> = {
  id: 'id',
  macongdoan: 'id',
  tencongdoan: 'TenCongDoan',
  congdoan: 'TenCongDoan',
  solaodong: 'SoLaoDong',
  laodong: 'SoLaoDong',
  workers: 'SoLaoDong',
  tgsmv: 'TG_SMV',
  tg_smv: 'TG_SMV',
  smv: 'TG_SMV',
  wip: 'WIP',
  luongthang: 'Luong_Thang',
  luong_thang: 'Luong_Thang',
  luong: 'Luong_Thang',
  giaiphapkythuat: 'GiaiPhap_KyThuat',
  giaiphap_kythuat: 'GiaiPhap_KyThuat',
  giaiphap: 'GiaiPhap_KyThuat',
  chiphithietbi: 'ChiPhi_ThietBi',
  chiphi_thietbi: 'ChiPhi_ThietBi',
  chiphi: 'ChiPhi_ThietBi',
};

function normalizeKey(rawKey: string): string {
  return rawKey
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

function parseNumericField(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/\s+/g, '').replace(/,/g, '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function parseWorkbookBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filenameHint?: string
): StationInput[] {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const isZipOrLegacyExcel =
    (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) ||
    (bytes.length >= 4 &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0);
  const isCsv =
    filenameHint?.toLowerCase().endsWith('.csv') || !isZipOrLegacyExcel;

  const workbook = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, ''), {
        type: 'string',
      })
    : XLSX.read(bytes, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Tệp tải lên không có trang tính (sheet) hợp lệ.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('Tệp dữ liệu trống. Vui lòng kiểm tra lại các dòng công đoạn.');
  }

  const stations: StationInput[] = rawRows.map((row, idx) => {
    const mapped: Partial<Record<(typeof EXPECTED_COLUMNS)[number], unknown>> = {};

    for (const [rawKey, val] of Object.entries(row)) {
      const norm = normalizeKey(rawKey);
      const compactNorm = norm.replace(/_/g, '');
      const target = COLUMN_ALIASES[norm] ?? COLUMN_ALIASES[compactNorm];
      if (target) {
        mapped[target] = val;
      }
    }

    const id = String(mapped.id ?? '').trim() || `CD${idx + 1}`;
    const tenCongDoan = String(mapped.TenCongDoan ?? '').trim();
    if (!tenCongDoan) {
      throw new Error(
        `Dòng ${idx + 2} thiếu cột "TenCongDoan". Cần đủ các cột: ${EXPECTED_COLUMNS.join(', ')}.`
      );
    }

    const soLaoDong = Math.round(parseNumericField(mapped.SoLaoDong, 0));
    const tgSmv = parseNumericField(mapped.TG_SMV, 0);
    const wip = Math.max(0, Math.round(parseNumericField(mapped.WIP, 0)));
    const luongThang = Math.max(0, Math.round(parseNumericField(mapped.Luong_Thang, 0)));
    const giaiPhap = String(mapped.GiaiPhap_KyThuat ?? 'Không').trim() || 'Không';
    const chiPhiThietBi = Math.max(0, Math.round(parseNumericField(mapped.ChiPhi_ThietBi, 0)));

    if (soLaoDong <= 0) {
      throw new Error(`Công đoạn "${id}" có SoLaoDong không hợp lệ (phải > 0).`);
    }
    if (tgSmv <= 0) {
      throw new Error(`Công đoạn "${id}" có TG_SMV không hợp lệ (phải > 0).`);
    }

    return {
      id,
      TenCongDoan: tenCongDoan,
      SoLaoDong: soLaoDong,
      TG_SMV: tgSmv,
      WIP: wip,
      Luong_Thang: luongThang,
      GiaiPhap_KyThuat: giaiPhap,
      ChiPhi_ThietBi: chiPhiThietBi,
    };
  });

  return stations;
}

export async function parseSpreadsheetFile(file: File): Promise<StationInput[]> {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.csv')) {
    throw new Error('Định dạng tệp không hỗ trợ. Vui lòng chọn tệp .xlsx hoặc .csv.');
  }

  const buffer = await file.arrayBuffer();
  return parseWorkbookBuffer(buffer, file.name);
}

export function buildSampleWorkbookBytes(stations: StationInput[]): Uint8Array {
  const worksheet = XLSX.utils.json_to_sheet(stations, {
    header: [...EXPECTED_COLUMNS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ChuyenMay');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

export function downloadSampleExcelFile(stations: StationInput[], filename = 'mau_chuyen_polo_kaizen.xlsx'): void {
  const bytes = buildSampleWorkbookBytes(stations);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
