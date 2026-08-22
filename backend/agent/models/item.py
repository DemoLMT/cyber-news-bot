from pydantic import BaseModel
from typing import Any


class Item(BaseModel):
    source_id: str
    topic: str
    type: str
    title: str
    url: str | None = None
    summary: str | None = None
    content: str | None = None
    published: str | None = None
    raw: dict[str, Any] | None = None
