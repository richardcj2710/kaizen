import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSampleSmeDataset } from './simulationEngine';
import {
  autoOptimizeHumanCenteredPlan,
  simulateMarketBaseline,
} from './profitPredictor';

test('simulateMarketBaseline enforces Sellable_Output = min(Good_Output, Market_Order_Demand)', () => {
  const dataset = buildSampleSmeDataset();
  const q2026Q4 = dataset.byQuarter['2026-Q4']!;

  // Extreme downturn: demand drops far below Good_Output -> Sellable_Output capped by demand
  const downturnFin = simulateMarketBaseline(q2026Q4, {
    demandDeltaPct: -70,
    priceDeltaPct: 0,
    kaizenBudgetVnd: 0,
  });
  assert.equal(
    downturnFin.sellableOutputUnits,
    Math.min(downturnFin.goodOutputUnits, downturnFin.marketOrderDemand)
  );
  assert.ok(downturnFin.sellableOutputUnits <= downturnFin.marketOrderDemand);
  assert.equal(
    downturnFin.netProfitVnd,
    downturnFin.realizedRevenueVnd - downturnFin.totalOperatingCostVnd
  );
});

test('autoOptimizeHumanCenteredPlan unlocks bottleneck revenue in demand surge and protects workers in downturn', () => {
  const dataset = buildSampleSmeDataset();
  const q2026Q4 = dataset.byQuarter['2026-Q4']!;

  // 1. Demand Surge (+25%)
  const surgePlan = autoOptimizeHumanCenteredPlan(
    q2026Q4,
    {
      demandDeltaPct: 25,
      priceDeltaPct: 5,
      kaizenBudgetVnd: 65_000_000,
    },
    dataset.historicalSeries
  );
  assert.equal(surgePlan.regime, 'demand_surge');
  assert.ok(
    surgePlan.afterSummary.hourlyLineThroughput >
      surgePlan.beforeSummary.hourlyLineThroughput
  );
  assert.ok(
    surgePlan.afterFinancials.realizedRevenueVnd >
      surgePlan.beforeFinancials.realizedRevenueVnd
  );
  assert.ok(
    surgePlan.afterFinancials.netProfitVnd >
      surgePlan.beforeFinancials.netProfitVnd
  );
  assert.ok(surgePlan.retention.reallocatedCrossTeamWorkers > 0);
  assert.ok(surgePlan.retention.humanCenteredIndexPct >= 95);

  // 2. Market Downturn (-30%)
  const q2023Q2 = dataset.byQuarter['2023-Q2']!;
  const downturnPlan = autoOptimizeHumanCenteredPlan(
    q2023Q2,
    {
      demandDeltaPct: -30,
      priceDeltaPct: -10,
      kaizenBudgetVnd: 20_000_000,
    },
    dataset.historicalSeries
  );
  assert.equal(downturnPlan.regime, 'market_downturn');
  assert.ok(
    downturnPlan.afterFinancials.defectLossVnd <
      downturnPlan.beforeFinancials.defectLossVnd
  );
  assert.ok(
    downturnPlan.afterFinancials.netProfitVnd >=
      downturnPlan.beforeFinancials.netProfitVnd
  );
  assert.ok(downturnPlan.retention.humanCenteredIndexPct >= 95);
  assert.ok(
    downturnPlan.trendWithForecast.length === dataset.historicalSeries.length + 1
  );
});
