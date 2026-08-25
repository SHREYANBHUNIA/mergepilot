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
