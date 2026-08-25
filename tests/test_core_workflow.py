import sys
import unittest
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from orchestrator import analyze_repository


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


if __name__ == "__main__":
    unittest.main()
