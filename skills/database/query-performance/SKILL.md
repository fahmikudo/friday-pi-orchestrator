---
name: query-performance
description: "Analyzes SQL performance using execution plans, cardinality, indexes, query shape, N+1 detection, and pagination strategy."
---

# query-performance

## Purpose

Optimize actual workload based on evidence instead of adding indexes reflexively.

## Use When

- slow SQL
- high DB latency
- N+1
- large pagination
- high-volume query

## Do Not Use When

- tiny low-frequency query

## Required Inputs

- query
- schema/indexes
- representative cardinality
- EXPLAIN capability

## Operating Rules

- Measure before/after.
- Indexes have write/storage cost.
- Use plan evidence.
- Pagination must fit ordering/cardinality.

## Workflow

1. Capture baseline.
2. Run EXPLAIN/ANALYZE safely.
3. Identify bottleneck.
4. Evaluate rewrite/index.
5. Apply smallest change.
6. Re-measure.
7. Check write tradeoff.

## Required Evidence

- baseline plan
- after plan
- change
- measured improvement
- tradeoff

## Quality Gates

- [ ] Plan supports expected access.
- [ ] Relevant metric improves.
- [ ] Index justified.
- [ ] Correctness/order unchanged.

## Output Contract

- Query
- Baseline
- Finding
- Change
- After
- Tradeoff

Do not claim completion without the required evidence.

## References

- PostgreSQL EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
