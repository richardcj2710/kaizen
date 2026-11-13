import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompactAiPayload } from '../services/geminiService';
import {
  ByteStringInterner,
  StreamingKaizenAggregator,
  buildColumnIndexMap,
  parseNumberBytes,
  parseQuarterValue,
} from './streamingAggregator';

test('parseQuarterValue handles 2020-Q1..2026-Q4, Nam+Quy pairs, Q1-Q4, and ISO timestamps', () => {
  assert.equal(parseQuarterValue('Q1'), 'Q1');
  assert.equal(parseQuarterValue('Quý 3'), 'Q3');
  assert.equal(parseQuarterValue('2024-Q3'), '2024-Q3');
  assert.equal(parseQuarterValue('Q2', '2025'), '2025-Q2');
  assert.equal(parseQuarterValue('', undefined, '2026-11-12'), '2026-Q4');
  assert.equal(parseQuarterValue('', undefined, '2020-02-14T08:00:00Z'), '2020-Q1');
});

test('parseNumberBytes parses ints, decimals, negatives, whitespace, and % without strings', () => {
  const enc = new TextEncoder();
  const sample1 = enc.encode(' 108000 ');
  assert.equal(parseNumberBytes(sample1, 0, sample1.length), 108000);

  const sample2 = enc.encode('  -12.75% ');
  assert.equal(parseNumberBytes(sample2, 0, sample2.length), -12.75);

  const sample3 = enc.encode('   ');
  assert.equal(parseNumberBytes(sample3, 0, sample3.length, 42), 42);
});

test('ByteStringInterner decodes UTF-8 once per unique byte sequence and avoids collisions', () => {
  const enc = new TextEncoder();
  const interner = new ByteStringInterner();
  const b1 = enc.encode('  Tổ 4B - Thùa khuyết  ');
  const b2 = enc.encode('Tổ 4B - Thùa khuyết');
  const b3 = enc.encode('Tổ 1A - Chắp vai');

  const s1 = interner.decodeCached(b1, 0, b1.length);
  const s2 = interner.decodeCached(b2, 0, b2.length);
  const s3 = interner.decodeCached(b3, 0, b3.length);

  assert.equal(s1, 'Tổ 4B - Thùa khuyết');
  assert.equal(s2, 'Tổ 4B - Thùa khuyết');
  assert.equal(s3, 'Tổ 1A - Chắp vai');
  assert.equal(interner.size, 2);
});

test('StreamingKaizenAggregator zero-allocation ingestCsvLineSlice & ingestBinaryCsvLine produce identical totals', () => {
  const headerLine =
    'Nam,Quy,BoiCanh_ThiTruong,DonGia_Ban,ChiPhi_NVL_SP,NhuCau_DonHang_To,id,TenCongDoan,ToSanXuat,MaCongNhan,TG_SMV,HieuSuat_TB,WIP,SanLuong_Ca,SoHangLoi';
  const cols = buildColumnIndexMap(headerLine.split(','));

  const csvLines = [
    '2020,2020-Q1,Đầu dịch,108000,46000,40000,CD1,Cắt & May chắp vai,Tổ 1A,CN-001,0.8,60,3,360,6',
    '2020,2020-Q1,Đầu dịch,108000,46000,40000,CD1,Cắt & May chắp vai,Tổ 1A,CN-002,0.8,62,3,372,7',
    '2020,2020-Q1,Đầu dịch,108000,46000,40000,CD4,Thùa khuyết & Đơm nút,Tổ 4B,CN-047,2.5,28,15,54,4',
    '2026,2026-Q4,Cao điểm 2026,132000,51000,73000,CD4,Thùa khuyết & Đơm nút,Tổ 4B,CN-047,2.5,26,20,50,5',
  ];

  // String slice path
  const aggStr = new StreamingKaizenAggregator();
  for (const line of csvLines) {
    aggStr.ingestCsvLineSlice(line, 0, line.length, cols);
  }
  const dsStr = aggStr.finalize('multi_year.csv');

  // Binary zero-allocation path
  const aggBin = new StreamingKaizenAggregator();
  const interner = new ByteStringInterner();
  const enc = new TextEncoder();
  const colStarts = new Int32Array(32);
  const colEnds = new Int32Array(32);

  for (const line of csvLines) {
    const bytes = enc.encode(line);
    let colCount = 0;
    let start = 0;
    for (let i = 0; i <= bytes.length; i += 1) {
      if (i === bytes.length || bytes[i] === 44) {
        colStarts[colCount] = start;
        colEnds[colCount] = i;
        colCount += 1;
        start = i + 1;
      }
    }
    aggBin.ingestBinaryCsvLine(bytes, colStarts, colEnds, colCount, cols, interner);
  }
  const dsBin = aggBin.finalize('multi_year.csv');

  assert.equal(dsStr.totalRowsProcessed, 4);
  assert.deepEqual(dsStr.quartersAvailable, ['2020-Q1', '2026-Q4']);
  assert.equal(dsBin.totalRowsProcessed, dsStr.totalRowsProcessed);
  assert.deepEqual(dsBin.quartersAvailable, dsStr.quartersAvailable);

  const q2020 = dsBin.byQuarter['2020-Q1']!;
  assert.equal(q2020.totalWorkers, 3);
  assert.equal(q2020.bottleneckStageId, 'CD4');
  assert.equal(q2020.financials.unitSellingPrice, 108000);
  assert.equal(
    q2020.financials.realizedRevenueVnd,
    dsStr.byQuarter['2020-Q1']!.financials.realizedRevenueVnd
  );

  const cd4Q2026 = dsBin.byQuarter['2026-Q4']!.stages.find((s) => s.id === 'CD4')!;
  assert.equal(cd4Q2026.isHighDefectStage, true);
  assert.equal(cd4Q2026.teams[0].outlierWorkers[0].workerId, 'CN-047');
  assert.equal(dsBin.allQuartersSummary.stages.length, 2);
  assert.equal(dsBin.allQuartersSummary.totalWorkers, 3);
  assert.equal(dsBin.historicalSeries.length, 2);

  // Verify compact AI payload strictly stays under 12 KB
  const compact = buildCompactAiPayload(dsBin, '2026-Q4', dsBin.byQuarter['2026-Q4']!);
  const compactBytes = enc.encode(JSON.stringify(compact)).length;
  assert.ok(compactBytes < 12 * 1024, `Payload ${compactBytes} exceeds 12 KB`);
  assert.ok(compact.recentQuarters.length <= 4);
  for (const st of compact.stages) {
    for (const tm of st.teams) {
      assert.ok(tm.worstOutliers.length <= 3);
    }
  }
});
