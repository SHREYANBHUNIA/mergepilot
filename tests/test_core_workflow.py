import sys
import unittest
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from orchestrator import _is_demo_repository_path, analyze_repository


class MergePilotCoreWorkflowTests(unittest.TestCase):
    def test_demo_analysis_finds_semantic_conflict_and_rejects_a_bad_candidate(self):
        analysis = analyze_repository("demo://mergepilot", "feature/tax-aware-total", "master", "demo-node")

        self.assertEqual(analysis["status"], "completed")
        self.assertEqual(analysis["summary"]["conflictCount"], 1)
        conflict = analysis["conflicts"][0]
        self.assertEqual(conflict["classification"], "semantic")
        self.assertIn("calculateTotal", conflict["ast"]["affectedSymbols"])
        decisions = {candidate["strategy"]: candidate["decision"] for candidate in conflict["candidates"]}
        self.assertIn("target-preserving", decisions)
        self.assertIn("source-preserving", decisions)
        self.assertEqual(decisions["deterministic-combination"], "rejected")

    def test_demo_analysis_includes_recoverable_base_and_non_applyable_manual_review_candidates(self):
        analysis = analyze_repository("demo://mergepilot", "feature/tax-aware-total", "master", "demo-node")
        candidates = {candidate["strategy"]: candidate for candidate in analysis["conflicts"][0]["candidates"]}

        self.assertEqual(candidates["base-preserving"]["validation"]["status"], "passed")
        self.assertEqual(candidates["manual-review-template"]["decision"], "rejected")

    def test_llm_candidate_is_omitted_when_no_approved_endpoint_is_configured(self):
        with patch.dict("os.environ", {"MERGEPILOT_LLM_URL": ""}, clear=False):
            analysis = analyze_repository("demo://mergepilot", "feature/tax-aware-total", "master", "demo-node")
        strategies = [candidate["strategy"] for candidate in analysis["conflicts"][0]["candidates"]]
        self.assertNotIn("llm-assisted", strategies)

    def test_demo_aliases_are_normalized_before_the_git_inspector_runs(self):
        self.assertTrue(_is_demo_repository_path(" demo://mergepilot/ "))
        self.assertTrue(_is_demo_repository_path("mergepilot-demo"))
        self.assertFalse(_is_demo_repository_path("/home/ubuntu/not-a-repository"))

    def test_explicit_demo_mode_never_passes_a_browser_path_to_git_inspection(self):
        analysis = analyze_repository(
            "/home/ubuntu/mergepilot/not-a-repository",
            "not-a-branch",
            "not-a-branch",
            "none",
            demo_mode=True,
        )
        self.assertEqual(analysis["status"], "completed")
        self.assertEqual(analysis["executionMode"], "demo-disposable")
        self.assertEqual(analysis["repositoryPath"], "demo://mergepilot")
        self.assertEqual(analysis["summary"]["conflictCount"], 1)


if __name__ == "__main__":
    unittest.main()
