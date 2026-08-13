---
name: event-driven-design
description: "Designs events, outbox delivery, consumers, idempotency, ordering, retries, and failure handling. Use for asynchronous workflows and durable event integration."
---

# event-driven-design

## Purpose

Use events for valuable temporal decoupling without hidden distributed transactions.

## Use When

- outbox/event log
- async integration
- cross-module notification
- background workflow
- message broker

## Do Not Use When

- simple synchronous calls where async adds no value

## Required Inputs

- business transition
- consumers
- delivery infrastructure
- consistency requirements

## Operating Rules

- Events describe facts.
- Do not hide unclear ownership behind events.
- Assume duplicate delivery unless guaranteed otherwise.
- Consumers must be idempotent where needed.
- Ordering guarantees must be scoped.

## Workflow

1. Name past-tense event.
2. Define producer owner.
3. Define immutable/versioned payload.
4. Define outbox/delivery transaction.
5. Define consumer idempotency.
6. Define retries/dead-letter.
7. Define ordering/observability.

## Required Evidence

- event schema
- producer/consumer ownership
- outbox boundary
- idempotency
- retry/dead-letter

## Quality Gates

- [ ] Event meaning stable.
- [ ] Duplicate delivery safe.
- [ ] Failure/retry explicit.
- [ ] No accidental distributed transaction.

## Output Contract

- Event
- Producer
- Payload
- Consumers
- Delivery
- Idempotency
- Failure handling

Do not claim completion without the required evidence.

## References

- Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Enterprise Integration Patterns: https://www.enterpriseintegrationpatterns.com/
