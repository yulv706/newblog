#!/usr/bin/env python3
"""Typed MCP bridge between Hermes Agent and the blog management API."""

from __future__ import annotations

import json
import mimetypes
import os
import time
import uuid
from pathlib import Path
from typing import Any, Literal
from urllib.parse import quote

import requests
from mcp.server.fastmcp import FastMCP


API_URL = os.environ.get(
    "BLOG_MANAGEMENT_API_URL",
    "http://blog-app:3000/api/management/v1",
).rstrip("/")
API_TOKEN = os.environ.get("BLOG_MANAGEMENT_API_TOKEN", "").strip()
API_ACTOR = os.environ.get("BLOG_MANAGEMENT_API_ACTOR", "hermes-weixin").strip()
MEDIA_ROOT = Path(os.environ.get("BLOG_MANAGEMENT_MEDIA_ROOT", "/opt/data")).resolve()

session = requests.Session()
mcp = FastMCP(
    "Personal Blog Manager",
    instructions=(
        "Manage the owner's personal blog through typed, audited operations. "
        "Read a resource before updating it and pass expected_updated_at when available. "
        "Only delete when the user explicitly requested deletion."
    ),
)


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    if len(API_TOKEN) < 32:
        raise RuntimeError("BLOG_MANAGEMENT_API_TOKEN is missing or invalid")
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "X-Management-Actor": API_ACTOR or "hermes-weixin",
        "X-Request-ID": str(uuid.uuid4()),
        "Accept": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _request(
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    files: dict[str, Any] | None = None,
    timeout: int = 45,
) -> Any:
    method = method.upper()
    request_headers = _headers(headers)
    if method in {"POST", "PUT", "PATCH", "DELETE"} and files is None:
        request_headers.setdefault("Idempotency-Key", str(uuid.uuid4()))

    response: requests.Response | None = None
    attempts = 2 if files is None else 1
    for attempt in range(attempts):
        try:
            response = session.request(
                method,
                f"{API_URL}/{path.lstrip('/')}",
                json=payload if files is None else None,
                params=params,
                headers=request_headers,
                files=files,
                timeout=timeout,
            )
        except requests.RequestException as exc:
            if attempt + 1 >= attempts:
                raise RuntimeError(f"Blog API connection failed: {exc.__class__.__name__}") from exc
            time.sleep(0.5)
            continue

        if response.status_code not in {502, 503, 504} or attempt + 1 >= attempts:
            break
        time.sleep(0.5)

    if response is None:
        raise RuntimeError("Blog API returned no response")

    try:
        result = response.json()
    except ValueError as exc:
        raise RuntimeError(f"Blog API returned HTTP {response.status_code} without JSON") from exc

    if not response.ok or not result.get("ok"):
        error = result.get("error") or {}
        code = error.get("code", "request_failed")
        message = error.get("message", f"HTTP {response.status_code}")
        raise RuntimeError(f"Blog API {code}: {message}")
    return result.get("data")


def _path_segment(value: str) -> str:
    return quote(value, safe="")


def _compact(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if value is not None}


@mcp.tool()
def blog_status() -> dict[str, Any]:
    """Check API health, deployed version, content counts, capabilities, and safeguards."""
    return _request("GET", "status")


@mcp.tool()
def blog_list_posts(page: int = 1, limit: int = 20, status: str = "") -> dict[str, Any]:
    """List posts, including drafts. status may be empty, draft, or published."""
    params: dict[str, Any] = {"page": page, "limit": limit}
    if status:
        params["status"] = status
    return _request("GET", "posts", params=params)


@mcp.tool()
def blog_get_post(post_id: int) -> dict[str, Any]:
    """Read one complete post before editing it."""
    return _request("GET", f"posts/{post_id}")


@mcp.tool()
def blog_create_post(
    title: str,
    content: str,
    status: Literal["draft", "published"] = "draft",
    slug: str = "",
    excerpt: str = "",
    category_id: int | None = None,
    tags: list[str] | None = None,
    cover_image: str = "",
    published_at: str | None = None,
) -> dict[str, Any]:
    """Create a draft or published Markdown post. Explicitly use published only when requested."""
    return _request(
        "POST",
        "posts",
        payload=_compact(
            {
                "title": title,
                "content": content,
                "status": status,
                "slug": slug,
                "excerpt": excerpt,
                "categoryId": category_id,
                "tags": tags or [],
                "coverImage": cover_image,
                "publishedAt": published_at,
            }
        ),
    )


@mcp.tool()
def blog_update_post(
    post_id: int,
    expected_updated_at: str = "",
    title: str | None = None,
    content: str | None = None,
    status: Literal["draft", "published"] | None = None,
    slug: str | None = None,
    excerpt: str | None = None,
    category_id: int | None = None,
    clear_category: bool = False,
    tags: list[str] | None = None,
    cover_image: str | None = None,
    published_at: str | None = None,
) -> dict[str, Any]:
    """Patch a post. Read it first and pass expected_updated_at to prevent overwrites."""
    payload = _compact(
        {
            "expectedUpdatedAt": expected_updated_at or None,
            "title": title,
            "content": content,
            "status": status,
            "slug": slug,
            "excerpt": excerpt,
            "categoryId": None if clear_category else category_id,
            "tags": tags,
            "coverImage": cover_image,
            "publishedAt": published_at,
        }
    )
    if clear_category:
        payload["categoryId"] = None
    return _request("PATCH", f"posts/{post_id}", payload=payload)


@mcp.tool()
def blog_delete_post(post_id: int, confirm: bool = False) -> dict[str, Any]:
    """Permanently delete a post. confirm must be true after an explicit user deletion request."""
    if not confirm:
        raise RuntimeError("Deletion requires confirm=true")
    return _request(
        "DELETE",
        f"posts/{post_id}",
        payload={},
        headers={"X-Management-Confirm": f"delete:post:{post_id}"},
    )


@mcp.tool()
def blog_list_daily(page: int = 1, limit: int = 20, status: str = "") -> dict[str, Any]:
    """List daily timeline entries, including drafts."""
    params: dict[str, Any] = {"page": page, "limit": limit}
    if status:
        params["status"] = status
    return _request("GET", "daily", params=params)


@mcp.tool()
def blog_get_daily(entry_id: int) -> dict[str, Any]:
    """Read one complete daily entry before editing it."""
    return _request("GET", f"daily/{entry_id}")


@mcp.tool()
def blog_create_daily(
    content: str,
    status: Literal["draft", "published"] = "published",
    images: list[str] | None = None,
    location: str = "",
    is_pinned: bool = False,
    occurred_at: str | None = None,
) -> dict[str, Any]:
    """Create a concise daily update. Upload images first and pass their returned URLs."""
    return _request(
        "POST",
        "daily",
        payload=_compact(
            {
                "content": content,
                "status": status,
                "images": images or [],
                "location": location,
                "isPinned": is_pinned,
                "occurredAt": occurred_at,
            }
        ),
    )


@mcp.tool()
def blog_update_daily(
    entry_id: int,
    expected_updated_at: str = "",
    content: str | None = None,
    status: Literal["draft", "published"] | None = None,
    images: list[str] | None = None,
    location: str | None = None,
    is_pinned: bool | None = None,
    occurred_at: str | None = None,
) -> dict[str, Any]:
    """Patch a daily entry. Read it first and preserve image URLs that should remain."""
    return _request(
        "PATCH",
        f"daily/{entry_id}",
        payload=_compact(
            {
                "expectedUpdatedAt": expected_updated_at or None,
                "content": content,
                "status": status,
                "images": images,
                "location": location,
                "isPinned": is_pinned,
                "occurredAt": occurred_at,
            }
        ),
    )


@mcp.tool()
def blog_delete_daily(entry_id: int, confirm: bool = False) -> dict[str, Any]:
    """Permanently delete a daily entry and its managed images after explicit confirmation."""
    if not confirm:
        raise RuntimeError("Deletion requires confirm=true")
    return _request(
        "DELETE",
        f"daily/{entry_id}",
        payload={},
        headers={"X-Management-Confirm": f"delete:daily:{entry_id}"},
    )


@mcp.tool()
def blog_upload_image(
    file_path: str,
    purpose: Literal["daily", "post"] = "daily",
) -> dict[str, Any]:
    """Upload one image from Hermes data storage and return a managed public URL."""
    source = Path(file_path).expanduser().resolve()
    if source != MEDIA_ROOT and MEDIA_ROOT not in source.parents:
        raise RuntimeError(f"Image must be located under {MEDIA_ROOT}")
    if not source.is_file():
        raise RuntimeError("Image file does not exist")
    mime_type = mimetypes.guess_type(source.name)[0] or "application/octet-stream"
    with source.open("rb") as stream:
        return _request(
            "POST",
            "media",
            files={
                "file": (source.name, stream, mime_type),
                "purpose": (None, purpose),
            },
            timeout=60,
        )


@mcp.tool()
def blog_get_about() -> dict[str, Any]:
    """Read the current About page Markdown and its update timestamp."""
    return _request("GET", "about")


@mcp.tool()
def blog_update_about(content: str, expected_updated_at: str = "") -> dict[str, Any]:
    """Replace the About page Markdown after reading its current version."""
    return _request(
        "PUT",
        "about",
        payload=_compact({"content": content, "expectedUpdatedAt": expected_updated_at or None}),
    )


@mcp.tool()
def blog_get_taxonomy() -> dict[str, Any]:
    """List categories and tags with post usage counts."""
    return _request("GET", "taxonomy")


@mcp.tool()
def blog_create_category(name: str) -> dict[str, Any]:
    """Create a post category."""
    return _request("POST", "categories", payload={"name": name})


@mcp.tool()
def blog_delete_category(category_id: int, confirm: bool = False) -> dict[str, Any]:
    """Delete a category and detach its posts after explicit confirmation."""
    if not confirm:
        raise RuntimeError("Deletion requires confirm=true")
    return _request(
        "DELETE",
        f"categories/{category_id}",
        payload={},
        headers={"X-Management-Confirm": f"delete:category:{category_id}"},
    )


@mcp.tool()
def blog_delete_unused_tag(tag_id: int, confirm: bool = False) -> dict[str, Any]:
    """Delete an unused tag after explicit confirmation. Tags in use are protected."""
    if not confirm:
        raise RuntimeError("Deletion requires confirm=true")
    return _request(
        "DELETE",
        f"tags/{tag_id}",
        payload={},
        headers={"X-Management-Confirm": f"delete:tag:{tag_id}"},
    )


@mcp.tool()
def blog_list_comments(status: Literal["pending", "approved"] = "pending", limit: int = 30) -> dict[str, Any]:
    """List pending or approved comments for moderation."""
    return _request("GET", "comments", params={"status": status, "limit": limit})


@mcp.tool()
def blog_set_comment_approved(comment_id: int, approved: bool = True) -> dict[str, Any]:
    """Approve or return a comment to pending state."""
    return _request("PATCH", f"comments/{comment_id}", payload={"approved": approved})


@mcp.tool()
def blog_delete_comment(comment_id: int, confirm: bool = False) -> dict[str, Any]:
    """Permanently delete a comment after explicit confirmation."""
    if not confirm:
        raise RuntimeError("Deletion requires confirm=true")
    return _request(
        "DELETE",
        f"comments/{comment_id}",
        payload={},
        headers={"X-Management-Confirm": f"delete:comment:{comment_id}"},
    )


@mcp.tool()
def blog_list_books(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    visibility: Literal["all", "public", "private"] = "all",
    include_archived: bool = False,
) -> dict[str, Any]:
    """List synchronized books with privacy, progress, rating, and archive state."""
    params: dict[str, Any] = {
        "page": page,
        "limit": limit,
        "visibility": visibility,
        "includeArchived": str(include_archived).lower(),
    }
    if status:
        params["status"] = status
    return _request("GET", "books", params=params)


@mcp.tool()
def blog_get_book(source_id: str) -> dict[str, Any]:
    """Read one book and its available highlights and thoughts."""
    return _request("GET", f"books/{_path_segment(source_id)}")


@mcp.tool()
def blog_update_book(
    source_id: str,
    expected_updated_at: str = "",
    title: str | None = None,
    author: str | None = None,
    category: str | None = None,
    status: Literal["reading", "finished", "queued"] | None = None,
    progress: int | None = None,
    rating: float | None = None,
    latest_note: str | None = None,
    is_private: bool | None = None,
    is_top: bool | None = None,
    archived: bool | None = None,
) -> dict[str, Any]:
    """Patch public shelf metadata. WeRead may overwrite synchronized fields on the next sync."""
    return _request(
        "PATCH",
        f"books/{_path_segment(source_id)}",
        payload=_compact(
            {
                "expectedUpdatedAt": expected_updated_at or None,
                "title": title,
                "author": author,
                "category": category,
                "status": status,
                "progress": progress,
                "rating": rating,
                "latestNote": latest_note,
                "isPrivate": is_private,
                "isTop": is_top,
                "archived": archived,
            }
        ),
    )


@mcp.tool()
def blog_add_book_note(
    source_id: str,
    content: str,
    note_type: Literal["highlight", "review"] = "review",
    thought: str = "",
    chapter_title: str = "",
    created_at: str | None = None,
) -> dict[str, Any]:
    """Add a manual highlight or review that is preserved across WeRead synchronization."""
    return _request(
        "POST",
        f"books/{_path_segment(source_id)}/notes",
        payload=_compact(
            {
                "type": note_type,
                "content": content,
                "thought": thought,
                "chapterTitle": chapter_title,
                "createdAt": created_at,
            }
        ),
    )


@mcp.tool()
def blog_delete_book_note(source_id: str, note_id: str, confirm: bool = False) -> dict[str, Any]:
    """Delete a book note after explicit confirmation."""
    if not confirm:
        raise RuntimeError("Deletion requires confirm=true")
    return _request(
        "DELETE",
        f"books/{_path_segment(source_id)}/notes/{_path_segment(note_id)}",
        payload={},
        headers={"X-Management-Confirm": f"delete:book-note:{note_id}"},
    )


@mcp.tool()
def blog_sync_weread() -> dict[str, Any]:
    """Run the configured WeRead synchronization and return exact counts or an error."""
    return _request("POST", "reading/sync", payload={}, timeout=210)


@mcp.tool()
def blog_create_database_snapshot(label: str = "hermes") -> dict[str, Any]:
    """Create a consistent database snapshot before broad or destructive changes."""
    return _request("POST", "backups", payload={"label": label}, timeout=90)


@mcp.tool()
def blog_list_database_snapshots() -> dict[str, Any]:
    """List retained management database snapshots."""
    return _request("GET", "backups")


@mcp.tool()
def blog_list_audit(limit: int = 50) -> dict[str, Any]:
    """Review recent management mutations and failures without exposing secrets or full content."""
    return _request("GET", "audit", params={"limit": limit})


if __name__ == "__main__":
    mcp.run(transport="stdio")
