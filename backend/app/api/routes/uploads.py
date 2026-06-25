from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_db
from app.core.errors import bad_request
from app.core.security import AuthenticatedUser, get_session_user
from app.schemas.uploads import ProjectImageUploadResponse
from app.services import attach_project_image
from sqlalchemy.orm import Session

router = APIRouter(prefix="/uploads")


@router.post("/projects/{project_id}/images", response_model=ProjectImageUploadResponse)
async def upload_project_image(
    project_id: str,
    request: Request,
    current_user: AuthenticatedUser | None = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise bad_request("请先登录后再上传图片。")

    file_name = unquote(request.headers.get("x-file-name", "").strip())
    content_type = request.headers.get("content-type", "").split(";")[0].strip()
    if not file_name:
        raise bad_request("缺少文件名。", {"fileName": "缺少文件名"})
    if not content_type:
        raise bad_request("缺少文件类型。", {"contentType": "缺少文件类型"})

    body = await request.body()
    if not body:
        raise bad_request("上传内容不能为空。", {"file": "上传内容不能为空"})

    return attach_project_image(
        db=db,
        project_id=project_id,
        user_id=current_user.user_id,
        file_name=file_name,
        content_type=content_type,
        body=body,
    )
