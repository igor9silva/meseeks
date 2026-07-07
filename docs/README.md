# Documentation

This directory is the canonical technical documentation.

The docs here describe the production architecture and the reasons behind it. They are written primarily for future maintainers, OSS consumers, and AI agents, so they favor completeness, precise boundaries, and implementation consequences over brevity.

## Rules

Docs must never drift from reality.

Every substantial implementation round starts by reading the entire `docs/` tree. Every substantial implementation round ends with a full documentation pass over the entire `docs/` tree.

Targeted searches are useful, but they are not enough to prove the docs are conflict-free.

Writing docs first is allowed when the matching implementation lands in the same round. If a document describes planned behavior that is not implemented yet, it must say so clearly.

## Map

- [Architecture](./architecture.md) defines the core system model and boundaries.
- [Data Model](./data-model.md) defines the canonical durable tables and relationships.
- [Vocabulary](./vocabulary.md) defines product and technical terms.
- [Decisions](./decisions.md) records durable decisions with rationale.
- [Debts](./debts.md) records known technical debts and missing production hardening.

## Scope

These docs describe the product architecture. They are not a project plan, migration log, branch diary, or task tracker.

Implementation plans and temporary rebuild notes belong outside `docs/`.
