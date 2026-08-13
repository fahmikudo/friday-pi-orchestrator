# Contributing

## Development setup

```bash
npm test
python3 scripts/validate_skills.py
npm run check
```

Run TypeScript verification with the release tsconfig before proposing a release.

## Architectural constraints

Changes should preserve:

- `.pi-work` as durable execution state;
- human APPROVE authority;
- evidence-driven transitions;
- provider/model-independent work state;
- backward compatibility unless a migration is explicitly designed;
- thin logical agents and composable skills;
- no direct state repair through arbitrary file edits.

## Adding workflow behavior

Add regression tests for:

- legal transition;
- illegal transition;
- recovery path;
- durable journal/artifact consequence;
- upgrade/backward-compatibility effect.

## Adding a skill

Every skill should contain valid YAML frontmatter and measurable sections for workflow/evidence/quality gates. Run:

```bash
python3 scripts/validate_skills.py
```

## Release rule

Do not publish a release with failing tests, invalid skill YAML, mixed helper module versions, or an installer that mutates project `.pi-work` state.
