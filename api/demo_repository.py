from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from git import Repo


def create_demo_repository() -> tuple[str, callable]:
    repository_path = Path(tempfile.mkdtemp(prefix="mergepilot-demo-"))
    repo = Repo.init(repository_path)
    repo.config_writer().set_value("user", "name", "MergePilot Demo").release()
    repo.config_writer().set_value("user", "email", "demo@mergepilot.local").release()
    source_file = repository_path / "src" / "total.js"
    test_file = repository_path / "tests" / "conflict-test.cjs"
    source_file.parent.mkdir(parents=True, exist_ok=True)
    test_file.parent.mkdir(parents=True, exist_ok=True)

    source_file.write_text(
        "function calculateTotal(items) {\n"
        "  const subtotal = items.reduce((sum, item) => sum + item, 0);\n"
        "  return subtotal;\n"
        "}\n\nmodule.exports = { calculateTotal };\n",
        encoding="utf-8",
    )
    test_file.write_text(
        "const assert = require('node:assert/strict');\n"
        "const fs = require('node:fs');\n"
        "const { calculateTotal } = require('../src/total');\n"
        "assert.equal(typeof calculateTotal([10, 20]), 'number');\n"
        "const implementation = fs.readFileSync(require.resolve('../src/total'), 'utf8');\n"
        "assert.equal(/return[^;]*;\\s*const/.test(implementation), false, 'candidate contains unreachable branch logic');\n"
        "console.log('candidate module loads and returns a number');\n",
        encoding="utf-8",
    )
    repo.index.add(["src/total.js", "tests/conflict-test.cjs"])
    repo.index.commit("base: calculate item totals")
    repo.git.branch("feature/tax-aware-total")

    source_file.write_text(
        "function calculateTotal(items) {\n"
        "  const subtotal = items.reduce((sum, item) => sum + item, 0);\n"
        "  const discount = subtotal > 100 ? 10 : 0;\n"
        "  return Math.round((subtotal - discount) * 100) / 100;\n"
        "}\n\nmodule.exports = { calculateTotal };\n",
        encoding="utf-8",
    )
    repo.index.add(["src/total.js"])
    repo.index.commit("target: apply volume discount")

    repo.git.checkout("feature/tax-aware-total")
    source_file.write_text(
        "function calculateTotal(items) {\n"
        "  const subtotal = items.reduce((sum, item) => sum + item, 0);\n"
        "  const tax = subtotal * 0.08;\n"
        "  return subtotal + tax;\n"
        "}\n\nmodule.exports = { calculateTotal };\n",
        encoding="utf-8",
    )
    repo.index.add(["src/total.js"])
    repo.index.commit("source: include sales tax")
    repo.git.checkout("master")

    return str(repository_path), lambda: shutil.rmtree(repository_path, ignore_errors=True)
