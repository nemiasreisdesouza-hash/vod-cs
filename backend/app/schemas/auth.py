"""Auth request/response schemas."""
from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    name: str = Field(default="", max_length=120)
    nickname: str = Field(default="", max_length=64)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=72)


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    nickname: str
    avatar_url: str
    steam_id: str
    plan: str

    model_config = {"from_attributes": True}


class UserUpdateIn(BaseModel):
    name: str | None = None
    nickname: str | None = None
    avatar_url: str | None = None
    steam_id: str | None = None
