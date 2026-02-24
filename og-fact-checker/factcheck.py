"""
Fact Checker — TEE-verified fact checking powered by OpenGradient + MemSync.

Paste any claim, get a cryptographically attested verdict with confidence score.
MemSync remembers past checks for contradiction detection and consistency tracking.
"""

import os
import sys
import json
import time
import hashlib
import argparse
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# OpenGradient client
# ---------------------------------------------------------------------------

def get_og_client():
    try:
        import opengradient as og
    except ImportError:
        print("Error: opengradient not installed. Run: pip install opengradient")
        sys.exit(1)

    pk = os.getenv("OG_PRIVATE_KEY")
    if not pk:
        print("Error: OG_PRIVATE_KEY not set in .env")
        sys.exit(1)

    return og.Client(private_key=pk)


# ---------------------------------------------------------------------------
# MemSync memory layer
# ---------------------------------------------------------------------------

MEMSYNC_BASE = "https://api.memchat.io/v1"


def memsync_headers():
    key = os.getenv("MEMSYNC_API_KEY")
    if not key:
        return None
    return {"X-API-Key": key, "Content-Type": "application/json"}


def store_check(claim: str, result: dict):
    headers = memsync_headers()
    if not headers:
        return None

    summary = (
        f"Fact check: \"{claim}\" → {result['verdict']} "
        f"(confidence: {result['confidence']}%). "
        f"Category: {result['category']}. "
        f"{result['reasoning']}"
    )

    payload = {
        "messages": [
            {"role": "user", "content": f"Fact check: {claim}"},
            {"role": "assistant", "content": summary},
        ],
        "agent_id": "og-fact-checker",
        "thread_id": f"factcheck-{hashlib.md5(claim.lower().encode()).hexdigest()[:12]}",
        "source": "chat",
    }

    try:
        resp = requests.post(
            f"{MEMSYNC_BASE}/memories", json=payload, headers=headers, timeout=15
        )
        return resp.json() if resp.ok else None
    except Exception:
        return None


def recall_checks(query: str, limit: int = 5):
    headers = memsync_headers()
    if not headers:
        return []

    payload = {
        "query": f"Fact check verdict evidence: {query}",
        "limit": limit,
        "rerank": True,
    }

    try:
        resp = requests.post(
            f"{MEMSYNC_BASE}/memories/search", json=payload, headers=headers, timeout=15
        )
        if resp.ok:
            return resp.json().get("memories", [])
    except Exception:
        pass
    return []


# ---------------------------------------------------------------------------
# Local cache
# ---------------------------------------------------------------------------

CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")
CACHE_TTL = 600  # 10 minutes


def _cache_key(claim: str) -> str:
    return hashlib.md5(claim.lower().strip().encode()).hexdigest()


def _cache_path(claim: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, f"{_cache_key(claim)}.json")


def read_cache(claim: str):
    path = _cache_path(claim)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            data = json.load(f)
        if time.time() - data.get("_cached_at", 0) < CACHE_TTL:
            data["_from_cache"] = True
            return data
    except Exception:
        pass
    return None


def write_cache(claim: str, result: dict):
    path = _cache_path(claim)
    result["_cached_at"] = time.time()
    try:
        with open(path, "w") as f:
            json.dump(result, f)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Fact checking via OpenGradient TEE LLM
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a rigorous fact checker. Analyze the given claim and reply ONLY with JSON:
{"claim":"the original claim","verdict":"TRUE|FALSE|MOSTLY_TRUE|MOSTLY_FALSE|MISLEADING|UNVERIFIABLE","confidence":0-100,"category":"SCIENCE|HISTORY|POLITICS|HEALTH|TECHNOLOGY|ECONOMICS|GEOGRAPHY|CULTURE|SPORTS|OTHER","evidence":["point1","point2","point3"],"reasoning":"2-3 sentence explanation","sources":["source1","source2"]}
Verdicts: TRUE=fully accurate, FALSE=factually wrong, MOSTLY_TRUE=largely correct with minor inaccuracies, MOSTLY_FALSE=contains some truth but fundamentally wrong, MISLEADING=technically true but presented deceptively, UNVERIFIABLE=cannot be confirmed or denied with available knowledge."""


def check_claim(client, claim: str, model=None, no_cache: bool = False):
    import opengradient as og

    if model is None:
        model = og.TEE_LLM.CLAUDE_3_5_HAIKU

    if not no_cache:
        cached = read_cache(claim)
        if cached:
            return cached

    user_prompt = f"Fact check this claim: \"{claim}\""

    # Pull related past checks from MemSync for contradiction detection
    past_checks = []
    if os.getenv("MEMSYNC_API_KEY"):
        memories = recall_checks(claim, limit=3)
        if memories:
            past_context = "; ".join(m.get("memory", "")[:100] for m in memories[:3])
            user_prompt += f"\n\nPrevious related checks: {past_context}"
            past_checks = memories

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    result = client.llm.chat(
        model=model,
        messages=messages,
        max_tokens=350,
        temperature=0.1,
        x402_settlement_mode=og.x402SettlementMode.SETTLE_BATCH,
    )

    raw = result.chat_output["content"]
    if raw.strip().startswith("```"):
        lines = raw.strip().split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines)

    check = json.loads(raw)

    # On-chain proof
    check["proof"] = {
        "payment_hash": getattr(result, "payment_hash", None),
        "transaction_hash": getattr(result, "transaction_hash", None),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": str(model),
        "tee_verified": True,
    }

    # Contradiction detection
    check["related_checks"] = len(past_checks)
    if past_checks:
        for mem in past_checks:
            mem_text = mem.get("memory", "")
            for v in ["TRUE", "FALSE", "MOSTLY_TRUE", "MOSTLY_FALSE", "MISLEADING"]:
                if f"→ {v}" in mem_text and v != check["verdict"]:
                    check["contradiction_flag"] = (
                        f"Previous check on similar topic returned {v}, "
                        f"current check returns {check['verdict']}"
                    )
                    break

    # Store in MemSync
    mem_result = store_check(claim, check)
    if mem_result:
        check["memory_stored"] = True

    write_cache(claim, check)
    return check


# ---------------------------------------------------------------------------
# CLI display
# ---------------------------------------------------------------------------

VERDICT_COLORS = {
    "TRUE": "bold green",
    "FALSE": "bold red",
    "MOSTLY_TRUE": "green",
    "MOSTLY_FALSE": "red",
    "MISLEADING": "bold yellow",
    "UNVERIFIABLE": "dim",
}


def print_check(check: dict):
    try:
        from rich.console import Console
        from rich.panel import Panel
        from rich.table import Table
        console = Console()
    except ImportError:
        print(json.dumps(check, indent=2))
        return

    if "error" in check:
        console.print(f"[red]Error: {check['error']}[/red]")
        return

    verdict = check["verdict"]
    confidence = check["confidence"]
    v_color = VERDICT_COLORS.get(verdict, "white")

    # Confidence bar
    filled = confidence // 5
    bar = f"[cyan]{'█' * filled}[/cyan][dim]{'░' * (20 - filled)}[/dim]"

    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column(style="bold cyan", width=16)
    table.add_column()

    table.add_row("Claim", f"[italic]\"{check['claim']}\"[/italic]")
    table.add_row("Verdict", f"[{v_color}]{verdict}[/{v_color}]")
    table.add_row("Confidence", f"{bar} {confidence}%")
    table.add_row("Category", check.get("category", "OTHER"))
    table.add_row("", "")
    table.add_row("Evidence", "")
    for e in check.get("evidence", []):
        table.add_row("", f"  • {e}")
    table.add_row("", "")
    table.add_row("Reasoning", check.get("reasoning", ""))

    if check.get("sources"):
        table.add_row("Sources", ", ".join(check["sources"]))

    if check.get("contradiction_flag"):
        table.add_row("", "")
        table.add_row("Warning", f"[bold yellow]{check['contradiction_flag']}[/bold yellow]")

    proof = check.get("proof", {})
    if proof.get("payment_hash"):
        table.add_row("", "")
        table.add_row("TEE Proof", f"[dim]{proof['payment_hash']}[/dim]")

    if check.get("memory_stored"):
        table.add_row("Memory", "[dim]Stored in MemSync[/dim]")

    if check.get("_from_cache"):
        table.add_row("Cache", "[dim yellow]From cache (0 OPG)[/dim yellow]")

    console.print(Panel(table, title="[bold]Fact Checker[/bold]", border_style="cyan"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="AI Fact Checker — TEE-verified claim verification on OpenGradient"
    )
    parser.add_argument(
        "claim",
        nargs="?",
        help="Claim to fact-check (e.g., \"The Earth is flat\")",
    )
    parser.add_argument(
        "--file", "-f",
        help="Check multiple claims from a file (one per line)",
    )
    parser.add_argument(
        "--model", "-m",
        default="claude-3.5-haiku",
        choices=["gpt-4o", "claude-3.5-haiku", "claude-4.0-sonnet", "grok-3-beta", "gemini-2.5-flash"],
        help="LLM model (default: claude-3.5-haiku)",
    )
    parser.add_argument("--json", "-j", action="store_true", help="Output raw JSON")
    parser.add_argument("--history", action="store_true", help="Search past checks from MemSync")
    parser.add_argument("--no-cache", action="store_true", help="Skip local cache")
    parser.add_argument("--cache-ttl", type=int, default=600, help="Cache TTL in seconds (default: 600)")
    args = parser.parse_args()

    import opengradient as og

    model_map = {
        "gpt-4o": og.TEE_LLM.GPT_4O,
        "claude-3.5-haiku": og.TEE_LLM.CLAUDE_3_5_HAIKU,
        "claude-4.0-sonnet": og.TEE_LLM.CLAUDE_4_0_SONNET,
        "grok-3-beta": og.TEE_LLM.GROK_3_BETA,
        "gemini-2.5-flash": og.TEE_LLM.GEMINI_2_5_FLASH,
    }
    model = model_map.get(args.model, og.TEE_LLM.CLAUDE_3_5_HAIKU)

    global CACHE_TTL
    CACHE_TTL = args.cache_ttl

    # History mode
    if args.history:
        query = args.claim or "fact check"
        memories = recall_checks(query, limit=10)
        if memories:
            print(f"\n--- Past fact checks matching \"{query}\" ---")
            for m in memories:
                print(f"  [{m.get('created_at', '?')}] {m.get('memory', '')}")
        else:
            print("No past checks found.")
        return

    # Batch mode
    if args.file:
        with open(args.file, "r") as f:
            claims = [line.strip() for line in f if line.strip() and not line.startswith("#")]
        client = get_og_client()
        results = []
        for claim in claims:
            try:
                result = check_claim(client, claim, model, no_cache=args.no_cache)
                results.append(result)
                if not args.json:
                    print_check(result)
            except Exception as e:
                results.append({"claim": claim, "error": str(e)})
        if args.json:
            print(json.dumps(results, indent=2))
        return

    # Single claim mode
    if not args.claim:
        parser.print_help()
        sys.exit(1)

    client = get_og_client()
    try:
        result = check_claim(client, args.claim, model, no_cache=args.no_cache)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_check(result)
    except json.JSONDecodeError as e:
        print(f"Error: LLM returned invalid JSON — {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
