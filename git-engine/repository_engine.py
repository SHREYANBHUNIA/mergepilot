from __future__ import annotations

import difflib
import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from git import Repo


@dataclass
class MergeConflictFile:
    path: str
    base_content: str
    target_content: str
    source_content: str
    conflict_content: str


def _decode(blob: bytes) -> str:
    return blob.decode("utf-8", errors="replace")


def _read_ref_file(repo: Repo, ref: str, file_path: str) -> str:
    try:
        return _decode(repo.git.show(f"{ref}:{file_path}").encode("utf-8"))
    except Exception:
        return ""


def _changed_files(repo: Repo, base_ref: str, branch_ref: str) -> set[str]:
    output = repo.git.diff("--name-only", f"{base_ref}..{branch_ref}")
    return {line.strip() for line in output.splitlines() if line.strip()}


def _merge_file(target_content: str, base_content: str, source_content: str) -> str:
    with tempfile.TemporaryDirectory(prefix="mergepilot-merge-") as temp_dir:
        temp = Path(temp_dir)
        target_path = temp / "target"
        base_path = temp / "base"
        source_path = temp / "source"
        target_path.write_text(target_content, encoding="utf-8")
        base_path.write_text(base_content, encoding="utf-8")
        source_path.write_text(source_content, encoding="utf-8")
        result = subprocess.run(
            ["git", "merge-file", "-p", "--diff3", str(target_path), str(base_path), str(source_path)],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout


def inspect_repository(repository_path: str, source_branch: str, target_branch: str) -> dict:
    resolved_path = Path(repository_path).resolve()
    if not resolved_path.exists() or not (resolved_path / ".git").exists():
        raise ValueError("Repository path must point to an initialized Git working tree.")

    repo = Repo(resolved_path)
    if repo.bare:
        raise ValueError("Bare repositories are not supported by the interactive workspace.")

    try:
        base_commit = repo.git.merge_base(source_branch, target_branch).strip()
    except Exception as error:
        raise ValueError(f"Unable to find a merge base for the selected branches: {error}") from error

    source_changes = _changed_files(repo, base_commit, source_branch)
    target_changes = _changed_files(repo, base_commit, target_branch)
    shared_changes = sorted(source_changes & target_changes)
    conflicts: list[MergeConflictFile] = []

    for file_path in shared_changes:
        base_content = _read_ref_file(repo, base_commit, file_path)
        target_content = _read_ref_file(repo, target_branch, file_path)
        source_content = _read_ref_file(repo, source_branch, file_path)
        if not target_content and not source_content:
            continue
        conflict_content = _merge_file(target_content, base_content, source_content)
        if "<<<<<<<" not in conflict_content:
            continue
        conflicts.append(
            MergeConflictFile(
                path=file_path,
                base_content=base_content,
                target_content=target_content,
                source_content=source_content,
                conflict_content=conflict_content,
            )
        )

    return {
        "repositoryPath": str(resolved_path),
        "sourceBranch": source_branch,
        "targetBranch": target_branch,
        "mergeBase": base_commit,
        "branchSummary": {
            "sourceChangedFiles": len(source_changes),
            "targetChangedFiles": len(target_changes),
            "sharedChangedFiles": len(shared_changes),
        },
        "conflicts": conflicts,
    }


def make_unified_patch(file_path: str, target_content: str, candidate_content: str) -> str:
    patch = difflib.unified_diff(
        target_content.splitlines(keepends=True),
        candidate_content.splitlines(keepends=True),
        fromfile=f"a/{file_path}",
        tofile=f"b/{file_path}",
    )
    return "".join(patch)


def apply_candidate_content(repository_path: str, branch_ref: str, file_path: str, content: str, test_command: list[str]) -> dict:
    repo = Repo(repository_path)
    with tempfile.TemporaryDirectory(prefix="mergepilot-validate-") as temp_dir:
        worktree_path = Path(temp_dir) / "workspace"
        repo.git.worktree("add", "--detach", str(worktree_path), branch_ref)
        try:
            destination = worktree_path / file_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(content, encoding="utf-8")
            result = subprocess.run(
                test_command,
                cwd=worktree_path,
                check=False,
                capture_output=True,
                text=True,
                timeout=45,
                env={**os.environ, "CI": "1"},
            )
            output = (result.stdout + "\n" + result.stderr).strip()
            return {
                "status": "passed" if result.returncode == 0 else "failed",
                "exitCode": result.returncode,
                "output": output[-4000:],
            }
        except subprocess.TimeoutExpired:
            return {
                "status": "failed",
                "exitCode": -1,
                "output": "Validation exceeded the 45-second safety limit.",
            }
        finally:
            try:
                repo.git.worktree("remove", "--force", str(worktree_path))
            except Exception:
                pass
