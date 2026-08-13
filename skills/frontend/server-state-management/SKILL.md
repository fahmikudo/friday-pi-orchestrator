---
name: server-state-management
description: "Designs client-side fetching, caching, invalidation, pagination, optimistic updates, and remote-data error/loading behavior. Use with TanStack Query or equivalent tooling."
---

# server-state-management

## Purpose

Make server data identity and freshness explicit instead of copying API data into local/global state.

## Use When

- data fetching
- mutations
- cache invalidation
- pagination
- optimistic update

## Do Not Use When

- pure local UI state

## Required Inputs

- API contract
- query/cache library
- freshness needs
- mutation effects

## Operating Rules

- Stable query identity.
- Precise invalidation/update.
- Optimistic updates need rollback.
- Do not duplicate server state without reason.
- Loading/error/empty/refetch are distinct.

## Workflow

1. Define query identity.
2. Define freshness/cache policy.
3. Define mutation effects.
4. Choose invalidation vs cache update.
5. Define optimism if valuable.
6. Define pagination.
7. Test key transitions.

## Required Evidence

- query keys
- mutation map
- rollback if optimistic
- loading/error behavior
- tests

## Quality Gates

- [ ] No duplicate cache owner.
- [ ] Mutation leads to correct visible state.
- [ ] Optimistic failure rolls back.
- [ ] Pagination identity stable.

## Output Contract

- Queries
- Keys
- Mutations
- Invalidation
- Optimism
- Pagination
- Tests

Do not claim completion without the required evidence.

## References

- TanStack Query: https://tanstack.com/query/latest
