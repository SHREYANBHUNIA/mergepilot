from __future__ import annotations

import json
import sys

from orchestrator import analyze_repository


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    result = analyze_repository(
        payload.get("repositoryPath", "demo://mergepilot"),
        payload.get("sourceBranch", "feature/tax-aware-total"),
        payload.get("targetBranch", "master"),
        payload.get("validationProfile", "demo-node"),
        payload.get("demoMode", False),
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
