"""AI backends for drawing-to-3d V2 feedback loop.

Each backend takes a user's natural-language feedback ("make it thicker",
"scale it 2x", "rotate 90 degrees") plus the current extraction parameters
and returns a JSON-parameter delta the handler can apply to re-extract.

Three backends are supported:
  - ollama      — HTTP POST to a local Ollama server (default http://localhost:11434)
  - claude      — Anthropic Messages API (requires ANTHROPIC_API_KEY)
  - lmstudio    — HTTP POST to a local LM Studio server (default http://localhost:1234)

Plus a built-in `rule_based` fallback that handles common phrasing without any
LLM — useful for offline / CI / zero-setup demos and as the implicit fallback
when a chosen backend is unreachable.
"""
from __future__ import annotations

import json
import os
import re
from typing import Dict, Optional
from urllib import request as urlrequest
from urllib import error as urlerror


# Schema for the JSON a backend must return. Keys are optional; missing keys
# mean "leave the parameter unchanged". Values outside safe bounds are
# clamped at apply time.
PARAM_KEYS = {"extrudeMm", "scaleMmPerPixel", "minAreaPx", "rotateDeg"}

SYSTEM_PROMPT = (
    "You convert a user's drawing-to-3D revision request into a JSON object "
    "of extraction parameter adjustments. Return ONLY JSON, no prose. Valid "
    "keys: extrudeMm (float mm, 0.1..500), scaleMmPerPixel (float, 0.001..10), "
    "minAreaPx (int, 10..10_000_000), rotateDeg (float, 0..360). Omit keys you "
    "don't want to change. Example input: 'make it twice as thick and rotate "
    "90 degrees' with current extrudeMm=5, rotateDeg=0 -> {\"extrudeMm\":10, \"rotateDeg\":90}."
)


def suggest_params(
    backend: str,
    user_feedback: str,
    current_params: dict,
    *,
    timeout_s: float = 30.0,
) -> Dict[str, object]:
    """
    Ask `backend` for a parameter-delta dict. Unknown backends, unreachable
    servers, or malformed responses fall back to rule_based. Return value is
    validated against PARAM_KEYS + clamped to sane bounds.
    """
    if not user_feedback:
        return {}
    try:
        if backend == "ollama":
            raw = _call_ollama(user_feedback, current_params, timeout_s)
        elif backend == "claude":
            raw = _call_claude(user_feedback, current_params, timeout_s)
        elif backend == "lmstudio":
            raw = _call_lmstudio(user_feedback, current_params, timeout_s)
        else:
            raw = None
    except Exception as e:  # network error, auth error, timeout
        print(f"drawing-to-3d: {backend} backend failed ({e}); falling back to rule_based")
        raw = None

    if raw is None:
        return rule_based(user_feedback, current_params)

    parsed = _parse_param_json(raw)
    if not parsed:
        return rule_based(user_feedback, current_params)
    return _clamp(parsed)


# ---------------------------------------------------------------------------
# Rule-based fallback — pure regex; always works offline.
# ---------------------------------------------------------------------------

_NUMBER = r"(-?\d+(?:\.\d+)?)"


def rule_based(user_feedback: str, current_params: dict) -> Dict[str, object]:
    """Parse common phrasing without any LLM. Covers English + German."""
    fb = user_feedback.lower()
    out: Dict[str, object] = {}
    current_extrude = float(current_params.get("extrudeMm", 5.0))
    current_scale = float(current_params.get("scaleMmPerPixel", 0.1))

    # "twice as thick" / "2x thicker" / "doppelt so dick"
    if re.search(r"(twice|doppelt|2x|2 ?x)", fb) and re.search(r"(thick|dick|height|extrude|höhe|hoh)", fb):
        out["extrudeMm"] = current_extrude * 2
    # "half as thick" / "halb so dick"
    elif re.search(r"(half|halb)", fb) and re.search(r"(thick|dick|height|extrude|höhe|hoh)", fb):
        out["extrudeMm"] = current_extrude / 2
    # "make it 10mm thick" / "10 mm dick"
    else:
        m = re.search(rf"{_NUMBER}\s*(mm)?\s*(thick|dick|extrude|height|höhe|hoh)", fb)
        if m:
            out["extrudeMm"] = float(m.group(1))

    # Scale: "2x bigger/larger/größer" → scale doubles
    if re.search(r"(2x|twice|doppelt)\s*(bigger|larger|grösser|groesser|größer)", fb):
        out["scaleMmPerPixel"] = current_scale * 2
    elif re.search(r"(half|halb)\s*(size|so gross|so groß)", fb):
        out["scaleMmPerPixel"] = current_scale / 2

    # Rotation: "rotate 90" / "drehe 90 grad"
    m = re.search(rf"(rotate|drehe|drehen|um)\s*{_NUMBER}", fb)
    if m:
        out["rotateDeg"] = float(m.group(2)) % 360

    # Noise threshold: "ignore small / tiny / noise"
    if re.search(r"(ignore|skip|drop)\s+(small|tiny|noise|artefakt)", fb):
        out["minAreaPx"] = int(current_params.get("minAreaPx", 100)) * 5

    return _clamp(out)


# ---------------------------------------------------------------------------
# Backends
# ---------------------------------------------------------------------------

def _call_ollama(feedback: str, current: dict, timeout_s: float) -> Optional[str]:
    base = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "llama3.2")
    body = json.dumps({
        "model": model,
        "stream": False,
        "format": "json",
        "system": SYSTEM_PROMPT,
        "prompt": f"Current params: {json.dumps(current)}\nUser feedback: {feedback}",
    }).encode("utf-8")
    req = urlrequest.Request(
        f"{base}/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=timeout_s) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    return payload.get("response")


def _call_claude(feedback: str, current: dict, timeout_s: float) -> Optional[str]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    model = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
    body = json.dumps({
        "model": model,
        "max_tokens": 200,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": f"Current params: {json.dumps(current)}\nUser feedback: {feedback}"}
        ],
    }).encode("utf-8")
    req = urlrequest.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=timeout_s) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    blocks = payload.get("content") or []
    for b in blocks:
        if b.get("type") == "text":
            return b.get("text")
    return None


def _call_lmstudio(feedback: str, current: dict, timeout_s: float) -> Optional[str]:
    base = os.environ.get("LMSTUDIO_URL", "http://localhost:1234")
    model = os.environ.get("LMSTUDIO_MODEL", "local-model")
    body = json.dumps({
        "model": model,
        "temperature": 0.1,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Current params: {json.dumps(current)}\nUser feedback: {feedback}"},
        ],
    }).encode("utf-8")
    req = urlrequest.Request(
        f"{base}/v1/chat/completions",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=timeout_s) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    choices = payload.get("choices") or []
    if not choices:
        return None
    return choices[0].get("message", {}).get("content")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_param_json(raw: str) -> Optional[dict]:
    """Best-effort extract a JSON object from the backend's response.

    Backends may wrap JSON in prose or code fences even with strict prompts;
    accept anything that contains a valid top-level object.
    """
    if not raw:
        return None
    # Fast path: response is already a pure JSON object.
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass
    # Slow path: grab the first balanced {...} block.
    m = re.search(r"\{[^{}]*\}", raw, flags=re.DOTALL)
    if m:
        try:
            obj = json.loads(m.group(0))
            if isinstance(obj, dict):
                return obj
        except Exception:
            return None
    return None


def _clamp(delta: dict) -> Dict[str, object]:
    """Drop unknown keys + clamp numeric values to safe ranges."""
    out: Dict[str, object] = {}
    if "extrudeMm" in delta:
        v = float(delta["extrudeMm"])
        out["extrudeMm"] = max(0.1, min(500.0, v))
    if "scaleMmPerPixel" in delta:
        v = float(delta["scaleMmPerPixel"])
        out["scaleMmPerPixel"] = max(0.001, min(10.0, v))
    if "minAreaPx" in delta:
        v = int(delta["minAreaPx"])
        out["minAreaPx"] = max(10, min(10_000_000, v))
    if "rotateDeg" in delta:
        v = float(delta["rotateDeg"]) % 360.0
        out["rotateDeg"] = v
    return out
