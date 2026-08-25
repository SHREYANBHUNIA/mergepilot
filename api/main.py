from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from orchestrator import analyze_repository

app = FastAPI(title="MergePilot Analysis API", version="0.1.0")


class AnalysisRequest(BaseModel):
    repository_path: str = Field(default="demo://mergepilot")
    source_branch: str = Field(default="feature/tax-aware-total")
    target_branch: str = Field(default="master")
    validation_profile: str = Field(default="demo-node")
    demo_mode: bool = Field(default=False)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mergepilot-python-core"}


@app.post("/analyses")
def create_analysis(request: AnalysisRequest) -> dict:
    try:
        return analyze_repository(
            request.repository_path,
            request.source_branch,
            request.target_branch,
            request.validation_profile,
            request.demo_mode,
        )
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
