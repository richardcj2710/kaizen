import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StreamingKaizenAggregator,
  buildColumnIndexMap,
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

test('StreamingKaizenAggregator zero-allocation ingestCsvLineSlice aggregates 28-quarter schema & financials', () => {
  const agg = new StreamingKaizenAggregator();
  const headerLine =
    'Nam,Quy,BoiCanh_ThiTruong,DonGia_Ban,ChiPhi_NVL_SP,NhuCau_DonHang_To,id,TenCongDoan,ToSanXuat,MaCongNhan,TG_SMV,HieuSuat_TB,WIP,SanLuong_Ca,SoHangLoi';
  const cols = buildColumnIndexMap(headerLine.split(','));

  const csvLines = [
    '2020,2020-Q1,Đầu dịch,108000,46000,40000,CD1,Cắt & May chắp vai,Tổ 1A,CN-001,0.8,60,3,360,6',
    '2020,2020-Q1,Đầu dịch,108000,46000,40000,CD1,Cắt & May chắp vai,Tổ 1A,CN-002,0.8,62,3,372,7',
    '2020,2020-Q1,Đầu dịch,108000,46000,40000,CD4,Thùa khuyết & Đơm nút,Tổ 4B,CN-047,2.5,28,15,54,4',
    '2026,2026-Q4,Cao điểm 2026,132000,51000,73000,CD4,Thùa khuyết & Đơm nút,Tổ 4B,CN-047,2.5,26,20,50,5',
  ];

  for (const line of csvLines) {
    agg.ingestCsvLineSlice(line, 0, line.length, cols);
  }

  const dataset = agg.finalize('multi_year.csv');
  assert.equal(dataset.totalRowsProcessed, 4);
  assert.deepEqual(dataset.quartersAvailable, ['2020-Q1', '2026-Q4']);

  const q2020 = dataset.byQuarter['2020-Q1']!;
  assert.equal(q2020.totalWorkers, 3);
  assert.equal(q2020.bottleneckStageId, 'CD4');
  assert.equal(q2020.financials.unitSellingPrice, 108000);
  assert.ok(q2020.financials.realizedRevenueVnd > 0);

  const cd4Q2026 = dataset.byQuarter['2026-Q4']!.stages.find(
    (s) => s.id === 'CD4'
  )!;
  assert.equal(cd4Q2026.isHighDefectStage, true);
  assert.equal(cd4Q2026.teams[0].outlierWorkers[0].workerId, 'CN-047');

  // Combined all-quarters summary must keep CD1 (from 2020-Q1) and CD4 (merged)
  assert.equal(dataset.allQuartersSummary.stages.length, 2);
  assert.equal(dataset.allQuartersSummary.totalWorkers, 3);
  assert.equal(dataset.historicalSeries.length, 2);
});
