"""Low-cardinality Prometheus metrics and explicitly heuristic response proxies."""
import re

from prometheus_client import Counter, Histogram

QUERY_REQUESTS = Counter(
    "cogniloop_query_requests_total",
    "CogniLoop query requests by role and outcome",
    ("role", "outcome"),
)
QUERY_DURATION = Histogram(
    "cogniloop_query_duration_seconds",
    "End-to-end query latency, including Gemini calls and patient persistence",
    ("role",),
)
QUALITY_PROXY = Histogram(
    "cogniloop_response_quality_proxy_score",
    "Lexical heuristic score (0-1); not a clinical or human-rated outcome",
    ("variant", "dimension"),
    buckets=(0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1),
)
QUALITY_DELTA = Histogram(
    "cogniloop_response_quality_proxy_paired_delta",
    "Shifted per-query guided-minus-raw lexical proxy delta (raw range -1 to 1, shifted to 0 to 2); not a clinical outcome",
    ("dimension",),
    buckets=(0, .2, .4, .6, .8, 1, 1.2, 1.4, 1.6, 1.8, 2),
)

SIGNALS = {
    "empathy_language": (
        "understand", "sounds difficult", "that sounds", "i'm sorry", "you are not alone",
        "it makes sense", "must feel", "i hear", "valid", "understandable",
    ),
    "practical_actionability": (
        "try", "consider", "schedule", "reach out", "contact", "practice", "write down",
        "take a moment", "ask", "call", "step", "plan", "could you",
    ),
    "grounded_language": (
        "may", "might", "could", "one possibility", "not enough information", "facts",
        "evidence", "ask for context", "doesn't necessarily", "does not necessarily", "what you know",
    ),
    "catastrophic_language": (
        "will be fired", "will fire", "definitely", "certainly", "termination", "severe consequences",
        "high likelihood", "ruined", "disaster", "worst-case",
    ),
}


def _signal_score(text, phrases):
    normalized = re.sub(r"\s+", " ", (text or "").lower())
    hits = sum(1 for phrase in phrases if phrase in normalized)
    return min(1.0, hits / 2.0)


def record_query(role, outcome, duration, result=None):
    role = "psychologist" if role == "psychologist" else "patient"
    QUERY_REQUESTS.labels(role=role, outcome=outcome).inc()
    QUERY_DURATION.labels(role=role).observe(max(0, duration))
    if outcome != "success" or not result:
        return

    comparison = result.get("raw_llm_comparison", {})
    raw_variant = "raw_live_gemini" if comparison.get("source") == "live_gemini" else "raw_simulated"
    protected_variant = "guided_live_gemini" if result.get("protected_source") == "live_gemini_cognitive" else "guided_fallback"
    variants = {
        raw_variant: comparison.get("raw_text", ""),
        protected_variant: " ".join((result.get("final_answer", ""), result.get("actionable_guidance", ""))),
    }
    scores = {}
    for variant, text in variants.items():
        for dimension, phrases in SIGNALS.items():
            score = _signal_score(text, phrases)
            scores[variant, dimension] = score
            QUALITY_PROXY.labels(variant=variant, dimension=dimension).observe(score)
    for dimension in SIGNALS:
        delta = scores[protected_variant, dimension] - scores[raw_variant, dimension]
        QUALITY_DELTA.labels(dimension=dimension).observe(delta + 1.0)
