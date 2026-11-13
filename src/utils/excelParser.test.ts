import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_POLO_LINE } from './simulation';
import { buildSampleWorkbookBytes, parseWorkbookBuffer } from './excelParser';

test('parseWorkbookBuffer round-trips generated xlsx workbook accurately', () => {
  const bytes = buildSampleWorkbookBytes(SAMPLE_POLO_LINE);
  const parsed = parseWorkbookBuffer(bytes);

  assert.equal(parsed.length, SAMPLE_POLO_LINE.length);
  assert.deepEqual(parsed[0], SAMPLE_POLO_LINE[0]);
  assert.deepEqual(parsed[3], SAMPLE_POLO_LINE[3]);
});

test('parseWorkbookBuffer parses CSV bytes with standard headers', () => {
  const csv = [
    'id,TenCongDoan,SoLaoDong,TG_SMV,WIP,Luong_Thang,GiaiPhap_KyThuat,ChiPhi_ThietBi',
    'ST1,May cổ áo,2,1.2,14,8000000,Gá cữ may,5000000',
    'ST2,Đóng gói,1,0.5,4,7000000,Không,0',
  ].join('\n');

  const encoder = new TextEncoder();
  const parsed = parseWorkbookBuffer(encoder.encode(csv));

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, 'ST1');
  assert.equal(parsed[0].TenCongDoan, 'May cổ áo');
  assert.equal(parsed[0].SoLaoDong, 2);
  assert.equal(parsed[0].TG_SMV, 1.2);
  assert.equal(parsed[0].WIP, 14);
  assert.equal(parsed[0].ChiPhi_ThietBi, 5000000);
});

test('parseWorkbookBuffer throws descriptive error on missing TenCongDoan', () => {
  const csv = 'id,SoLaoDong,TG_SMV\nCD1,2,1.0';
  const encoder = new TextEncoder();
  assert.throws(() => parseWorkbookBuffer(encoder.encode(csv)), /TenCongDoan/);
});
