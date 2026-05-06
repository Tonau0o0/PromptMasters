"""
Google Gemini wrapper — tool calling destekli.

Gemini'nin function calling özelliği ile `services.tools` içindeki araçlar (xlsx/docx/pdf
üreticileri) LLM'e tanıtılır. LLM bir araç çağırırsa backend onu çalıştırır ve final
yanıt için ikinci tur yapılır.
"""
from __future__ import annotations

import logging
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types

from services.tools import execute_tool, get_tool_declarations

logger = logging.getLogger("neuro.llm")

# .env dosyası proje kökünde — backend/services/llm.py konumundan 3 seviye üstte.
# load_dotenv() default'ı cwd'ye bağımlı; absolute path daha güvenilir.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_PROJECT_ROOT / ".env", override=False)

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_MAX_TOKENS = int(os.environ.get("GEMINI_MAX_TOKENS", "8192"))
DEFAULT_TEMPERATURE = float(os.environ.get("GEMINI_TEMPERATURE", "0.7"))

# Pro modeli (özellikle ücretsiz tier'da) sıkça 503 döner. Yoğunsa flash'a düşeriz.
FALLBACK_MODEL = os.environ.get("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash")
# Bir model için aynı turda kaç kez retry edilir + aralarında bekleme süresi
_RETRY_DELAYS = (1.0, 2.0, 4.0)  # toplam max ~7s

# Tool döngüsünde max kaç tur LLM çağırılır (sonsuz döngüye düşmemek için).
MAX_TOOL_TURNS = 4

# Kullanıcı promptunda bu kelimelerden biri geçiyorsa ilk turda tool çağrısını ZORLARIZ.
# Gemini AUTO modu bazen "yapamam" diyerek araçları yok sayıyor.
_TOOL_TRIGGER_KEYWORDS = (
    "excel", "xlsx", "csv", "tablo", "liste", "sayfa",
    "word", "docx", "doküman", "dokuman", "doc",
    "pdf", "rapor", "sunum", "broşür", "brosur",
    "indir", "dosya", "çıktı", "cikti", "üret", "uret",
)


def _should_force_tool(user_prompt: str) -> bool:
    p = user_prompt.lower()
    return any(kw in p for kw in _TOOL_TRIGGER_KEYWORDS)


def _is_transient_error(exc: Exception) -> bool:
    """503/502/500/504/UNAVAILABLE/timeout/connection — yeniden denenebilir hatalar."""
    msg = str(exc).lower()
    return any(
        marker in msg
        for marker in (
            "503", "502", "500", "504",
            "unavailable", "deadline", "timeout",
            "exhausted", "temporarily", "connection",
        )
    )


def _generate_with_resilience(
    client: genai.Client,
    contents: list[Any],
    config: genai_types.GenerateContentConfig,
    primary_model: str,
) -> tuple[Any, str, str | None]:
    """
    Primary model'i 3 kere dene; her geçici hatada exponential backoff.
    Hâlâ fail ediyorsa FALLBACK_MODEL'e geç (örn. pro → flash).
    Returns: (response, used_model, optional_notice_for_user)
    """
    last_exc: Exception | None = None

    # 1) Primary model + retry
    for attempt, delay in enumerate(_RETRY_DELAYS, start=1):
        try:
            return (
                client.models.generate_content(model=primary_model, contents=contents, config=config),
                primary_model,
                None,
            )
        except Exception as exc:
            last_exc = exc
            if not _is_transient_error(exc):
                raise
            logger.warning(
                "Geçici hata (%s, deneme %d/%d): %s",
                primary_model, attempt, len(_RETRY_DELAYS), exc,
            )
            if attempt < len(_RETRY_DELAYS):
                time.sleep(delay)

    # 2) Fallback model (eğer farklıysa)
    if FALLBACK_MODEL and FALLBACK_MODEL != primary_model:
        logger.warning(
            "Primary '%s' başarısız → fallback '%s' deneniyor", primary_model, FALLBACK_MODEL,
        )
        for attempt, delay in enumerate(_RETRY_DELAYS, start=1):
            try:
                response = client.models.generate_content(
                    model=FALLBACK_MODEL, contents=contents, config=config,
                )
                notice = (
                    f"_(Not: `{primary_model}` şu an yoğun, yanıt `{FALLBACK_MODEL}` "
                    f"ile üretildi.)_"
                )
                return response, FALLBACK_MODEL, notice
            except Exception as exc:
                last_exc = exc
                if not _is_transient_error(exc):
                    raise
                logger.warning(
                    "Fallback de hata verdi (deneme %d/%d): %s",
                    attempt, len(_RETRY_DELAYS), exc,
                )
                if attempt < len(_RETRY_DELAYS):
                    time.sleep(delay)

    # Tümü fail: anlamlı hata mesajıyla yükselt
    raise RuntimeError(
        f"LLM erişilemiyor: tüm denemeler başarısız. Son hata: {last_exc}\n\n"
        "Çözüm önerileri:\n"
        "  • Birkaç dakika bekleyip tekrar deneyin (Google tarafında geçici tıkanma).\n"
        f"  • `.env` dosyasında modeli değiştirin: GEMINI_MODEL=gemini-2.5-flash\n"
        "  • Quota sınırına ulaşıldıysa: https://aistudio.google.com/apikey"
    ) from last_exc


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        env_path = _PROJECT_ROOT / ".env"
        diagnostics = [
            f"PROJECT_ROOT: {_PROJECT_ROOT}",
            f".env path:    {env_path}",
            f".env exists:  {env_path.exists()}",
        ]
        if env_path.exists():
            try:
                content = env_path.read_text(encoding="utf-8", errors="replace")
                has_key_line = any(
                    line.strip().startswith(("GOOGLE_API_KEY=", "GEMINI_API_KEY="))
                    for line in content.splitlines()
                )
                diagnostics.append(f".env satır sayısı:        {len(content.splitlines())}")
                diagnostics.append(f".env GOOGLE_API_KEY satırı: {'VAR' if has_key_line else 'YOK'}")
                if has_key_line:
                    diagnostics.append(
                        "Satır var ama os.environ'a yüklenmemiş — Electron'u yeniden başlatın."
                    )
            except Exception as exc:
                diagnostics.append(f".env okunamadı: {exc}")
        raise RuntimeError(
            "GOOGLE_API_KEY (veya GEMINI_API_KEY) tanımlı değil.\n"
            + "\n".join(diagnostics)
            + "\n\nÇözüm:\n"
            "  1) https://aistudio.google.com/apikey adresinden anahtar alın.\n"
            "  2) Proje kökündeki `.env` dosyasına satır olarak ekleyin:\n"
            "       GOOGLE_API_KEY=AIzaSy...\n"
            "  3) Electron'u TAMAMEN kapatıp (CTRL+C) yeniden açın (npm run electron:dev)."
        )
    return genai.Client(api_key=api_key)


def chat_completion(system_prompt: str, user_prompt: str) -> dict:
    """Tool-aware Gemini çağrısı. LLM bir araç çağırırsa onu çalıştırır ve döner."""
    client = _get_client()
    tools = get_tool_declarations()

    contents: list[Any] = [
        genai_types.Content(role="user", parts=[genai_types.Part(text=user_prompt)]),
    ]

    # Heuristic: dosya üretimi belli ise ilk turda tool çağrısını ZORLA.
    # Sonraki turlarda AUTO'ya dönülür ki LLM final metni yazabilsin.
    force_tool_first_turn = _should_force_tool(user_prompt)
    initial_mode = (
        genai_types.FunctionCallingConfigMode.ANY
        if force_tool_first_turn
        else genai_types.FunctionCallingConfigMode.AUTO
    )

    def _make_config(mode: genai_types.FunctionCallingConfigMode) -> genai_types.GenerateContentConfig:
        return genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=DEFAULT_MAX_TOKENS,
            temperature=DEFAULT_TEMPERATURE,
            tools=tools,
            tool_config=genai_types.ToolConfig(
                function_calling_config=genai_types.FunctionCallingConfig(mode=mode),
            ),
        )

    config = _make_config(initial_mode)

    text_parts: list[str] = []
    generated_files: list[dict] = []
    total_input_tokens = 0
    total_output_tokens = 0
    tool_call_log: list[str] = []
    fallback_notice: str | None = None
    current_model = DEFAULT_MODEL

    for turn_idx in range(MAX_TOOL_TURNS):
        # 2. tur ve sonrası AUTO — LLM final yanıt verebilsin
        if turn_idx > 0 and force_tool_first_turn:
            config = _make_config(genai_types.FunctionCallingConfigMode.AUTO)

        response, current_model, this_notice = _generate_with_resilience(
            client=client,
            contents=contents,
            config=config,
            primary_model=current_model,
        )
        # Fallback'e bir kez düşersek, sonraki turlar da fallback'te kalır
        if this_notice and not fallback_notice:
            fallback_notice = this_notice

        usage = response.usage_metadata
        if usage:
            total_input_tokens += usage.prompt_token_count or 0
            total_output_tokens += usage.candidates_token_count or 0

        if not response.candidates or not response.candidates[0].content:
            break

        candidate = response.candidates[0]
        parts = candidate.content.parts or []

        function_calls: list[Any] = []
        for part in parts:
            if getattr(part, "text", None):
                text_parts.append(part.text)
            if getattr(part, "function_call", None):
                function_calls.append(part.function_call)

        if not function_calls:
            break  # final yanıt geldi

        # Tool turu: assistant content'i geri yansıt + her function_call için response
        contents.append(candidate.content)

        function_response_parts: list[genai_types.Part] = []
        for fc in function_calls:
            args = dict(fc.args) if fc.args else {}
            tool_call_log.append(f"turn={turn_idx} tool={fc.name} args_keys={list(args.keys())}")
            result = execute_tool(fc.name, args)
            if "file_id" in result:
                generated_files.append(
                    {
                        "file_id": result["file_id"],
                        "filename": result["filename"],
                        "mime": result["mime"],
                    }
                )
            function_response_parts.append(
                genai_types.Part(
                    function_response=genai_types.FunctionResponse(
                        name=fc.name,
                        response={"result": result},
                    )
                )
            )

        contents.append(genai_types.Content(role="user", parts=function_response_parts))
        # döngü devam — LLM tool sonucunu görüp final yanıtı versin

    text = "".join(text_parts).strip() or "(boş yanıt)"
    if fallback_notice:
        text = f"{fallback_notice}\n\n{text}"

    return {
        "content": text,
        "model": current_model,
        "inputTokens": total_input_tokens,
        "outputTokens": total_output_tokens,
        "generatedFiles": generated_files,
        "_debug_tool_calls": tool_call_log,
        "_debug_force_tool": force_tool_first_turn,
        "_debug_fallback": fallback_notice is not None,
    }
