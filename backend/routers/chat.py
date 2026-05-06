"""
Chat endpoint — frontend ChatInput'tan gelen istekleri Anthropic Claude'a iletir.
Bağlam (sistem promptu) `services.context_builder` tarafından inşa edilir.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from schemas import ChatRequest, ChatResponse
from services.context_builder import build_system_prompt
from services.llm import chat_completion

router = APIRouter()

logger = logging.getLogger("neuro.chat")


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=422, detail="Prompt boş olamaz.")

    system_prompt = build_system_prompt(req)
    logger.info(
        "chat: view=%s, nodes=%d, comments=%d, prompt_len=%d, system_len=%d",
        req.view.kind,
        len(req.activeNodes),
        len(req.observerComments),
        len(req.prompt),
        len(system_prompt),
    )

    try:
        result = chat_completion(system_prompt, req.prompt.strip())
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover — provider hatası
        logger.exception("chat: LLM çağrısı başarısız")
        raise HTTPException(status_code=502, detail=f"LLM hatası: {exc}") from exc

    # Teşhis log'u
    debug_tool_calls = result.pop("_debug_tool_calls", [])
    debug_force_tool = result.pop("_debug_force_tool", False)
    debug_fallback = result.pop("_debug_fallback", False)
    logger.info(
        "chat: model=%s in=%d out=%d files=%d force_tool=%s fallback=%s tool_calls=%s",
        result["model"],
        result["inputTokens"],
        result["outputTokens"],
        len(result.get("generatedFiles", [])),
        debug_force_tool,
        debug_fallback,
        debug_tool_calls or "[]",
    )

    return ChatResponse(**result)
