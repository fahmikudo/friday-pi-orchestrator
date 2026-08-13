---
name: idempotency-reliability
description: "Designs idempotency, retries, timeouts, duplicate handling, and safe replay for commands, webhooks, workers, and external integrations."
---

# idempotency-reliability

## Purpose

Make repeated delivery and retries safe, bounded, and observable.

## Use When

- webhooks
- message consumers
- payment/order-like mutation
- scheduled job
- external API command

## Do Not Use When

- read-only operations without side effects

## Required Inputs

- operation identity
- side effects
- retry source
- storage options

## Operating Rules

- Retries need bounded timeout/backoff.
- Idempotency identity must be stable.
- Duplicate detection is not the same as completion.
- Persist durable state before acknowledging when needed.

## Workflow

1. Define duplicate/retry scenarios.
2. Choose idempotency key.
3. Define state/storage.
4. Define concurrency behavior.
5. Define timeout/backoff.
6. Define replay result.
7. Add duplicate/retry tests.

## Required Evidence

- idempotency key
- state transition
- retry policy
- concurrent duplicate test
- replay behavior

## Quality Gates

- [ ] Concurrent duplicates cannot double-apply.
- [ ] Retries bounded.
- [ ] Repeat-success result defined.
- [ ] Partial failures recoverable.

## Output Contract

- Idempotency contract
- State model
- Retry policy
- Concurrency
- Tests

Do not claim completion without the required evidence.

## References

- AWS Builders' Library — Timeouts/retries/backoff: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
