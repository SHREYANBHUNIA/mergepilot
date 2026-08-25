# MergePilot

MergePilot is an autonomous Git conflict-resolution workspace that treats a merge conflict as an engineering decision rather than a text-selection prompt. The platform reads a repository branch graph, isolates conflict-prone files, maps syntax trees and affected symbols, generates competing resolution candidates, validates each candidate in a disposable worktree, and records the result in an auditable ledger.

> **Safety boundary:** MergePilot does not auto-apply a proposal. A candidate can become apply-ready only after AST-aware scoring and an allow-listed isolated validation command. Candidates that fail validation are rejected automatically.

## Demonstration workflow

The dashboard includes a complete disposable demo repository. It creates a semantic conflict in `calculateTotal`, where one branch introduces volume discounts and another applies sales tax. Running **Demo analysis** executes the entire workflow, produces three deterministic candidates, rejects the unsafe composition through the configured test command, and persists the analysis and evidence.

| Stage | Implementation | Outcome |
|---|---|---|
| Repository inspection | `git-engine/repository_engine.py` using GitPython and `git merge-file --diff3` | Branch metadata, merge-base, changed files, and concrete conflict regions. |
| AST inspection | `ast-engine/syntax_engine.py` using Tree-sitter | Language, parse signal, affected declarations, and risk factors. |
| Classification | `conflict-detector/detector.py` | Syntactic versus semantic risk classification. |
| Candidate generation | `resolution-engine/candidate_engine.py` | Target-preserving, source-preserving, deterministic-combination, and optional LLM-assisted proposals. |
| Validation | `validation/runner.py` | Allow-listed checks run against a disposable Git worktree with a 45-second timeout. |
| Ranking | `ranking/scorer.py` | AST, semantic-policy, and validation signals convert into a score and a recommended/review/rejected decision. |
| Audit ledger | `drizzle/schema.ts` and `server/mergepilot.db.ts` | Analyses, conflicts, candidates, validation evidence, and selection events are persisted. |

## Project structure

```text
mergepilot/
├── git-engine/             # GitPython repository and isolated-worktree operations
├── ast-engine/             # Tree-sitter syntax and symbol extraction
├── conflict-detector/      # Conflict classification and risk reporting
├── resolution-engine/      # Deterministic and optional LLM-backed candidate proposals
├── validation/             # Allow-listed isolated test profiles
├── ranking/                # Candidate scoring and rejection policy
├── api/                    # FastAPI-compatible Python core API and CLI boundary
├── server/                 # Typed application procedures, database persistence, Python bridge
├── client/                 # React blueprint dashboard and analysis workspace
├── drizzle/                # Audit-ledger schema and migration
└── tests/                  # End-to-end Python core workflow coverage
```

## Runtime design

The live dashboard calls a typed application procedure that launches the Python core through `api/cli.py`. The same core is exposed as a FastAPI-compatible application in `api/main.py` for deployments that run the Python service directly. The current managed project persistence layer stores audit data in the provisioned application database; the Python service is deliberately database-agnostic and can be connected to a PostgreSQL adapter through environment configuration in a standalone deployment.

Optional LLM assistance is intentionally opt-in. Set `MERGEPILOT_LLM_URL` to an approved OpenAI-compatible or local endpoint, and, if required, `MERGEPILOT_LLM_API_KEY` and `MERGEPILOT_LLM_MODEL`. The adapter accepts only JSON candidate proposals and routes them through exactly the same AST analysis, scoring, and isolated validation workflow as deterministic candidates.

## Validation profile policy

The initial MVP accepts a small explicit profile list rather than browser-supplied shell strings. This prevents a repository input from turning into arbitrary command execution.

| Profile | Command | Intended use |
|---|---|---|
| `demo-node` | `node tests/conflict-test.cjs` | The included merge-resolution demonstration. |
| `python-unit` | `python3 -m unittest` | Python projects with standard library unit tests. |
| `none` | `true` | Read-only analysis when the operator explicitly elects not to execute a test. |

## Local verification

```bash
python3 -m unittest tests.test_core_workflow
pnpm check
pnpm test
```

The Python workflow test verifies semantic conflict detection and rejection of a validation-breaking candidate. The Vitest suite verifies the typed Python orchestration bridge and existing session behavior.
