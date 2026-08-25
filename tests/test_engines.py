import importlib
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
for directory in ["ast-engine", "conflict-detector", "resolution-engine", "ranking"]:
    sys.path.insert(0, str(ROOT / directory))

syntax_engine = importlib.import_module("syntax_engine")
detector = importlib.import_module("detector")
candidate_engine = importlib.import_module("candidate_engine")
scorer = importlib.import_module("scorer")


TARGET = """function calculateTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item, 0);
  const discount = subtotal > 100 ? 10 : 0;
  return subtotal - discount;
}
"""

SOURCE = """function calculateTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item, 0);
  const tax = subtotal * 0.08;
  return subtotal + tax;
}
"""

CONFLICT = """function calculateTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item, 0);
<<<<<<< target
  const discount = subtotal > 100 ? 10 : 0;
  return subtotal - discount;
||||||| base
  return subtotal;
=======
  const tax = subtotal * 0.08;
  return subtotal + tax;
>>>>>>> source
}
"""


class EngineUnitTests(unittest.TestCase):
    def test_ast_engine_surfaces_shared_callable_symbol(self):
        result = syntax_engine.analyze_ast("src/total.js", CONFLICT, TARGET, SOURCE)

        self.assertTrue(result["parseSupported"])
        self.assertIn("calculateTotal", result["affectedSymbols"])
        self.assertTrue(result["targetSyntaxValid"])
        self.assertTrue(result["sourceSyntaxValid"])

    def test_detector_marks_shared_symbol_as_semantic_conflict(self):
        ast_analysis = syntax_engine.analyze_ast("src/total.js", CONFLICT, TARGET, SOURCE)
        classification = detector.classify_conflict(ast_analysis)

        self.assertEqual(classification["classification"], "semantic")
        self.assertIn("same declared symbol", classification["explanation"])

    def test_candidate_engine_emits_base_and_manual_review_strategies(self):
        conflict = SimpleNamespace(
            path="src/total.js",
            base_content="function calculateTotal() { return 0; }\n",
            target_content=TARGET,
            source_content=SOURCE,
            conflict_content=CONFLICT,
        )
        ast_analysis = syntax_engine.analyze_ast("src/total.js", CONFLICT, TARGET, SOURCE)
        classification = detector.classify_conflict(ast_analysis)
        candidates = candidate_engine.generate_candidates(conflict, ast_analysis, classification, lambda *_: "patch")
        strategies = {candidate["strategy"] for candidate in candidates}

        self.assertIn("base-preserving", strategies)
        self.assertIn("manual-review-template", strategies)
        self.assertIn("deterministic-combination", strategies)

    def test_scorer_rejects_failed_validation_even_when_ast_signal_is_good(self):
        ast_analysis = syntax_engine.analyze_ast("src/total.js", CONFLICT, TARGET, SOURCE)
        classification = detector.classify_conflict(ast_analysis)
        result = scorer.score_candidate(
            {"strategy": "target-preserving"},
            ast_analysis,
            classification,
            {"status": "failed", "exitCode": 1, "output": "assertion failed"},
        )

        self.assertEqual(result["decision"], "rejected")
        self.assertIn("Rejected automatically", result["scoreExplanation"])


if __name__ == "__main__":
    unittest.main()
