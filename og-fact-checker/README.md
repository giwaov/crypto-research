# AI Fact Checker

TEE-verified fact checking powered by [OpenGradient](https://opengradient.ai) + [MemSync](https://memsync.ai).

Paste any claim, get a cryptographically attested verdict with confidence score. Every fact check runs inside a Trusted Execution Environment (TEE) and is settled on-chain via OpenGradient's x402 protocol — making each verdict verifiable and tamper-proof.

MemSync gives the checker persistent memory: it remembers past checks, detects contradictions, and builds context over time.

## 🚀 Quick Start

### Option 1: Web UI (Recommended)

Beautiful modern web interface with real-time checking:

```bash
# Install
pip install -r requirements.txt

# Configure (get keys from opengradient.ai and memsync.ai)
cp .env.example .env
nano .env

# Start (opens web UI on port 3000 and API on port 5000)
./start.sh         # Linux/Mac
start.bat          # Windows
```

Then open: **http://localhost:3000**

👉 **See [WEB_README.md](WEB_README.md) for full web UI documentation**

### Option 2: CLI

Command-line interface for quick checks - see [Usage](#usage) section below.

### Option 3: REST API

Integrate into your own applications - see [API Endpoints](#api-endpoints) section below.

## Setup

```bash
git clone https://github.com/giwaov/crabdao-agent.git
cd crabdao-agent/og-fact-checker

pip install -r requirements.txt

cp .env.example .env
# Edit .env with your keys:
#   OG_PRIVATE_KEY  — from https://hub.opengradient.ai
#   MEMSYNC_API_KEY — from https://memsync.ai
```

## Usage

### Check a single claim

```bash
python factcheck.py "The Great Wall of China is visible from space"
```

```
┌──────────────── Fact Checker ────────────────┐
│  Claim           "The Great Wall of China     │
│                  is visible from space"        │
│  Verdict         FALSE                         │
│  Confidence      ████████████████████░ 95%     │
│  Category        SCIENCE                       │
│                                                │
│  Evidence                                      │
│                  • Too narrow to see unaided   │
│                  • Astronauts have confirmed    │
│                  • NASA has debunked this myth  │
│                                                │
│  Reasoning       The Great Wall is only ~6m    │
│                  wide, far below the threshold │
│                  for unaided human vision...   │
│  Sources         NASA, Chris Hadfield          │
│  TEE Proof       0x3a8f...c2e1                 │
│  Memory          Stored in MemSync             │
└────────────────────────────────────────────────┘
```

### Batch check from file

```bash
# Create a claims file (one claim per line, # for comments)
echo "The Earth is flat" > claims.txt
echo "Water boils at 100°C at sea level" >> claims.txt
echo "Humans only use 10% of their brain" >> claims.txt

python factcheck.py --file claims.txt
```

### Search past checks

```bash
python factcheck.py --history "Great Wall"
```

### Raw JSON output

```bash
python factcheck.py --json "Lightning never strikes twice"
```

### Choose a different model

```bash
python factcheck.py --model gpt-4o "Goldfish have a 3-second memory"
```

Available models: `claude-3.5-haiku` (default, cheapest), `gpt-4o`, `claude-4.0-sonnet`, `grok-3-beta`, `gemini-2.5-flash`

## Verdicts

| Verdict | Meaning |
|---------|---------|
| `TRUE` | Fully accurate |
| `FALSE` | Factually wrong |
| `MOSTLY_TRUE` | Largely correct with minor inaccuracies |
| `MOSTLY_FALSE` | Contains some truth but fundamentally wrong |
| `MISLEADING` | Technically true but presented deceptively |
| `UNVERIFIABLE` | Cannot be confirmed or denied |

## How it works

1. You submit a claim
2. MemSync is queried for any previous checks on similar topics
3. The claim + context is sent to an LLM running inside OpenGradient's TEE
4. The LLM returns a structured verdict with evidence and reasoning
5. The result is settled on-chain via x402 (proof hash included in output)
6. The check is stored in MemSync for future contradiction detection
7. Results are cached locally for 10 minutes to avoid duplicate API costs

## API Endpoints

### `POST /api/check`
Check a single claim

```bash
curl -X POST http://localhost:5000/api/check \
  -H "Content-Type: application/json" \
  -d '{"claim": "The Earth is flat", "model": "claude-3.5-haiku"}'
```

### `POST /api/batch`
Check multiple claims (max 10)

### `GET /api/history?query=<term>&limit=20`
Search past checks

### `GET /api/stats`
Get statistics

### `GET /api/models`
List available models

### `GET /api/health`
Health check

See [WEB_README.md](WEB_README.md) for detailed API documentation.

## Cost

Each fact check costs a small amount of OPG tokens (settled in batch). Using `claude-3.5-haiku` (default) is the cheapest option. Cached results cost 0 OPG.

**Typical cost:** ~$0.001-0.003 per unique check

## Web UI Features

🎨 **Beautiful Interface** - Modern gradient design, glassmorphism, smooth animations
🔍 **Multi-Model Support** - Choose from 5 different AI models
📊 **Statistics Dashboard** - Track checks, verdicts, and categories
💾 **Smart Caching** - Zero cost for cached results
🛡️ **TEE Verification** - On-chain proof display
🔗 **Share Results** - Export and share functionality

## Project Structure

```
og-fact-checker/
├── web/
│   └── index.html          # Web UI (Vue.js)
├── factcheck.py            # CLI tool
├── api_server.py           # Flask REST API
├── serve_web.py            # Web server
├── start.sh / start.bat    # Quick start scripts
├── requirements.txt        # Dependencies
├── README.md              # This file
└── WEB_README.md          # Web UI docs
```

## License

MIT
