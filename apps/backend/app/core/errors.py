from fastapi import HTTPException, status


def bad_request(message: str, field_errors: dict[str, str] | None = None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "BAD_REQUEST", "message": message, "field_errors": field_errors or {}},
    )


def unauthorized(message: str = "Unauthorized") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": message, "field_errors": {}},
    )


def forbidden(message: str = "Forbidden") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "FORBIDDEN", "message": message, "field_errors": {}},
    )


def not_found(message: str = "Not found") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"code": "NOT_FOUND", "message": message, "field_errors": {}},
    )


def service_unavailable(message: str = "Service unavailable") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={"code": "SERVICE_UNAVAILABLE", "message": message, "field_errors": {}},
    )
