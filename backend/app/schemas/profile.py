import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nickname: str | None
    created_at: datetime
    updated_at: datetime
