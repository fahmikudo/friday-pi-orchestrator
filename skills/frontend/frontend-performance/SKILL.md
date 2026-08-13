---
name: frontend-performance
description: "Measures and improves frontend rendering, bundle, network, and interaction performance. Use for slow pages, render churn, large lists, or network waterfalls."
---

# frontend-performance

## Purpose

Optimize measured bottlenecks while preserving correctness and maintainability.

## Use When

- slow page
- large bundle
- render churn
- large list
- network waterfall

## Do Not Use When

- premature micro-optimization

## Required Inputs

- symptom/metric
- browser/tool data
- build tooling
- critical path

## Operating Rules

- Measure first.
- Do not memoize everything.
- Reduce work/data before clever caching.
- Separate network/rendering.
- Document complexity tradeoff.

## Workflow

1. Define target.
2. Capture baseline.
3. Locate bottleneck.
4. Apply smallest high-impact change.
5. Re-measure.
6. Run behavior regression.

## Required Evidence

- baseline
- bottleneck evidence
- after measurement
- regression result

## Quality Gates

- [ ] Metric improves materially or optimization rejected.
- [ ] Correctness unchanged.
- [ ] Complexity justified.

## Output Contract

- Baseline
- Bottleneck
- Change
- After
- Tradeoffs

Do not claim completion without the required evidence.

## References

- web.dev performance: https://web.dev/learn/performance/
