from app.schemas.common import APIModel


class TagResponse(APIModel):
    id: str
    name: str
    slug: str
