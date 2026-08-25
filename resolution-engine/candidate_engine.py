from __future__ import annotations

import re

from llm_proposer import propose_resolution


def _naive_combination(conflict_content: str) -> str:
    pattern = re.compile(
        r"<<<<<<<[^\n]*\n(?P<target>.*?)\n\|\|\|\|\|\|\|[^\n]*\n.*?\n=======\n(?P<source>.*?)\n>>>>>>>[^\n]*",
        re.DOTALL,
    )

    def replace(match: re.Match) -> str:
        target_lines = match.group("target").splitlines()
        source_lines = match.group("source").splitlines()
        return "\n".join(target_lines + source_lines)

    return pattern.sub(replace, conflict_content)


def generate_candidates(conflict_file, ast_analysis: dict, classification: dict, patch_builder) -> list[dict]:
    candidates = [
        {
            "strategy": "base-preserving",
            "label": "Restore merge-base behavior",
            "content": conflict_file.base_content,
            "explanation": "Restores the common ancestor implementation. This is useful as a conservative rollback candidate, but omits both branch changes.",
            "semanticImpact": "Reverts the affected area to its last mutually agreed behavior and drops both branch-specific changes.",
        },
        {
            "strategy": "target-preserving",
            "label": "Preserve target branch behavior",
            "content": conflict_file.target_content,
            "explanation": "Uses the target branch version without transformation. This minimizes accidental edits but discards incoming changes.",
            "semanticImpact": "Keeps the target implementation and omits the source branch behavior.",
        },
        {
            "strategy": "source-preserving",
            "label": "Adopt source branch behavior",
            "content": conflict_file.source_content,
            "explanation": "Uses the source branch version without transformation. This preserves incoming work but replaces target-side behavior.",
            "semanticImpact": "Keeps the source implementation and omits the target branch behavior.",
        },
        {
            "strategy": "deterministic-combination",
            "label": "Deterministic line composition",
            "content": _naive_combination(conflict_file.conflict_content),
            "explanation": "Combines distinct conflict lines only once. It is intentionally conservative and must pass validation before it can be selected.",
            "semanticImpact": "Attempts to preserve both edit sets, but may create duplicate declarations or incompatible control flow.",
        },
        {
            "strategy": "manual-review-template",
            "label": "Manual merge review template",
            "content": conflict_file.conflict_content,
            "explanation": "Preserves the diff3 markers as a review template. It is never apply-ready until an engineer edits the conflict and passes validation.",
            "semanticImpact": "Makes competing target, base, and source intent explicit for manual reconciliation rather than choosing a branch automatically.",
        },
    ]

    llm_candidate = propose_resolution(conflict_file, classification)
    if llm_candidate:
        candidates.append(llm_candidate)

    for candidate in candidates:
        candidate["patch"] = patch_builder(
            conflict_file.path,
            conflict_file.target_content,
            candidate["content"],
        )
        candidate["astSignals"] = {
            "language": ast_analysis["language"],
            "affectedSymbols": ast_analysis["affectedSymbols"],
            "classification": classification["classification"],
        }
    return candidates
