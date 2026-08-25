from __future__ import annotations

import importlib
import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
for module_directory in [
    "git-engine",
    "ast-engine",
    "conflict-detector",
    "resolution-engine",
    "validation",
    "ranking",
]:
    sys.path.insert(0, str(ROOT / module_directory))

repository_engine = importlib.import_module("repository_engine")
syntax_engine = importlib.import_module("syntax_engine")
detector = importlib.import_module("detector")
candidate_engine = importlib.import_module("candidate_engine")
runner = importlib.import_module("runner")
scorer = importlib.import_module("scorer")

from demo_repository import create_demo_repository


DEMO_REPOSITORY_ALIASES = {"demo://mergepilot", "demo:/mergepilot", "mergepilot-demo"}


def _is_demo_repository_path(repository_path: str) -> bool:
    return repository_path.strip().rstrip("/") in DEMO_REPOSITORY_ALIASES


def _restrict_repository_path(repository_path: str) -> str:
    normalized_path = repository_path.strip()
    if _is_demo_repository_path(normalized_path):
        return "demo://mergepilot"
    allowed_root = Path(__import__("os").environ.get("MERGEPILOT_REPOSITORIES_ROOT", ROOT)).resolve()
    candidate = Path(normalized_path).expanduser().resolve()
    if allowed_root not in [candidate, *candidate.parents]:
        raise ValueError("Repository path is outside the configured approved workspace root.")
    return str(candidate)


def analyze_repository(repository_path: str, source_branch: str, target_branch: str, validation_profile: str = "demo-node") -> dict:
    cleanup = None
    try:
        restricted_path = _restrict_repository_path(repository_path)
        if _is_demo_repository_path(restricted_path):
            restricted_path, cleanup = create_demo_repository()
            source_branch = "feature/tax-aware-total"
            target_branch = "master"
            validation_profile = "demo-node"

        repository = repository_engine.inspect_repository(restricted_path, source_branch, target_branch)
        conflict_records = []
        for conflict in repository["conflicts"]:
            ast_analysis = syntax_engine.analyze_ast(
                conflict.path,
                conflict.conflict_content,
                conflict.target_content,
                conflict.source_content,
            )
            classification = detector.classify_conflict(ast_analysis)
            candidates = candidate_engine.generate_candidates(
                conflict,
                ast_analysis,
                classification,
                repository_engine.make_unified_patch,
            )
            candidate_records = []
            for candidate in candidates:
                validation = runner.validate_candidate(
                    repository_engine,
                    restricted_path,
                    target_branch,
                    conflict.path,
                    candidate["content"],
                    validation_profile,
                )
                ranked = scorer.score_candidate(candidate, ast_analysis, classification, validation)
                candidate_records.append(
                    {
                        "id": str(uuid4()),
                        **candidate,
                        "validation": validation,
                        **ranked,
                    }
                )
            conflict_records.append(
                {
                    "id": str(uuid4()),
                    "path": conflict.path,
                    "classification": classification["classification"],
                    "risk": classification["risk"],
                    "explanation": classification["explanation"],
                    "riskFactors": classification["riskFactors"],
                    "ast": ast_analysis,
                    "preview": conflict.conflict_content[:2400],
                    "candidates": sorted(candidate_records, key=lambda item: item["score"], reverse=True),
                }
            )

        return {
            "id": str(uuid4()),
            "status": "completed",
            "repositoryPath": repository_path,
            "sourceBranch": source_branch,
            "targetBranch": target_branch,
            "mergeBase": repository["mergeBase"],
            "branchSummary": repository["branchSummary"],
            "conflicts": conflict_records,
            "summary": {
                "conflictCount": len(conflict_records),
                "rejectedCandidates": sum(
                    1
                    for conflict in conflict_records
                    for candidate in conflict["candidates"]
                    if candidate["decision"] == "rejected"
                ),
                "reviewCandidates": sum(
                    1
                    for conflict in conflict_records
                    for candidate in conflict["candidates"]
                    if candidate["decision"] == "review"
                ),
            },
        }
    finally:
        if cleanup:
            cleanup()
