import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSampleSmeDataset,
  computeVerificationMetrics,
  normalizeOptimizedStages,
} from './simulationEngine';

test('buildSampleSmeDataset creates 76 SME workers across 7 years (28 quarters), 6 stages, and 12 teams', () => {
  const dataset = buildSampleSmeDataset();
  assert.equal(dataset.quartersAvailable.length, 28);
  assert.equal(dataset.quartersAvailable[0], '2020-Q1');
  assert.equal(dataset.quartersAvailable[27], '2026-Q4');
  assert.equal(dataset.totalRowsProcessed, 76 * 28);
  assert.equal(dataset.allQuartersSummary.totalWorkers, 76);
  assert.equal(dataset.allQuartersSummary.stages.length, 6);
  assert.equal(dataset.historicalSeries.length, 28);

  const q2026Q4 = dataset.byQuarter['2026-Q4']!;
  assert.equal(q2026Q4.bottleneckStageId, 'CD4');
  const cd4 = q2026Q4.stages.find((s) => s.id === 'CD4')!;
  assert.equal(cd4.isBottleneck, true);
  assert.equal(cd4.isHighDefectStage, true);
  assert.ok(cd4.teams.length === 2);

  const team4B = cd4.teams.find((t) => t.teamName === 'Tổ 4B')!;
  assert.ok(team4B.outlierWorkers.some((w) => w.workerId === 'CN-047'));
});

test('normalizeOptimizedStages enforces realistic 70% efficiency cap and computes defect & cost reductions', () => {
  const dataset = buildSampleSmeDataset();
  const before = dataset.byQuarter['2026-Q4']!;

  const after = normalizeOptimizedStages(before, [
    { id: 'CD1', SoLaoDong: 8, TG_SMV: 0.8, HieuSuat_TB: 64, TyLeLoi: 1.4, WIP: 14 },
    { id: 'CD2', SoLaoDong: 12, TG_SMV: 1.4, HieuSuat_TB: 95, TyLeLoi: 1.6, WIP: 22 },
    { id: 'CD3', SoLaoDong: 11, TG_SMV: 1.2, HieuSuat_TB: 62, TyLeLoi: 1.4, WIP: 18 },
    { id: 'CD4', SoLaoDong: 18, TG_SMV: 2.0, HieuSuat_TB: 60, TyLeLoi: 1.5, WIP: 28 },
    { id: 'CD5', SoLaoDong: 10, TG_SMV: 1.0, HieuSuat_TB: 60, TyLeLoi: 1.4, WIP: 12 },
    { id: 'CD6', SoLaoDong: 10, TG_SMV: 0.7, HieuSuat_TB: 62, TyLeLoi: 1.1, WIP: 10 },
  ]);

  const cd2 = after.stages.find((s) => s.id === 'CD2')!;
  assert.equal(cd2.HieuSuat_TB, 70);
  assert.ok(after.totalWorkers <= before.totalWorkers);

  const verification = computeVerificationMetrics(before, after, 3.5);
  assert.ok(verification.afterThroughput > verification.beforeThroughput);
  assert.ok(verification.defectRateReductionPct > 0);
  assert.ok(verification.unitCostReductionPct > 0);
});
