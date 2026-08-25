# MergePilot Verification Record

The final MVP was verified on **August 25, 2026**. The analysis pipeline was exercised through the live application procedure using the disposable `demo://mergepilot` repository. It detected one semantic conflict in `calculateTotal`, generated five candidate strategies, recorded validation evidence, automatically rejected unsafe candidates, and persisted the resulting audit record.

| Verification area | Evidence | Result |
|---|---|---|
| Python core workflow | `python3 -m unittest tests.test_engines tests.test_core_workflow` | 7 tests passed, covering AST signals, classification, candidates, scoring, automatic rejection, LLM-disabled safety, and end-to-end demo orchestration. |
| Type safety | `pnpm check` | Passed. |
| Application tests | `pnpm test` | 2 Vitest files passed, including the Python orchestration bridge. |
| Live analysis procedure | Typed application request against `mergepilot.analyze` | Completed successfully with one conflict, five candidate strategies, passed candidates, and rejected candidates. |
| Patch retrieval | Typed `mergepilot.patch` procedure | Returned the persisted patch record for the requested candidate. |
| Persistence | Typed `mergepilot.history` procedure | Returned recorded demo analyses and branch metadata. |
| Desktop workspace | 1280 × 720 full-page inspection | Blueprint grid, editable input controls, card hierarchy, and empty states rendered without visible overlap. |
| Mobile workspace | 375 × 812 full-page inspection | Input controls, metrics, conflict state, candidates, and evidence panels stack in a readable single-column flow. |
| Interactive workspace | Rendered-browser flow | Selected and restored the validation profile, ran the demo analysis, selected the source-preserving candidate, viewed its unified diff, reran isolated validation, exported its patch, and recorded it as apply-ready. |
| Interactive audit ledger | Rendered-browser flow | Opened the Resolution Ledger and confirmed that completed analyses were present with branch path, conflict count, validation status, and timestamp. |

The dashboard remains intentionally conservative around test execution. Repository paths must remain inside the configured approved workspace root, and validation commands are selected from a small allow-list rather than accepted as arbitrary browser input.

## Demo repository lifecycle regression

The demo repository resolver now trims browser input and accepts a normalized demo alias, including the trailing-slash form `demo://mergepilot/`. It creates and verifies the disposable Git working tree before repository inspection begins. The regression suite passed with **8 Python tests**, two Vitest files, and TypeScript checking. A rendered-browser run using the normalized trailing-slash identifier completed with one detected semantic conflict and five candidate strategies, without the previous “initialized Git working tree” error.

The Demo action now also sends an explicit `demoMode` flag across the React client, typed API bridge, Python CLI, and orchestrator. A final rendered-browser run at `/?from_webdev=1` deliberately set the visible repository input to `/definitely/not/a/repository`; the Demo action still created a verified disposable Git repository and completed the analysis with one semantic conflict and five candidates. This confirms a browser path can no longer reach Git inspection during demo mode.

The live typed analysis response now exposes `repositoryPath: "demo://mergepilot"` and `executionMode: "demo-disposable"` when `demoMode` is active, even if the request visibly carries an invalid path. The final regression run passed **9 Python tests**, TypeScript checking, and the application test suite.
