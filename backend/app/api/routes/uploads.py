import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.errors import bad_request
from app.core.security import AuthenticatedUser, get_session_user
from app.schemas.uploads import ProjectImageUploadResponse, UploadedImageResponse, UserAvatarUploadResponse
from app.services import attach_project_image, upload_project_image_file, upload_user_avatar

router = APIRouter(prefix="/uploads")


async def _read_upload_file(file: UploadFile) -> tuple[str, str, bytes]:
    file_name = (file.filename or "").strip()
    content_type = (file.content_type or "").split(";")[0].strip()
    if not file_name:
        raise bad_request("缺少文件名。", {"fileName": "缺少文件名"})
    if not content_type:
        raise bad_request("缺少文件类型。", {"contentType": "缺少文件类型"})
    body = await file.read()
    await file.close()
    if not body:
        raise bad_request("上传内容不能为空。", {"file": "上传内容不能为空"})
    return file_name, content_type, body


@router.post("/projects/{project_id}/images", response_model=ProjectImageUploadResponse)
async def upload_project_image(
    project_id: str,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser | None = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise bad_request("请先登录后再上传图片。")

    file_name, content_type, body = await _read_upload_file(file)

    return attach_project_image(
        db=db,
        project_id=project_id,
        user_id=current_user.user_id,
        file_name=file_name,
        content_type=content_type,
        body=body,
    )


@router.post("/projects/images", response_model=UploadedImageResponse)
async def upload_project_image_file_only(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser | None = Depends(get_session_user),
):
    if not current_user:
        raise bad_request("请先登录后再上传图片。")

    _file_name, content_type, body = await _read_upload_file(file)

    return upload_project_image_file(
        object_prefix=f"projects/uploads/{current_user.user_id}",
        image_id=str(uuid.uuid4()),
        content_type=content_type,
        body=body,
    )


@router.post("/users/me/avatar", response_model=UserAvatarUploadResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_session_user),
):
    if not current_user:
        raise bad_request("请先登录后再上传图片。")

    file_name, content_type, body = await _read_upload_file(file)

    return upload_user_avatar(
        db=db,
        user_id=current_user.user_id,
        file_name=file_name,
        content_type=content_type,
        body=body,
    )
