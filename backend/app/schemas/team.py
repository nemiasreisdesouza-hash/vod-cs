"""Team schemas."""
from pydantic import BaseModel, Field


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    game: str = Field(default="cs2", pattern="^(cs2|crossfire)$")
    logo_url: str = ""


class TeamUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    game: str | None = None


class TeamOut(BaseModel):
    id: int
    name: str
    logo_url: str
    game: str
    owner_id: int
    invite_code: str
    member_count: int = 0

    model_config = {"from_attributes": True}


class MemberAdd(BaseModel):
    email: str | None = None
    nickname: str = ""
    role: str = "Rifler"


class MemberOut(BaseModel):
    id: int
    team_id: int
    user_id: int | None
    nickname: str
    role: str

    model_config = {"from_attributes": True}


class InviteCreate(BaseModel):
    email: str = ""


class InviteOut(BaseModel):
    id: int
    team_id: int
    email: str
    code: str
    status: str

    model_config = {"from_attributes": True}
