from __future__ import annotations


VALIDATION_PROFILES = {
    "demo-node": ["node", "tests/conflict-test.cjs"],
    "python-unit": ["python3", "-m", "unittest"],
    "none": ["true"],
}


def get_validation_command(profile: str) -> list[str]:
    if profile not in VALIDATION_PROFILES:
        raise ValueError("Validation profile is not allow-listed.")
    return VALIDATION_PROFILES[profile]


def validate_candidate(repository_engine, repository_path: str, branch_ref: str, file_path: str, content: str, profile: str) -> dict:
    command = get_validation_command(profile)
    result = repository_engine.apply_candidate_content(repository_path, branch_ref, file_path, content, command)
    return {**result, "profile": profile, "command": " ".join(command)}
