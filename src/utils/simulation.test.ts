import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_POLO_LINE,
  calculateStationCapacity,
  computeVerificationMetrics,
  enforceZeroLayoffInvariant,
  simulateLine,
} from './simulation';

test('calculateStationCapacity applies (SoLaoDong * 60) / TG_SMV rounded', () => {
  assert.equal(calculateStationCapacity(2, 0.8), 150);
  assert.equal(calculateStationCapacity(3, 1.4), 129);
  assert.equal(calculateStationCapacity(4, 1.2), 200);
  assert.equal(calculateStationCapacity(1, 2.5), 24);
  assert.equal(calculateStationCapacity(3, 1.0), 180);
  assert.equal(calculateStationCapacity(2, 0.7), 171);
  assert.equal(calculateStationCapacity(0, 1.0), 0);
  assert.equal(calculateStationCapacity(2, 0), 0);
});

test('simulateLine identifies CD4 as bottleneck in sample Polo line', () => {
  const result = simulateLine(SAMPLE_POLO_LINE);

  assert.equal(result.bottleneckId, 'CD4');
  assert.equal(result.lineThroughput, 24);
  assert.equal(result.totalWorkers, 15);
  assert.equal(result.totalWip, 153);
  assert.equal(result.stations.filter((s) => s.isBottleneck).length, 1);
  assert.equal(result.stations[3].isBottleneck, true);
});

test('enforceZeroLayoffInvariant preserves exact total worker count even if AI drifts', () => {
  const driftedAiStations = [
    { id: 'CD1', SoLaoDong: 1, TG_SMV: 0.8, WIP: 10 },
    { id: 'CD2', SoLaoDong: 2, TG_SMV: 1.4, WIP: 12 },
    { id: 'CD3', SoLaoDong: 2, TG_SMV: 1.2, WIP: 12 },
    { id: 'CD4', SoLaoDong: 3, TG_SMV: 1.2, WIP: 20 },
    { id: 'CD5', SoLaoDong: 2, TG_SMV: 1.0, WIP: 8 },
    { id: 'CD6', SoLaoDong: 2, TG_SMV: 0.7, WIP: 5 },
  ]; // sums to 12 instead of 15

  const normalized = enforceZeroLayoffInvariant(SAMPLE_POLO_LINE, driftedAiStations);
  const totalAfter = normalized.reduce((sum, s) => sum + s.SoLaoDong, 0);

  assert.equal(totalAfter, 15);
  assert.ok(normalized.every((s) => s.SoLaoDong >= 1));
});

test('computeVerificationMetrics computes throughput increase, WIP reduction, and 0% layoff verification', () => {
  const afterStations = enforceZeroLayoffInvariant(SAMPLE_POLO_LINE, [
    { id: 'CD1', SoLaoDong: 2, TG_SMV: 0.8, WIP: 10 },
    { id: 'CD2', SoLaoDong: 3, TG_SMV: 1.4, WIP: 12 },
    { id: 'CD3', SoLaoDong: 3, TG_SMV: 1.2, WIP: 12 },
    { id: 'CD4', SoLaoDong: 3, TG_SMV: 1.3, WIP: 18 },
    { id: 'CD5', SoLaoDong: 2, TG_SMV: 1.0, WIP: 8 },
    { id: 'CD6', SoLaoDong: 2, TG_SMV: 0.7, WIP: 5 },
  ]);

  const metrics = computeVerificationMetrics(SAMPLE_POLO_LINE, afterStations, 4.5);

  assert.equal(metrics.beforeThroughput, 24);
  assert.equal(metrics.afterThroughput, 120); // CD5: 2*60/1 = 120, CD6: 171, CD2: 129, CD4: 138, CD3: 150, CD1: 150
  assert.equal(metrics.throughputIncreasePct, 400);
  assert.equal(metrics.beforeTotalWip, 153);
  assert.equal(metrics.afterTotalWip, 65);
  assert.equal(metrics.wipReductionPct, 58);
  assert.equal(metrics.zeroLayoffVerified, true);
  assert.equal(metrics.estimatedRoiMonths, 4.5);
});
