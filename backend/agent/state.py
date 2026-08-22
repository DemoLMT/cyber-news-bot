from typing import Any
from datetime import datetime
from pydantic import BaseModel, Field


class AgentState(BaseModel):
    run_id: str
    target_date: str
    mode: str
    stage: str = Field(default='initialized')
    raw_items: list[dict[str, Any]] = Field(default_factory=list)
    unique_items: list[dict[str, Any]] = Field(default_factory=list)
    candidates: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)
    section_outputs: dict[str, Any] = Field(default_factory=dict)
    digest_markdown: str | None = None
    warnings: list[str] = Field(default_factory=list)
    errors: list[dict[str, Any]] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    llm_config: dict[str, Any] = Field(default_factory=dict)
    database_path: Any = None
    database_conn: Any = None
    started_at: str | None = None
    finished_at: str | None = None

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)

    def add_error(self, error: dict[str, Any]) -> None:
        self.errors.append(error)
