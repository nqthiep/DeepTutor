"""
Settings API Router
===================

UI preferences, configuration catalog management, and detailed streamed tests.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from deeptutor.services.auth.dependencies import get_current_user, require_role
from deeptutor.services.config import get_config_test_runner, get_model_catalog_service
from deeptutor.services.embedding.client import reset_embedding_client
from deeptutor.services.llm.client import reset_llm_client
from deeptutor.services.llm.config import clear_llm_config_cache
from deeptutor.services.path_service import get_path_service

router = APIRouter()

from deeptutor.services.settings.interface_settings import get_ui_settings as _get_ui_settings
from deeptutor.services.settings.interface_settings import save_ui_settings as _save_ui_settings

_pls = get_path_service()
SETTINGS_FILE = _pls.get_settings_file("interface")


def _uid(user: dict) -> str:
    return str(user.get("sub", ""))


def load_ui_settings(user_id: str = "") -> dict[str, Any]:
    return _get_ui_settings(user_id=user_id)


def save_ui_settings(settings: dict[str, Any], user_id: str = "") -> None:
    _save_ui_settings(settings, user_id=user_id)


class SidebarNavOrder(BaseModel):
    start: List[str]
    learnResearch: List[str]


class UISettings(BaseModel):
    theme: Literal["light", "dark", "glass", "snow", "nexus"] = "light"
    language: Literal["zh", "en", "vi"] = "en"
    sidebar_description: Optional[str] = None
    sidebar_nav_order: Optional[SidebarNavOrder] = None


class ThemeUpdate(BaseModel):
    theme: Literal["light", "dark", "glass", "snow", "nexus"]


class LanguageUpdate(BaseModel):
    language: Literal["zh", "en", "vi"]


class SidebarDescriptionUpdate(BaseModel):
    description: str


class SidebarNavOrderUpdate(BaseModel):
    nav_order: SidebarNavOrder


class CatalogPayload(BaseModel):
    catalog: dict[str, Any]


def _invalidate_runtime_caches() -> None:
    """Force runtime clients/config to pick up the latest saved catalog."""
    clear_llm_config_cache()
    reset_llm_client()
    reset_embedding_client()


def load_ui_settings() -> dict[str, Any]:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, encoding="utf-8") as handle:
                saved = json.load(handle)
                return {**DEFAULT_UI_SETTINGS, **saved}
        except Exception:
            pass
    return DEFAULT_UI_SETTINGS.copy()


def save_ui_settings(settings: dict[str, Any]) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as handle:
        json.dump(settings, handle, ensure_ascii=False, indent=2)


def _provider_choices() -> dict[str, list[dict[str, str]]]:
    """Build dropdown options for provider selection, keyed by service type."""
    from deeptutor.services.config.provider_runtime import EMBEDDING_PROVIDERS
    from deeptutor.services.provider_registry import PROVIDERS

    llm = sorted(
        [
            {
                "value": s.name,
                "label": (
                    "Custom (OpenAI API)"
                    if s.name == "custom"
                    else "Custom (Anthropic API)"
                    if s.name == "custom_anthropic"
                    else s.label
                ),
                "base_url": s.default_api_base,
            }
            for s in PROVIDERS
        ],
        key=lambda p: p["label"].lower(),
    )
    embedding = sorted(
        [
            {
                "value": name,
                "label": spec.label,
                "base_url": spec.default_api_base,
                "default_dim": str(spec.default_dim) if spec.default_dim else "",
            }
            for name, spec in EMBEDDING_PROVIDERS.items()
            if name != "custom_openai_sdk"
        ],
        key=lambda p: p["label"].lower(),
    )
    search = [
        {"value": "brave", "label": "Brave", "base_url": ""},
        {"value": "tavily", "label": "Tavily", "base_url": ""},
        {"value": "jina", "label": "Jina", "base_url": ""},
        {"value": "searxng", "label": "SearXNG", "base_url": ""},
        {"value": "duckduckgo", "label": "DuckDuckGo", "base_url": ""},
        {"value": "perplexity", "label": "Perplexity", "base_url": ""},
    ]
    return {"llm": llm, "embedding": embedding, "search": search}


@router.get("")
async def get_settings(user: dict = Depends(get_current_user)):
    return {
        "ui": load_ui_settings(user_id=_uid(user)),
        "catalog": get_model_catalog_service().load(),
        "providers": _provider_choices(),
    }


@router.get("/catalog")
async def get_catalog(user: dict = Depends(get_current_user)):
    return {"catalog": get_model_catalog_service().load()}


@router.put("/catalog")
async def update_catalog(payload: CatalogPayload, user: dict = Depends(require_role("administrator"))):
    catalog = get_model_catalog_service().save(payload.catalog)
    _invalidate_runtime_caches()
    return {"catalog": catalog}


@router.post("/apply")
async def apply_catalog(payload: CatalogPayload | None = None, user: dict = Depends(require_role("administrator"))):
    catalog = payload.catalog if payload is not None else get_model_catalog_service().load()
    rendered = get_model_catalog_service().apply(catalog)
    _invalidate_runtime_caches()
    return {
        "message": "Catalog applied to the active .env configuration.",
        "catalog": get_model_catalog_service().load(),
        "env": rendered,
    }


@router.put("/theme")
async def update_theme(update: ThemeUpdate, user: dict = Depends(get_current_user)):
    uid = _uid(user)
    current_ui = load_ui_settings(user_id=uid)
    current_ui["theme"] = update.theme
    save_ui_settings(current_ui, user_id=uid)
    return {"theme": update.theme}


@router.put("/language")
async def update_language(update: LanguageUpdate, user: dict = Depends(get_current_user)):
    uid = _uid(user)
    current_ui = load_ui_settings(user_id=uid)
    current_ui["language"] = update.language
    save_ui_settings(current_ui, user_id=uid)
    return {"language": update.language}


@router.put("/ui")
async def update_ui_settings(update: UISettings, user: dict = Depends(get_current_user)):
    uid = _uid(user)
    current_ui = load_ui_settings(user_id=uid)
    current_ui.update(update.model_dump(exclude_none=True))
    save_ui_settings(current_ui, user_id=uid)
    return current_ui


@router.post("/reset")
async def reset_settings(user: dict = Depends(get_current_user)):
    save_ui_settings(DEFAULT_UI_SETTINGS)
    return DEFAULT_UI_SETTINGS


@router.get("/themes")
async def get_themes(user: dict = Depends(get_current_user)):
    return {
        "themes": [
            {"id": "snow", "name": "Snow"},
            {"id": "light", "name": "Light"},
            {"id": "dark", "name": "Dark"},
            {"id": "glass", "name": "Glass"},
        ]
    }


@router.get("/sidebar")
async def get_sidebar_settings(user: dict = Depends(get_current_user)):
    current_ui = load_ui_settings()
    return {
        "description": current_ui.get(
            "sidebar_description", DEFAULT_UI_SETTINGS["sidebar_description"]
        ),
        "nav_order": current_ui.get("sidebar_nav_order", DEFAULT_UI_SETTINGS["sidebar_nav_order"]),
    }


@router.put("/sidebar/description")
async def update_sidebar_description(update: SidebarDescriptionUpdate, user: dict = Depends(get_current_user)):
    current_ui = load_ui_settings()
    current_ui["sidebar_description"] = update.description
    save_ui_settings(current_ui)
    return {"description": update.description}


@router.put("/sidebar/nav-order")
async def update_sidebar_nav_order(update: SidebarNavOrderUpdate, user: dict = Depends(get_current_user)):
    current_ui = load_ui_settings()
    current_ui["sidebar_nav_order"] = update.nav_order.model_dump()
    save_ui_settings(current_ui)
    return {"nav_order": update.nav_order.model_dump()}


@router.post("/tests/{service}/start")
async def start_service_test(service: str, payload: CatalogPayload | None = None, user: dict = Depends(require_role("administrator"))):
    run = get_config_test_runner().start(service, payload.catalog if payload else None)
    return {"run_id": run.id}


@router.get("/tests/{service}/{run_id}/events")
async def stream_service_test_events(service: str, run_id: str, request: Request, user: dict = Depends(require_role("administrator"))):
    runner = get_config_test_runner()
    run = runner.get(run_id)

    async def event_stream():
        sent = 0
        while True:
            if await request.is_disconnected():
                return
            events = run.snapshot(sent)
            if events:
                for event in events:
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                sent += len(events)
                if events[-1]["type"] in {"completed", "failed"}:
                    return
            else:
                yield "event: heartbeat\ndata: {}\n\n"
            await asyncio.sleep(0.35)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/tests/{service}/{run_id}/cancel")
async def cancel_service_test(service: str, run_id: str, user: dict = Depends(require_role("administrator"))):
    get_config_test_runner().cancel(run_id)
    return {"message": "Cancelled"}


TOUR_CACHE = _pls.get_settings_dir() / ".tour_cache.json"


@router.get("/tour/status")
async def tour_status(user: dict = Depends(get_current_user)):
    if TOUR_CACHE.exists():
        try:
            cache = json.loads(TOUR_CACHE.read_text(encoding="utf-8"))
            return {
                "active": True,
                "status": cache.get("status", "unknown"),
                "launch_at": cache.get("launch_at"),
                "redirect_at": cache.get("redirect_at"),
            }
        except Exception:
            pass
    return {"active": False, "status": "none", "launch_at": None, "redirect_at": None}


class TourCompletePayload(BaseModel):
    catalog: dict[str, Any] | None = None
    test_results: dict[str, str] | None = None


@router.post("/tour/complete")
async def complete_tour(payload: TourCompletePayload | None = None, user: dict = Depends(get_current_user)):
    catalog = payload.catalog if payload and payload.catalog else get_model_catalog_service().load()
    rendered = get_model_catalog_service().apply(catalog)
    _invalidate_runtime_caches()
    now = int(time.time())
    launch_at = now + 3
    redirect_at = now + 5

    if TOUR_CACHE.exists():
        try:
            cache = json.loads(TOUR_CACHE.read_text(encoding="utf-8"))
        except Exception:
            cache = {}
        cache["status"] = "completed"
        cache["launch_at"] = launch_at
        cache["redirect_at"] = redirect_at
        if payload and payload.test_results:
            cache["test_results"] = payload.test_results
        TOUR_CACHE.write_text(json.dumps(cache, indent=2), encoding="utf-8")

    return {
        "status": "completed",
        "message": "Configuration saved. DeepTutor will restart shortly.",
        "launch_at": launch_at,
        "redirect_at": redirect_at,
        "env": rendered,
    }


@router.post("/tour/reopen")
async def reopen_tour(user: dict = Depends(get_current_user)):
    return {
        "message": "Run the terminal setup guide from the project root to re-open the guided setup.",
        "command": "python scripts/start_tour.py",
    }
