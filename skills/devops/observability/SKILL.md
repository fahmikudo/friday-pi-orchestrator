---
name: observability
description: "Designs logs, metrics, traces, correlation, and alerts around operator/business questions and failure modes."
---

# observability

## Purpose

Make production behavior diagnosable without logging everything.

## Use When

- service/worker
- external integration
- critical workflow
- latency/reliability concern

## Do Not Use When

- static assets

## Required Inputs

- business operation
- failure modes
- observability stack
- SLO expectations

## Operating Rules

- Instrument questions, not libraries.
- Structured logs with context.
- Metrics bounded cardinality.
- Trace useful I/O boundaries.
- Alerts actionable.

## Workflow

1. List operator questions.
2. Define logs.
3. Define metrics/labels.
4. Define spans/correlation.
5. Define alerts/SLO signals.
6. Verify telemetry.

## Required Evidence

- log fields
- metrics
- trace points
- alert condition
- verification

## Quality Gates

- [ ] No sensitive/high-cardinality labels.
- [ ] Critical failures visible.
- [ ] Safe correlation context included where useful.

## Output Contract

- Questions
- Logs
- Metrics
- Traces
- Alerts
- Evidence

Do not claim completion without the required evidence.

## References

- OpenTelemetry docs: https://opentelemetry.io/docs/
- Google SRE Books: https://sre.google/books/
