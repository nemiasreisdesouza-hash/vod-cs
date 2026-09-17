"""Object storage (S3/MinIO) with transparent local-filesystem fallback."""
import logging
import os
import shutil
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

log = logging.getLogger(__name__)


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.minio_user,
        aws_secret_access_key=settings.minio_password,
        region_name="us-east-1",
    )


def ensure_bucket() -> None:
    try:
        s3 = _client()
        s3.head_bucket(Bucket=settings.s3_bucket)
    except (BotoCoreError, ClientError):
        try:
            _client().create_bucket(Bucket=settings.s3_bucket)
        except (BotoCoreError, ClientError) as exc:  # MinIO may be down in tests
            log.warning("Could not ensure bucket: %s", exc)


def upload_file(local_path: str, key: str | None = None) -> str:
    """Upload a file, returning its storage key (or local path fallback)."""
    key = key or f"{uuid.uuid4()}_{Path(local_path).name}"
    try:
        ensure_bucket()
        _client().upload_file(local_path, settings.s3_bucket, key)
        return f"s3://{settings.s3_bucket}/{key}"
    except (BotoCoreError, ClientError, OSError) as exc:
        log.warning("S3 unavailable, keeping local file: %s", exc)
        dest = Path(settings.upload_dir) / "store" / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(local_path, dest)
        return str(dest)


def presigned_url(key_or_url: str, expires: int = 3600) -> str:
    if key_or_url.startswith("s3://"):
        key = key_or_url.split(f"s3://{settings.s3_bucket}/")[-1]
        try:
            return _client().generate_presigned_url(
                "get_object", Params={"Bucket": settings.s3_bucket, "Key": key}, ExpiresIn=expires
            )
        except (BotoCoreError, ClientError):
            pass
    return key_or_url


def save_upload(filename: str, data: bytes) -> str:
    safe = f"{uuid.uuid4()}_{Path(filename).name}"
    dest = Path(settings.upload_dir) / safe
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return str(dest)


def file_size_mb(path: str) -> float:
    return os.path.getsize(path) / (1024 * 1024)
