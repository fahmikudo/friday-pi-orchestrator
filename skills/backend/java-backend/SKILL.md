---
name: java-backend
description: "Implements maintainable Java backend code with clear domain/application boundaries, null handling, exceptions, testing, and concurrency awareness. Use for framework-neutral Java backend code."
---

# java-backend

## Purpose

Produce clear Java that fits the project's configured Java version and conventions.

## Use When

- Java domain/application code
- Java library
- framework-neutral backend logic
- JUnit tests

## Do Not Use When

- non-Java
- Spring-specific concerns better handled with spring-boot-backend

## Required Inputs

- Java version/build tool
- architecture
- test/lint commands
- error/nullability conventions

## Operating Rules

- Use only language features supported by configured Java version.
- Prefer constructor-established valid state.
- Avoid exception taxonomy churn.
- Use immutable value/data types when useful.
- Avoid reflection/magic when explicit code is clearer.

## Workflow

1. Inspect build/Java version.
2. Identify responsibility.
3. Implement smallest cohesive design.
4. Add/adjust JUnit tests.
5. Run formatter/static analysis if configured.
6. Run focused/regression tests.

## Required Evidence

- Java version
- test results
- static analysis
- exception/nullability review

## Quality Gates

- [ ] Build passes.
- [ ] Tests pass.
- [ ] No unsupported features.
- [ ] Invariants/null handling explicit.
- [ ] Exceptions fit conventions.

## Output Contract

- Classes/packages
- Design
- Tests
- Static checks
- Compatibility

Do not claim completion without the required evidence.

## References

- Java docs: https://docs.oracle.com/en/java/
- Java Language Specification: https://docs.oracle.com/javase/specs/
- JUnit 5 User Guide: https://junit.org/junit5/docs/current/user-guide/
