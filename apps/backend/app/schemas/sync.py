from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PushIn(BaseModel):
    changes: list[dict] = Field(default_factory=list)


class AcceptedItem(BaseModel):
    client_uuid: str
    revision: int


class ConflictItem(BaseModel):
    client_uuid: str
    reason: str = "STALE_WRITE"
    server_doc: dict


class PushOut(BaseModel):
    accepted: list[AcceptedItem] = Field(default_factory=list)
    conflicts: list[ConflictItem] = Field(default_factory=list)


class PullOut(BaseModel):
    changes: list[dict] = Field(default_factory=list)
    current_revision: int
    has_more: bool


class StatusOut(BaseModel):
    current_revision: int


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    revoked: bool


class PairingOut(BaseModel):
    pairing_token: str
    expires_in_seconds: int = 600


class ClaimIn(BaseModel):
    pairing_token: str
    name: str = ""


class ClaimOut(BaseModel):
    device_id: str


class ResolveIn(BaseModel):
    client_uuid: str
    strategy: Literal["merge", "mine", "theirs"]
    doc: dict | None = None


class ResolveOut(BaseModel):
    doc: dict
