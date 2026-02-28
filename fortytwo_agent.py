"""
Fortytwo Swarm Agent — Fully automated answering & judging daemon.

Monitors for new queries and judging challenges, generates expert answers
via OpenRouter, and submits them automatically. Includes likes system and
query completion tracking per official Fortytwo docs.

Usage:
  python fortytwo_agent.py
"""

import json
import urllib.request
import base64
import time
import sys
import traceback
import os
from datetime import datetime, timezone

# ─── Config ───────────────────────────────────────────────────────────────────

BASE_URL = "https://app.fortytwo.network/api"
AGENT_ID = "04bc0c37-3ced-427a-bd57-42fb080185a1"
SECRET = "J-1KD5krK4vng6KhBJxbR090l9G38GhVMDO6XvS65vM"
TOKEN_FILE = "C:/Users/DELL/Desktop/crabdao-agent/fortytwo_tokens.json"
OPENCLAW_CONFIG = os.path.expanduser("~/.openclaw/skills/fortytwo/config.json")

OPENROUTER_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free models via OpenRouter (no credits needed)
JUDGE_MODEL = "arcee-ai/trinity-large-preview:free"
ANSWER_MODEL = "arcee-ai/trinity-large-preview:free"

POLL_INTERVAL = 45  # seconds between checks
TOKEN_REFRESH_INTERVAL = 600  # refresh token every 10 min
CONFIDENCE_THRESHOLD = 7  # minimum confidence (1-10) to submit an answer
RATE_LIMIT_WAIT = 60  # seconds to wait on 429

# ─── State ────────────────────────────────────────────────────────────────────

access_token = None
refresh_token_val = None
last_token_refresh = 0
answered_queries = set()
judged_challenges = set()
skipped_queries = set()  # queries we decided to skip
tracked_queries = set()  # queries we're tracking for completion
stats = {"answers": 0, "judgings": 0, "errors": 0, "cycles": 0, "skipped": 0, "likes": 0}

# ─── Logging ──────────────────────────────────────────────────────────────────

def log(tag, msg):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] [{tag}] {msg}", flush=True)

# ─── HTTP Helpers ─────────────────────────────────────────────────────────────

def http(method, url, data=None, headers=None, timeout=30):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        code = e.code
        if code == 429:
            log("HTTP", f"Rate limited on {method} {url}, waiting {RATE_LIMIT_WAIT}s...")
            time.sleep(RATE_LIMIT_WAIT)
            # Retry once after waiting
            try:
                req2 = urllib.request.Request(url, data=body, headers=hdrs, method=method)
                with urllib.request.urlopen(req2, timeout=timeout) as resp:
                    return json.loads(resp.read().decode("utf-8")), resp.status
            except urllib.error.HTTPError as e2:
                try:
                    return json.loads(e2.read().decode("utf-8")), e2.code
                except:
                    return {"detail": str(e2)}, e2.code
        try:
            return json.loads(e.read().decode("utf-8")), code
        except:
            return {"detail": str(e)}, code
    except Exception as e:
        return {"detail": str(e)}, 0

def api(method, path, data=None):
    headers = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return http(method, f"{BASE_URL}{path}", data, headers)

def safe_api(method, path, data=None):
    r, c = api(method, path, data)
    if c == 401:
        ensure_auth()
        r, c = api(method, path, data)
    return r, c

# ─── Auth ─────────────────────────────────────────────────────────────────────

def do_login():
    global access_token, refresh_token_val
    r, c = http("POST", f"{BASE_URL}/auth/login",
                 {"agent_id": AGENT_ID, "secret": SECRET})
    if c == 200:
        access_token = r["tokens"]["access_token"]
        refresh_token_val = r["tokens"]["refresh_token"]
        save_tokens(r)
        return True
    log("AUTH", f"Login failed: {r}")
    return False

def do_refresh():
    global access_token, refresh_token_val
    r, c = http("POST", f"{BASE_URL}/auth/refresh",
                 {"refresh_token": refresh_token_val})
    if c == 200:
        access_token = r["tokens"]["access_token"]
        refresh_token_val = r["tokens"]["refresh_token"]
        save_tokens(r)
        return True
    return do_login()

def ensure_auth():
    global last_token_refresh
    now = time.time()
    if now - last_token_refresh > TOKEN_REFRESH_INTERVAL:
        do_refresh()
        last_token_refresh = now

def save_tokens(data):
    with open(TOKEN_FILE, "w") as f:
        json.dump(data, f, indent=2)

def load_tokens():
    global access_token, refresh_token_val
    try:
        with open(TOKEN_FILE, encoding="utf-8") as f:
            data = json.load(f)
        access_token = data["tokens"]["access_token"]
        refresh_token_val = data["tokens"]["refresh_token"]
    except:
        do_login()

# ─── OpenRouter LLM ──────────────────────────────────────────────────────────

def llm_generate(messages, max_tokens=2000, temperature=0.1, model=None):
    """Call OpenRouter to generate a response."""
    data = {
        "model": model or ANSWER_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://app.fortytwo.network",
        "X-Title": "Fortytwo Agent",
    }
    r, c = http("POST", OPENROUTER_URL, data, headers, timeout=300)
    if c == 200:
        content = r["choices"][0]["message"].get("content", "")
        if not content:
            content = r["choices"][0]["message"].get("reasoning", "")
        return content
    log("LLM", f"Error {c}: {r}")
    return None

# ─── Answering ────────────────────────────────────────────────────────────────

def generate_and_evaluate_answer(question, specialization):
    """Generate an answer with self-evaluation. Returns (answer, confidence)."""

    # Step 1: Generate answer with chain-of-thought
    system = (
        "You are a world-class expert competing in a knowledge swarm where your answers "
        "are ranked against other AI agents by human-level judges. Answers that judges "
        "deem 'not good enough' lose their stake. You must provide genuinely excellent answers.\n\n"
        "RULES FOR WINNING:\n"
        "1. DIRECTLY answer the question first, then explain. Judges value directness.\n"
        "2. Be ACCURATE above all. Wrong answers get slashed. If unsure, reason carefully step-by-step.\n"
        "3. For math/science: show clean step-by-step work. Verify your answer with a second method.\n"
        "4. For factual questions: be specific with names, dates, numbers. No vague generalities.\n"
        "5. Follow the EXACT format requested. If it asks for a number, lead with the number.\n"
        "6. Be substantive but concise. No filler, no disclaimers, no 'As an AI...' hedging.\n"
        "7. Structure clearly: use paragraphs, not walls of text.\n"
        "8. Quality over quantity. A precise 3-sentence answer beats a rambling 3-paragraph one.\n\n"
        "After your answer, on a NEW LINE, write exactly:\n"
        "CONFIDENCE: X/10\n"
        "where X is your honest confidence that this answer is correct and would be ranked "
        "in the top half by expert judges. Be honest — overconfidence wastes stake."
    )
    user = (
        f"Domain: {specialization}\n\n"
        f"Question:\n{question}\n\n"
        "Provide your best answer. Remember: wrong answers lose 2.5 FOR. "
        "Only answer if you're confident you're correct."
    )

    result = llm_generate(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=2500,
        temperature=0.1,
    )

    if not result:
        return None, 0

    # Extract confidence score
    confidence = 5  # default if not found
    lines = result.strip().split("\n")
    answer_lines = []
    for line in lines:
        if line.strip().upper().startswith("CONFIDENCE:"):
            try:
                score = line.split(":")[1].strip().split("/")[0].strip()
                confidence = int(score)
            except:
                pass
        else:
            answer_lines.append(line)

    answer = "\n".join(answer_lines).strip()
    return answer, confidence


def handle_query(query):
    """Join, read, generate high-quality answer with confidence check, then submit."""
    qid = query["id"]
    spec = query.get("specialization", "general")

    if qid in answered_queries or qid in skipped_queries:
        return

    # Check min_intelligence_rank requirement
    min_rank = query.get("min_intelligence_rank", 0)
    if min_rank > 0:
        log("ANSWER", f"Skipping {qid[:8]} ({spec}) — requires intelligence rank {min_rank}")
        skipped_queries.add(qid)
        stats["skipped"] += 1
        return

    # Step 1: Join (required to read content — stakes FOR)
    r, c = safe_api("POST", f"/queries/{qid}/join")
    if c != 200 and "already" not in str(r).lower():
        log("ANSWER", f"Failed to join {qid[:8]}: {r}")
        if any(k in str(r).lower() for k in ["maximum", "closed", "not found"]):
            answered_queries.add(qid)
        return
    log("ANSWER", f"Joined {qid[:8]} ({spec})")

    # Step 2: Read the question
    r, c = safe_api("GET", f"/queries/{qid}")
    if c != 200:
        log("ANSWER", f"Can't read {qid[:8]}: {r}")
        return

    content = r.get("decrypted_content", "")
    if not content:
        log("ANSWER", f"No content for {qid[:8]}")
        answered_queries.add(qid)
        return

    # Step 3: Generate answer with confidence self-evaluation
    log("ANSWER", f"Generating answer for {qid[:8]} ({spec})...")
    answer, confidence = generate_and_evaluate_answer(content, spec)

    if not answer:
        log("ANSWER", f"LLM failed for {qid[:8]}")
        stats["errors"] += 1
        return

    # Step 4: If confidence is very low, try once more with a different approach
    if confidence < CONFIDENCE_THRESHOLD:
        log("ANSWER", f"Low confidence {confidence}/10 for {qid[:8]}, retrying...")
        answer2, confidence2 = generate_and_evaluate_answer(content, spec)
        if answer2 and confidence2 > confidence:
            answer, confidence = answer2, confidence2

    # Step 5: Submit (stake is already locked, so submit our best attempt)
    log("ANSWER", f"Submitting {qid[:8]} ({spec}) — confidence {confidence}/10")
    encoded = base64.b64encode(answer.encode("utf-8")).decode("utf-8")
    r, c = safe_api("POST", f"/queries/{qid}/answers", {"encrypted_content": encoded})
    if c == 200:
        log("ANSWER", f"Submitted {qid[:8]} ({spec}) — conf:{confidence}/10, answer #{r.get('answer_count', '?')}")
        answered_queries.add(qid)
        tracked_queries.add(qid)
        stats["answers"] += 1
    else:
        log("ANSWER", f"Submit failed {qid[:8]}: {c} {r}")
        stats["errors"] += 1
        if any(k in str(r).lower() for k in ["grace", "closed", "already"]):
            answered_queries.add(qid)

# ─── Judging ──────────────────────────────────────────────────────────────────

def rank_answers(question, answers, specialization):
    """Use LLM to rank answers using pairwise comparison method per Fortytwo docs.

    Method:
    1. Generate 2N pairs (N adjacent + N skip-one, circular)
    2. Compare each pair in both directions (4N total comparisons)
    3. Count wins per answer
    4. Sort by win count for final ranking
    5. Top half = "good enough"
    """
    n = len(answers)
    if n == 0:
        return None, None
    if n == 1:
        return [answers[0]["id"]], [answers[0]["id"]]

    # Build answer lookup
    answer_map = {}
    for i, a in enumerate(answers):
        aid = a["id"]
        content = a.get("decrypted_content", a.get("encrypted_content", "N/A"))
        answer_map[aid] = {"index": i, "content": content, "id": aid}

    # Generate 2N pairs: N adjacent + N skip-one (circular)
    pairs = []
    ids = [a["id"] for a in answers]
    for i in range(n):
        pairs.append((ids[i], ids[(i + 1) % n]))  # adjacent
    for i in range(n):
        pairs.append((ids[i], ids[(i + 2) % n]))  # skip-one

    # Remove self-comparisons (can happen with n <= 2)
    pairs = [(a, b) for a, b in pairs if a != b]
    # Remove duplicate pairs
    seen_pairs = set()
    unique_pairs = []
    for a, b in pairs:
        key = (a, b)
        if key not in seen_pairs:
            seen_pairs.add(key)
            unique_pairs.append((a, b))
    pairs = unique_pairs

    # Build all comparisons (both directions for each pair)
    comparisons = []
    for a, b in pairs:
        comparisons.append((a, b))
        if (b, a) not in [(c[0], c[1]) for c in comparisons]:
            comparisons.append((b, a))

    # Format comparisons for LLM
    comp_text = ""
    for idx, (a_id, b_id) in enumerate(comparisons):
        a_content = answer_map[a_id]["content"]
        b_content = answer_map[b_id]["content"]
        # Truncate very long answers for comparison
        if len(a_content) > 1500:
            a_content = a_content[:1500] + "..."
        if len(b_content) > 1500:
            b_content = b_content[:1500] + "..."
        comp_text += f"\n=== COMPARISON {idx+1} ===\n"
        comp_text += f"ANSWER_A (ID: {a_id}):\n{a_content}\n\n"
        comp_text += f"ANSWER_B (ID: {b_id}):\n{b_content}\n"

    system = (
        "You are an expert judge in a competitive knowledge swarm. Your task is to do "
        "pairwise comparisons of answers. For each comparison, decide which answer is BETTER "
        "for the given question.\n\n"
        "JUDGING CRITERIA (in order of importance):\n"
        "1. ACCURACY: Is the answer factually correct? Wrong answers always lose.\n"
        "2. DIRECTNESS: Does it actually answer the question asked?\n"
        "3. REASONING: Is the logic sound and well-explained?\n"
        "4. COMPLETENESS: Does it address all parts of the question?\n"
        "5. CLARITY: Is it well-structured and easy to follow?\n\n"
        "IMPORTANT: An answer that is WRONG but verbose should LOSE to a correct but brief answer.\n"
        "Focus on SUBSTANCE over length or style.\n\n"
        "For each comparison, output the ID of the winner (ANSWER_A's ID or ANSWER_B's ID). "
        "If genuinely tied, output \"TIE\".\n\n"
        "Output ONLY valid JSON, no other text."
    )
    user = (
        f"Domain: {specialization}\n\n"
        f"QUESTION:\n{question}\n\n"
        f"Below are {len(comparisons)} pairwise comparisons. For each one, decide which answer "
        f"better answers the question above.\n"
        f"{comp_text}\n\n"
        f"Output a JSON object with a \"results\" array containing one entry per comparison, "
        f"in order. Each entry should be the ID of the winning answer, or \"TIE\".\n\n"
        f"Example format:\n"
        f'{{"results": ["id-of-winner-1", "id-of-winner-2", "TIE", "id-of-winner-4", ...]}}\n\n'
        f"Valid JSON only. No markdown, no explanation."
    )

    result = llm_generate(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=3000,
        temperature=0.0,
        model=JUDGE_MODEL,
    )

    if not result:
        return None, None

    # Parse results and count wins
    try:
        text = result.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        data = json.loads(text)
        results = data.get("results", [])
    except:
        log("JUDGE", f"Failed to parse pairwise results: {result[:300]}")
        return None, None

    # Count wins
    win_count = {aid: 0 for aid in ids}
    for idx, winner in enumerate(results):
        if idx >= len(comparisons):
            break
        winner = str(winner).strip()
        if winner in win_count:
            win_count[winner] += 1

    # Sort by win count (highest first)
    ranked_ids = sorted(ids, key=lambda x: win_count[x], reverse=True)

    # Determine "good enough" — top half, at least 1
    good_count = max(1, n // 2)
    good_ids = ranked_ids[:good_count]

    log("JUDGE", f"Pairwise wins: {', '.join(f'{aid[:8]}={win_count[aid]}' for aid in ranked_ids[:5])}...")

    return ranked_ids, good_ids

def handle_challenge(challenge):
    """Join, read answers, rank, and submit vote."""
    cid = challenge["id"]
    qid = challenge["query_id"]
    spec = challenge.get("query_specialization", "general")

    if cid in judged_challenges:
        return

    # Can't judge own answers
    if qid in answered_queries:
        log("JUDGE", f"Skipping {cid[:8]} — we answered this query")
        judged_challenges.add(cid)
        return

    # Check eligibility
    r, c = safe_api("GET", f"/rankings/challenges/{cid}/eligibility/{AGENT_ID}")
    if c != 200 or not r.get("eligible", False):
        reason = r.get("reason", "unknown")
        log("JUDGE", f"Not eligible for {cid[:8]}: {reason}")
        judged_challenges.add(cid)
        return

    # Join
    r, c = safe_api("POST", f"/rankings/challenges/{cid}/join")
    if c != 200 and "already" not in str(r).lower():
        log("JUDGE", f"Failed to join {cid[:8]}: {c} {r}")
        if "deadline" in str(r).lower() or "passed" in str(r).lower():
            judged_challenges.add(cid)
        return
    log("JUDGE", f"Joined challenge {cid[:8]} ({spec})")

    # Get the query content
    qr, qc = safe_api("GET", f"/queries/{qid}")
    question = qr.get("decrypted_content", "") if qc == 200 else ""

    # Get answers
    r, c = safe_api("GET", f"/rankings/challenges/{cid}/answers")
    if c != 200:
        log("JUDGE", f"Failed to get answers for {cid[:8]}: {r}")
        return

    answers = r if isinstance(r, list) else r.get("answers", [])
    if not answers:
        log("JUDGE", f"No answers for {cid[:8]}")
        return

    log("JUDGE", f"Ranking {len(answers)} answers for {cid[:8]} ({spec})...")
    rankings, good = rank_answers(question, answers, spec)

    if not rankings:
        all_ids = [a["id"] for a in answers]
        rankings = all_ids
        good = all_ids[:max(1, len(all_ids) // 2)]
        log("JUDGE", f"Using fallback ranking for {cid[:8]}")

    # Validate: all answer IDs must be present
    all_ids = {a["id"] for a in answers}
    rankings_set = set(rankings)
    if rankings_set != all_ids:
        missing = all_ids - rankings_set
        if missing:
            rankings.extend(list(missing))
        rankings = [r for r in rankings if r in all_ids]
        seen = set()
        deduped = []
        for r in rankings:
            if r not in seen:
                seen.add(r)
                deduped.append(r)
        rankings = deduped
        good = [g for g in good if g in all_ids]

    if not good:
        good = [rankings[0]]

    # Submit vote
    vote_data = {
        "challenge_id": cid,
        "answer_rankings": rankings,
        "good_answers": good,
    }
    r, c = safe_api("POST", "/rankings/votes", vote_data)
    if c == 200:
        log("JUDGE", f"Voted on {cid[:8]} ({spec}) — ranked {len(rankings)} answers")
        judged_challenges.add(cid)
        tracked_queries.add(qid)
        stats["judgings"] += 1
    else:
        log("JUDGE", f"Vote failed for {cid[:8]}: {c} {r}")
        stats["errors"] += 1
        if "already" in str(r).lower() or "deadline" in str(r).lower():
            judged_challenges.add(cid)

# ─── Likes ───────────────────────────────────────────────────────────────────

def handle_likes():
    """Like outstanding content from completed queries to earn FOR."""
    # Check remaining daily likes
    r, c = safe_api("GET", "/likes/remaining")
    if c != 200:
        return
    remaining = r.get("remaining", 0)
    if remaining <= 0:
        return

    # Check recent completed queries we participated in
    stakes, sc = safe_api("GET", f"/economy/stakes/{AGENT_ID}?status=resolved&page=1&page_size=5")
    if sc != 200 or not stakes:
        return

    stake_list = stakes if isinstance(stakes, list) else stakes.get("stakes", [])
    for stake in stake_list[:3]:  # limit to 3 per cycle
        if remaining <= 0:
            break
        qid = stake.get("query_id")
        if not qid:
            continue

        # Get query result to find the winning answer
        result, rc = safe_api("GET", f"/rankings/queries/{qid}/result")
        if rc != 200 or not result:
            continue

        winning_id = result.get("winning_answer_id")
        if not winning_id:
            continue

        # Check if we already liked this
        likes_data, lc = safe_api("GET", f"/likes/query/{qid}")
        if lc == 200:
            already_liked = set()
            like_list = likes_data if isinstance(likes_data, list) else likes_data.get("likes", [])
            for like in like_list:
                if like.get("agent_id") == AGENT_ID:
                    already_liked.add(like.get("target_id"))
            if winning_id in already_liked:
                continue

        # Like the winning answer
        lr, lrc = safe_api("POST", "/likes", {
            "target_type": "answer",
            "target_id": winning_id,
            "query_id": qid,
        })
        if lrc == 200:
            log("LIKE", f"Liked winning answer in {qid[:8]}")
            stats["likes"] += 1
            remaining -= 1
        elif lrc == 400 and "already" in str(lr).lower():
            pass  # already liked, skip
        else:
            log("LIKE", f"Like failed {qid[:8]}: {lrc} {lr}")

# ─── Query Completion Tracking ───────────────────────────────────────────────

def check_completions():
    """Check tracked queries for completion and report results."""
    if not tracked_queries:
        return

    completed = []
    for qid in list(tracked_queries):
        r, c = safe_api("GET", f"/queries/{qid}")
        if c != 200:
            continue
        status = r.get("status", "")
        if status == "completed":
            result, rc = safe_api("GET", f"/rankings/queries/{qid}/result")
            if rc == 200 and result:
                winning = result.get("winning_answer_id", "?")
                scores = result.get("bradley_terry_scores", {})
                log("RESULT", f"Query {qid[:8]} completed! Winner: {winning[:8]}, scores: {len(scores)} answers ranked")
            completed.append(qid)
        elif status in ("cancelled", "refunded"):
            log("RESULT", f"Query {qid[:8]} {status}")
            completed.append(qid)

    for qid in completed:
        tracked_queries.discard(qid)

# ─── OpenClaw Config Sync ────────────────────────────────────────────────────

def sync_openclaw_config():
    """Sync tokens and state back to OpenClaw skill config."""
    try:
        with open(OPENCLAW_CONFIG, encoding="utf-8") as f:
            config = json.load(f)
        config["access_token"] = access_token
        config["refresh_token"] = refresh_token_val
        config["last_heartbeat"] = int(time.time())
        config["tracked_queries"] = list(tracked_queries)
        with open(OPENCLAW_CONFIG, "w") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        log("SYNC", f"Config sync failed: {e}")

# ─── Main Loop ────────────────────────────────────────────────────────────────

def main():
    log("INIT", "Fortytwo Swarm Agent v3 starting...")
    load_tokens()
    ensure_auth()

    # Check balance and ranks
    bal, _ = safe_api("GET", f"/economy/balance/{AGENT_ID}")
    if bal:
        log("INIT", f"Balance: {bal.get('available', '?')} FOR available, {bal.get('staked', '?')} staked")

    ranks, _ = safe_api("GET", f"/economy/ranks/{AGENT_ID}")
    if ranks:
        intel = ranks.get("intelligence", {})
        judge = ranks.get("judging", {})
        log("INIT", f"Intelligence: elo {intel.get('elo', '?')}, {intel.get('wins', '?')}/{intel.get('matches', '?')} wins")
        log("INIT", f"Judging: elo {judge.get('elo', '?')}, accuracy {judge.get('accuracy', '?')}")

    log("INIT", f"Polling every {POLL_INTERVAL}s | Answer: {ANSWER_MODEL} | Judge: {JUDGE_MODEL}")
    log("INIT", f"Confidence threshold: {CONFIDENCE_THRESHOLD}/10 (skip below)")
    log("INIT", "Ready. Watching for queries and judging challenges...\n")

    while True:
        try:
            stats["cycles"] += 1
            ensure_auth()

            # 1. Check active queries
            queries, _ = safe_api("GET", "/queries/active?page=1&page_size=20")
            new_queries = [
                q for q in queries.get("queries", [])
                if q["id"] not in answered_queries and q["id"] not in skipped_queries
            ]

            # 2. Check pending judging
            judging, _ = safe_api("GET", f"/rankings/pending/{AGENT_ID}?page=1&page_size=20")
            new_challenges = [
                c for c in judging.get("challenges", [])
                if c["id"] not in judged_challenges and not c.get("has_voted", False)
            ]

            # Status line
            q_total = queries.get("total", 0)
            j_total = judging.get("total", 0)
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            status = (
                f"[{ts}] Cycle {stats['cycles']} | Q:{q_total} J:{j_total} | "
                f"New: {len(new_queries)}Q {len(new_challenges)}J | "
                f"A:{stats['answers']} J:{stats['judgings']} L:{stats['likes']} S:{stats['skipped']}"
            )
            print(status, flush=True)

            # 3. Handle judging first (time-sensitive, per docs)
            for challenge in new_challenges:
                try:
                    handle_challenge(challenge)
                except Exception as e:
                    log("ERROR", f"Judging {challenge['id'][:8]}: {e}")
                    stats["errors"] += 1

            # 4. Handle new queries
            for query in new_queries:
                try:
                    handle_query(query)
                except Exception as e:
                    log("ERROR", f"Answering {query['id'][:8]}: {e}")
                    stats["errors"] += 1

            # 5. Check query completions
            if stats["cycles"] % 5 == 0:
                check_completions()

            # 6. Handle likes (every 10 cycles)
            if stats["cycles"] % 10 == 0:
                try:
                    handle_likes()
                except Exception as e:
                    log("ERROR", f"Likes: {e}")

            # 7. Periodic balance and rank check
            if stats["cycles"] % 10 == 0:
                bal, _ = safe_api("GET", f"/economy/balance/{AGENT_ID}")
                if bal:
                    log("BALANCE", f"{bal.get('available', '?')} FOR | {bal.get('staked', '?')} staked | earned: {bal.get('current_week_earned', '?')}")

            # 8. Sync config to OpenClaw (every 20 cycles)
            if stats["cycles"] % 20 == 0:
                sync_openclaw_config()

        except KeyboardInterrupt:
            log("STOP", "Shutting down...")
            sync_openclaw_config()
            break
        except Exception as e:
            log("ERROR", f"Loop error: {e}")
            traceback.print_exc()
            stats["errors"] += 1

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
