from __future__ import annotations


def classify_conflict(ast_analysis: dict) -> dict:
    syntax_safe = ast_analysis["targetSyntaxValid"] and ast_analysis["sourceSyntaxValid"]
    symbols = ast_analysis.get("affectedSymbols", [])
    regions = ast_analysis.get("regions", [])

    if not syntax_safe:
        classification = "syntactic"
        explanation = "At least one branch version does not parse with the configured grammar, so compilation safety is the dominant concern."
        risk = "high"
    elif symbols:
        classification = "semantic"
        explanation = "Both branches alter the same declared symbol or callable scope; choosing a side may silently discard behavioral intent."
        risk = "high" if len(symbols) > 1 or len(regions) > 1 else "medium"
    else:
        classification = "syntactic"
        explanation = "The competing edits remain parseable and no shared symbol was detected; this is likely a localized text or structure conflict."
        risk = "low"

    return {
        "classification": classification,
        "risk": risk,
        "explanation": explanation,
        "riskFactors": ast_analysis.get("riskFactors", []),
    }
