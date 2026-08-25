from __future__ import annotations


def score_candidate(candidate: dict, ast_analysis: dict, classification: dict, validation: dict) -> dict:
    syntax_score = 35 if ast_analysis.get("targetSyntaxValid") and ast_analysis.get("sourceSyntaxValid") else 12
    validation_score = 40 if validation["status"] == "passed" else 0
    strategy = candidate["strategy"]
    if classification["classification"] == "semantic":
        semantic_score = 22 if strategy in {"target-preserving", "source-preserving"} else 12
    else:
        semantic_score = 24 if strategy != "deterministic-combination" else 18
    score = min(100, syntax_score + validation_score + semantic_score)

    factors = [
        f"AST parse signal contributes {syntax_score}/35.",
        f"Semantic-risk policy contributes {semantic_score}/25.",
        f"Validation contributes {validation_score}/40.",
    ]
    if validation["status"] != "passed":
        decision = "rejected"
        explanation = "Rejected automatically because the configured isolated validation command failed."
    elif classification["classification"] == "semantic":
        decision = "review"
        explanation = "Tests pass, but this is a semantic conflict. The candidate is safe to stage only after human review of the affected behavior."
    else:
        decision = "recommended"
        explanation = "The candidate parses cleanly, passed the configured validation command, and carries a low structural risk signal."

    return {
        "score": score,
        "decision": decision,
        "scoreFactors": factors,
        "scoreExplanation": explanation,
    }
