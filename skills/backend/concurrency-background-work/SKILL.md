---
name: concurrency-background-work
description: "Designs concurrency and background processing with ownership, cancellation, backpressure, shutdown, and error propagation. Use for goroutines, executors, async workers, schedulers, and queues."
---

# concurrency-background-work

## Purpose

Prevent leaked workers, uncontrolled parallelism, and shutdown/data-loss bugs.

## Use When

- background worker
- scheduler
- parallel processing
- async job
- fan-out/fan-in

## Do Not Use When

- simple synchronous request flow

## Required Inputs

- producer/consumer behavior
- throughput need
- shutdown semantics
- retry requirements

## Operating Rules

- Every worker has owner and stop condition.
- Concurrency is bounded unless justified.
- Cancellation/timeouts propagate.
- Backpressure is explicit.
- Shutdown defines in-flight behavior.

## Workflow

1. Define lifecycle owner.
2. Set concurrency bound.
3. Define queue/backpressure.
4. Define cancellation/timeouts.
5. Define errors/retry.
6. Define graceful shutdown.
7. Add race/concurrency tests where supported.

## Required Evidence

- worker lifecycle
- concurrency bound
- cancellation
- shutdown evidence
- race/concurrency test

## Quality Gates

- [ ] No orphaned worker.
- [ ] No unexplained unbounded concurrency.
- [ ] Shutdown deterministic.
- [ ] Errors do not disappear.

## Output Contract

- Worker model
- Ownership
- Cancellation
- Backpressure
- Failure
- Shutdown
- Tests

Do not claim completion without the required evidence.

## References

- Go pipelines: https://go.dev/blog/pipelines
- Java Concurrency in Practice.
- Node event loop: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
