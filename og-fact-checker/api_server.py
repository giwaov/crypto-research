#!/usr/bin/env python3
"""
Fact Checker API Server
Flask REST API for the AI fact checker
"""

import os
import sys
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import fact checker functions
from factcheck import (
    get_og_client,
    check_claim,
    recall_checks,
    read_cache,
    CACHE_DIR
)

load_dotenv()

# Validate environment variables
required_env_vars = ["OG_PRIVATE_KEY", "MEMSYNC_API_KEY"]
missing_vars = [var for var in required_env_vars if not os.environ.get(var)]
if missing_vars:
    print(f"⚠️  Warning: Missing environment variables: {', '.join(missing_vars)}")
    print("   The API will start but fact checking will fail without proper credentials")

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize OpenGradient client on startup
try:
    og_client = get_og_client()
    print("✅ OpenGradient client initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize OpenGradient client: {e}")
    print(f"   Make sure OG_PRIVATE_KEY and MEMSYNC_API_KEY are set in environment variables")
    og_client = None


@app.route("/")
def home():
    """API home"""
    return jsonify({
        "name": "AI Fact Checker API",
        "version": "1.0.0",
        "description": "TEE-verified fact checking powered by OpenGradient",
        "endpoints": {
            "POST /api/check": "Check a single claim",
            "POST /api/batch": "Check multiple claims",
            "GET /api/history": "Get check history",
            "GET /api/stats": "Get statistics",
            "GET /api/health": "Health check"
        }
    })


@app.route("/api/check", methods=["POST"])
def check():
    """
    Check a single claim

    Body:
    {
        "claim": "The claim to verify",
        "model": "claude-3.5-haiku" (optional),
        "no_cache": false (optional)
    }
    """
    if not og_client:
        return jsonify({"error": "OpenGradient client not initialized"}), 503

    data = request.get_json()

    if not data or "claim" not in data:
        return jsonify({"error": "Missing 'claim' field"}), 400

    claim = data["claim"]
    model = data.get("model")
    no_cache = data.get("no_cache", False)

    # Check cache first if not bypassed
    if not no_cache:
        cached = read_cache(claim)
        if cached:
            cached["from_cache"] = True
            return jsonify(cached)

    try:
        # Convert model name to og enum if provided
        import opengradient as og
        model_map = {
            "gpt-4o": og.TEE_LLM.GPT_4O,
            "claude-3.5-haiku": og.TEE_LLM.CLAUDE_3_5_HAIKU,
            "claude-4.0-sonnet": og.TEE_LLM.CLAUDE_4_0_SONNET,
            "grok-3-beta": og.TEE_LLM.GROK_3_BETA,
            "gemini-2.5-flash": og.TEE_LLM.GEMINI_2_5_FLASH,
        }

        og_model = model_map.get(model) if model else None

        result = check_claim(og_client, claim, model=og_model, no_cache=no_cache)
        result["from_cache"] = False

        return jsonify(result)

    except json.JSONDecodeError as e:
        return jsonify({"error": f"Invalid JSON from LLM: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/batch", methods=["POST"])
def batch_check():
    """
    Check multiple claims

    Body:
    {
        "claims": ["claim1", "claim2", ...],
        "model": "claude-3.5-haiku" (optional)
    }
    """
    if not og_client:
        return jsonify({"error": "OpenGradient client not initialized"}), 503

    data = request.get_json()

    if not data or "claims" not in data:
        return jsonify({"error": "Missing 'claims' field"}), 400

    claims = data["claims"]
    model = data.get("model")

    if not isinstance(claims, list):
        return jsonify({"error": "'claims' must be an array"}), 400

    if len(claims) > 10:
        return jsonify({"error": "Maximum 10 claims per batch"}), 400

    results = []

    try:
        import opengradient as og
        model_map = {
            "gpt-4o": og.TEE_LLM.GPT_4O,
            "claude-3.5-haiku": og.TEE_LLM.CLAUDE_3_5_HAIKU,
            "claude-4.0-sonnet": og.TEE_LLM.CLAUDE_4_0_SONNET,
            "grok-3-beta": og.TEE_LLM.GROK_3_BETA,
            "gemini-2.5-flash": og.TEE_LLM.GEMINI_2_5_FLASH,
        }

        og_model = model_map.get(model) if model else None

        for claim in claims:
            try:
                result = check_claim(og_client, claim, model=og_model, no_cache=False)
                results.append(result)
            except Exception as e:
                results.append({
                    "claim": claim,
                    "error": str(e),
                    "verdict": "ERROR"
                })

        return jsonify({"results": results, "total": len(results)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def history():
    """
    Get check history from MemSync

    Query params:
        query (optional): Search query
        limit (optional): Max results (default: 20)
    """
    query = request.args.get("query", "fact check")
    limit = min(int(request.args.get("limit", 20)), 50)

    try:
        memories = recall_checks(query, limit=limit)

        return jsonify({
            "history": memories,
            "count": len(memories),
            "query": query
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
def stats():
    """Get statistics about cached checks"""
    try:
        import os
        import json

        cache_files = [f for f in os.listdir(CACHE_DIR) if f.endswith('.json')]

        total_checks = len(cache_files)
        verdicts = {}
        categories = {}

        for cache_file in cache_files:
            try:
                with open(os.path.join(CACHE_DIR, cache_file), 'r') as f:
                    data = json.load(f)

                verdict = data.get('verdict', 'UNKNOWN')
                verdicts[verdict] = verdicts.get(verdict, 0) + 1

                category = data.get('category', 'OTHER')
                categories[category] = categories.get(category, 0) + 1
            except:
                continue

        return jsonify({
            "total_checks": total_checks,
            "verdicts": verdicts,
            "categories": categories,
            "cache_dir": CACHE_DIR
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy" if og_client else "unhealthy",
        "opengradient": "connected" if og_client else "disconnected",
        "memsync": "enabled" if os.getenv("MEMSYNC_API_KEY") else "disabled",
        "timestamp": datetime.utcnow().isoformat()
    })


@app.route("/api/models", methods=["GET"])
def models():
    """List available models"""
    return jsonify({
        "models": [
            {
                "id": "claude-3.5-haiku",
                "name": "Claude 3.5 Haiku",
                "provider": "Anthropic",
                "cost": "Lowest",
                "speed": "Fastest",
                "recommended": True
            },
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "OpenAI",
                "cost": "Medium",
                "speed": "Fast"
            },
            {
                "id": "claude-4.0-sonnet",
                "name": "Claude 4.0 Sonnet",
                "provider": "Anthropic",
                "cost": "High",
                "speed": "Medium"
            },
            {
                "id": "grok-3-beta",
                "name": "Grok 3 Beta",
                "provider": "xAI",
                "cost": "Medium",
                "speed": "Fast"
            },
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "provider": "Google",
                "cost": "Low",
                "speed": "Very Fast"
            }
        ]
    })


def main():
    """Start the API server"""
    print("=" * 60)
    print("🔍 AI Fact Checker API")
    print("   TEE-verified fact checking via OpenGradient")
    print("=" * 60)
    print()

    if not og_client:
        print("❌ OpenGradient client failed to initialize")
        print("   Check your .env file:")
        print("   - OG_PRIVATE_KEY must be set")
        print()
        return

    print("✅ OpenGradient connected")

    if os.getenv("MEMSYNC_API_KEY"):
        print("✅ MemSync enabled")
    else:
        print("⚠️  MemSync disabled (no API key)")

    print()
    print("📡 Starting API server...")
    print("   http://localhost:5000")
    print()
    print("📖 Endpoints:")
    print("   POST /api/check      - Check a claim")
    print("   POST /api/batch      - Check multiple claims")
    print("   GET  /api/history    - Get check history")
    print("   GET  /api/stats      - Get statistics")
    print("   GET  /api/health     - Health check")
    print("   GET  /api/models     - List models")
    print()
    print("💡 Try it:")
    print('   curl -X POST http://localhost:5000/api/check \\')
    print('        -H "Content-Type: application/json" \\')
    print('        -d \'{"claim": "The Earth is flat"}\'')
    print()

    # Use PORT from environment (for Railway/Heroku) or default to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
