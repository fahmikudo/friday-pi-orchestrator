---
name: spring-boot-backend
description: "Implements Spring Boot features with thin controllers, constructor injection, explicit transactions, validation, exception mapping, configuration, persistence adapters, and focused tests."
---

# spring-boot-backend

## Purpose

Use Spring to reduce infrastructure code without moving business rules into controllers/annotations.

## Use When

- Spring MVC/WebFlux as used by project
- Spring Data
- transactions
- configuration
- Spring tests

## Do Not Use When

- framework-neutral Java logic where Spring adds no value

## Required Inputs

- Spring Boot version
- package/module architecture
- persistence/security stack
- test conventions

## Operating Rules

- Use constructor injection.
- Keep controllers thin.
- Transactions belong at intentional application/service boundaries.
- Do not expose persistence entities as API DTOs by accident.
- Use configuration properties.
- Choose slice/integration tests intentionally.

## Workflow

1. Inspect Boot version/dependencies.
2. Map controller/application/domain responsibilities.
3. Define validation/error mapping.
4. Define transaction boundary.
5. Implement adapter.
6. Add unit/slice/integration tests.
7. Run build/tests.

## Required Evidence

- responsibility map
- transaction rationale
- validation/error mapping
- test level rationale
- build/test evidence

## Quality Gates

- [ ] No field injection.
- [ ] Business rules not trapped in controller.
- [ ] Transactions short/explicit.
- [ ] DTO/entity boundary intentional.
- [ ] Tests pass.

## Output Contract

- Layer responsibilities
- Transactions
- Validation/errors
- Tests
- Configuration

Do not claim completion without the required evidence.

## References

- Spring Boot Reference: https://docs.spring.io/spring-boot/
- Spring Framework Reference: https://docs.spring.io/spring-framework/reference/
- Spring Testing: https://docs.spring.io/spring-framework/reference/testing.html
- Java docs: https://docs.oracle.com/en/java/
- Java Language Specification: https://docs.oracle.com/javase/specs/
- JUnit 5 User Guide: https://junit.org/junit5/docs/current/user-guide/
