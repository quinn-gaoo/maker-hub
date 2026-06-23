from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        alias_generator=to_camel,
    )


class ErrorResponse(APIModel):
    code: str
    message: str
    field_errors: dict[str, str] = Field(default_factory=dict)


class PaginatedResponse(APIModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
