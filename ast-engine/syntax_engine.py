from __future__ import annotations

import re
from pathlib import Path

from tree_sitter import Language, Parser


LANGUAGE_BY_EXTENSION = {
    ".py": ("python", "function_definition", "class_definition"),
    ".js": ("javascript", "function_declaration", "class_declaration"),
    ".jsx": ("javascript", "function_declaration", "class_declaration"),
    ".ts": ("typescript", "function_declaration", "class_declaration"),
    ".tsx": ("tsx", "function_declaration", "class_declaration"),
}


def _language_for_path(file_path: str):
    extension = Path(file_path).suffix.lower()
    selected = LANGUAGE_BY_EXTENSION.get(extension)
    if not selected:
        return None, []
    language_name, *symbol_types = selected
    if language_name == "python":
        import tree_sitter_python as provider
    elif language_name == "javascript":
        import tree_sitter_javascript as provider
    else:
        import tree_sitter_typescript as provider
    if language_name == "typescript":
        capsule = provider.language_typescript()
    elif language_name == "tsx":
        capsule = provider.language_tsx()
    else:
        capsule = provider.language()
    return Language(capsule), symbol_types


def _symbols_for_tree(root_node, symbol_types: list[str]) -> list[str]:
    symbols: list[str] = []
    cursor = root_node.walk()
    visited_children = False
    while True:
        node = cursor.node
        if node.type in symbol_types:
            name_node = node.child_by_field_name("name")
            if name_node:
                symbol = name_node.text.decode("utf-8", errors="replace")
                if symbol and symbol not in symbols:
                    symbols.append(symbol)
        if not visited_children and cursor.goto_first_child():
            visited_children = False
            continue
        if cursor.goto_next_sibling():
            visited_children = False
            continue
        while True:
            if not cursor.goto_parent():
                return symbols
            if cursor.goto_next_sibling():
                visited_children = False
                break


def _extract_conflict_regions(content: str) -> list[dict]:
    pattern = re.compile(
        r"<<<<<<<[^\n]*\n(?P<target>.*?)\n\|\|\|\|\|\|\|[^\n]*\n(?P<base>.*?)\n=======\n(?P<source>.*?)\n>>>>>>>[^\n]*",
        re.DOTALL,
    )
    regions = []
    for match in pattern.finditer(content):
        regions.append(
            {
                "target": match.group("target"),
                "base": match.group("base"),
                "source": match.group("source"),
                "line": content[: match.start()].count("\n") + 1,
            }
        )
    return regions


def analyze_ast(file_path: str, conflict_content: str, target_content: str, source_content: str) -> dict:
    language, symbol_types = _language_for_path(file_path)
    regions = _extract_conflict_regions(conflict_content)
    if language is None:
        return {
            "language": "text",
            "parseSupported": False,
            "targetSyntaxValid": True,
            "sourceSyntaxValid": True,
            "affectedSymbols": [],
            "regions": regions,
            "riskFactors": ["No grammar is configured for this file type."],
        }

    parser = Parser(language)
    target_tree = parser.parse(target_content.encode("utf-8"))
    source_tree = parser.parse(source_content.encode("utf-8"))
    target_symbols = _symbols_for_tree(target_tree.root_node, symbol_types)
    source_symbols = _symbols_for_tree(source_tree.root_node, symbol_types)
    affected_symbols = sorted(set(target_symbols) & set(source_symbols)) or sorted(set(target_symbols + source_symbols))
    risk_factors: list[str] = []
    if target_tree.root_node.has_error or source_tree.root_node.has_error:
        risk_factors.append("One branch version does not parse cleanly with the configured grammar.")
    if affected_symbols:
        risk_factors.append(f"Both branches affect declared symbols: {', '.join(affected_symbols[:4])}.")
    if len(regions) > 1:
        risk_factors.append(f"The file contains {len(regions)} independent conflict regions.")
    if not risk_factors:
        risk_factors.append("The competing edits have no shared declared symbol signal.")

    return {
        "language": LANGUAGE_BY_EXTENSION[Path(file_path).suffix.lower()][0],
        "parseSupported": True,
        "targetSyntaxValid": not target_tree.root_node.has_error,
        "sourceSyntaxValid": not source_tree.root_node.has_error,
        "affectedSymbols": affected_symbols[:10],
        "regions": regions,
        "riskFactors": risk_factors,
    }
