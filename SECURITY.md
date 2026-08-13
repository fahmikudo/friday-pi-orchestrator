# Security Policy

Friday Pi Orchestrator is a Pi extension package and therefore executes with the permissions of the local Pi process.

## Friday security boundaries

Friday is designed to:

- never read, write, or migrate Pi provider credentials;
- never modify `~/.pi/agent/auth.json`;
- serialize durable `.pi-work` mutations;
- block direct model write/edit access to `.pi-work`;
- block mutating shell commands targeting `.pi-work`;
- block product mutation outside IMPLEMENT while governed work is active;
- require an explicit human approval command for the APPROVE gate;
- preserve failed/rejected evidence rather than erase audit history;
- preserve `.pi-work` during uninstall.

## What Friday does not sandbox

Friday is not an operating-system sandbox. Pi, installed extensions, skills, and agent tools still run under the local user's OS permissions.

Use containers, restricted credentials, test environments, or other OS/runtime controls for stronger isolation.

## Destructive actions

Friday's engineering policy expects explicit human authorization before operations such as:

- git push / force push;
- merge;
- deployment;
- destructive database operations;
- production infrastructure deletion;
- credential rotation;
- release publication.

Project/global Pi instructions should retain these safety rules.

## Third-party packages

Review the source of Pi packages before installing them. Friday optionally integrates with `@gotgenes/pi-subagents`; that package is installed and updated separately.

## Reporting

For a public GitHub repository, report suspected vulnerabilities privately to the repository owner rather than opening an issue containing exploitable details.
