# 🌐 AI Fact Checker Web Interface

Beautiful, modern web UI for the TEE-verified fact checker powered by OpenGradient.

## ✨ Features

### 🎨 **Beautiful UI**
- Modern gradient design
- Glassmorphism effects
- Smooth animations
- Responsive layout (mobile-friendly)
- Dark accents with purple theme

### 🔍 **Fact Checking**
- Real-time claim verification
- Multiple AI models (Claude, GPT-4o, Grok, Gemini)
- Confidence scores with visual bars
- Evidence lists
- Detailed reasoning
- Source citations

### 🛡️ **TEE Verification**
- On-chain proof display
- Payment hash tracking
- Timestamp verification
- Tamper-proof attestation

### 📊 **Statistics Dashboard**
- Total checks count
- Verdict breakdown
- Category distribution
- Real-time updates

### 💾 **Smart Caching**
- 10-minute local cache
- Zero cost for cached results
- Cache indicator

### 🔗 **Sharing**
- Share results
- Copy JSON data
- Export functionality

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd og-fact-checker
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your keys:
#   OG_PRIVATE_KEY  - from https://hub.opengradient.ai
#   MEMSYNC_API_KEY - from https://memsync.ai (optional)
```

### 3. Start the API Server

```bash
python api_server.py
```

Output:
```
============================================================
🔍 AI Fact Checker API
   TEE-verified fact checking via OpenGradient
============================================================

✅ OpenGradient connected
✅ MemSync enabled

📡 Starting API server...
   http://localhost:5000
```

### 4. Start the Web UI

In a new terminal:

```bash
python serve_web.py
```

Output:
```
============================================================
🌐 Fact Checker Web UI
============================================================

✅ Server running at: http://localhost:3000
📁 Serving from: web/

💡 Make sure the API server is running on port 5000:
   python api_server.py
```

### 5. Open in Browser

Navigate to: **http://localhost:3000**

## 📖 Usage

### Check a Claim

1. Enter your claim in the text area
2. Select an AI model (Claude 3.5 Haiku is fastest/cheapest)
3. Click "Check Fact" or press `Ctrl+Enter`
4. Wait 10-30 seconds for TEE-verified results

### Example Claims

Try these:
- `"The Great Wall of China is visible from space"`
- `"Lightning never strikes the same place twice"`
- `"Humans only use 10% of their brain"`
- `"Water boils at 100°C at sea level"`
- `"Goldfish have a 3-second memory"`

### Verdict Types

| Verdict | Meaning | Color |
|---------|---------|-------|
| **TRUE** | Fully accurate | Green |
| **FALSE** | Factually wrong | Red |
| **MOSTLY_TRUE** | Largely correct with minor issues | Light Green |
| **MOSTLY_FALSE** | Contains some truth but fundamentally wrong | Light Red |
| **MISLEADING** | Technically true but deceptive | Yellow |
| **UNVERIFIABLE** | Cannot be confirmed or denied | Gray |

## 🎯 API Endpoints

The web UI consumes these API endpoints:

### `POST /api/check`
Check a single claim

**Request:**
```json
{
  "claim": "The Earth is flat",
  "model": "claude-3.5-haiku",
  "no_cache": false
}
```

**Response:**
```json
{
  "claim": "The Earth is flat",
  "verdict": "FALSE",
  "confidence": 99,
  "category": "SCIENCE",
  "evidence": [
    "Satellite imagery shows Earth's spherical shape",
    "Ships disappear over horizon bottom-first",
    "Different star constellations in hemispheres"
  ],
  "reasoning": "Overwhelming scientific evidence confirms Earth is approximately spherical...",
  "sources": ["NASA", "ISS observations", "Scientific consensus"],
  "proof": {
    "payment_hash": "0x1234...",
    "transaction_hash": "0x5678...",
    "timestamp": "2026-02-24T10:00:00Z",
    "model": "CLAUDE_3_5_HAIKU",
    "tee_verified": true
  },
  "from_cache": false
}
```

### `POST /api/batch`
Check multiple claims at once (max 10)

**Request:**
```json
{
  "claims": [
    "Claim 1",
    "Claim 2",
    "Claim 3"
  ],
  "model": "claude-3.5-haiku"
}
```

### `GET /api/history?query=<term>&limit=20`
Search past checks from MemSync

### `GET /api/stats`
Get statistics

**Response:**
```json
{
  "total_checks": 47,
  "verdicts": {
    "TRUE": 12,
    "FALSE": 18,
    "MOSTLY_TRUE": 8,
    "MOSTLY_FALSE": 5,
    "MISLEADING": 3,
    "UNVERIFIABLE": 1
  },
  "categories": {
    "SCIENCE": 15,
    "HISTORY": 8,
    "HEALTH": 12,
    "POLITICS": 7,
    "OTHER": 5
  }
}
```

### `GET /api/models`
List available AI models

### `GET /api/health`
Health check

## 🎨 Customization

### Change API URL

Edit `web/index.html`, line with `apiUrl`:

```javascript
apiUrl: 'http://localhost:5000/api'  // Change this
```

### Change Port

**API Server:**
```python
# api_server.py, last line
app.run(host="0.0.0.0", port=5000, debug=False)  # Change port
```

**Web Server:**
```python
# serve_web.py, line 8
PORT = 3000  # Change this
```

### Modify UI Theme

Edit `web/index.html` in the `<style>` section:

```css
.gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Change gradient colors */
}
```

## 🚀 Deployment

### Option 1: Docker (Recommended)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000 3000

CMD ["sh", "-c", "python api_server.py & python serve_web.py"]
```

Build and run:
```bash
docker build -t fact-checker .
docker run -p 5000:5000 -p 3000:3000 --env-file .env fact-checker
```

### Option 2: Production Server

Use **Gunicorn** for API:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 api_server:app
```

Use **Nginx** for web UI:
```nginx
server {
    listen 80;
    server_name fact-checker.example.com;

    location / {
        root /path/to/web;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

### Option 3: Vercel/Netlify

1. Push to GitHub
2. Connect to Vercel/Netlify
3. Set build command: `echo "Static site"`
4. Set publish directory: `web`
5. Add environment variables

Note: You'll need to deploy the API separately (e.g., Railway, Fly.io, Heroku)

## 💰 Cost

Using **Claude 3.5 Haiku** (default):
- ~$0.001-0.003 per fact check
- Cached results: **$0** (free)
- MemSync: ~$0.0001 per memory operation

Total: **~$0.001-0.004 per unique check**

## 🔧 Troubleshooting

### API Server Not Connecting

**Error:** `Failed to check claim`

**Solution:**
1. Make sure API server is running: `python api_server.py`
2. Check it's on port 5000: `curl http://localhost:5000/api/health`
3. Verify `.env` has `OG_PRIVATE_KEY`

### CORS Issues

**Error:** `Access to fetch blocked by CORS`

**Solution:**
- API server already has CORS enabled (`flask-cors`)
- If still blocked, check browser console
- Try opening web UI via `http://localhost:3000` (not `file://`)

### Empty Results

**Error:** API returns 200 but no verdict

**Solution:**
- LLM might have returned invalid JSON
- Check API logs for `JSONDecodeError`
- Try a different model

### Slow Response

**Issue:** Takes 30+ seconds

**Explanation:**
- Normal for first TEE-verified request
- Subsequent checks use cache (instant)
- Complex claims take longer
- Try Claude 3.5 Haiku for speed

## 📊 Architecture

```
┌─────────────┐
│  Browser    │
│  (Vue.js)   │
└──────┬──────┘
       │ HTTP
       v
┌─────────────┐
│ Flask API   │
│ (port 5000) │
└──────┬──────┘
       │
       ├─> factcheck.py (core logic)
       ├─> OpenGradient client (TEE LLM)
       └─> MemSync API (memory)
```

## 📝 Files

```
og-fact-checker/
├── web/
│   └── index.html           # Single-page Vue.js app
├── api_server.py            # Flask REST API
├── serve_web.py             # Simple HTTP server
├── factcheck.py             # Core fact checking logic
├── requirements.txt         # Python dependencies
├── .env                     # Configuration
├── .cache/                  # Local cache
├── README.md               # CLI docs
└── WEB_README.md           # This file
```

## 🎯 Next Steps

### Enhancements to Add

1. **User Accounts**
   - Save check history per user
   - API key management
   - Usage tracking

2. **Advanced Features**
   - Batch upload (CSV)
   - PDF export
   - Email reports
   - Webhook notifications

3. **Integrations**
   - Browser extension
   - Slack bot
   - Twitter bot
   - API client libraries

4. **Analytics**
   - Trends over time
   - Most checked claims
   - Accuracy metrics
   - Category insights

## 📚 Resources

- **OpenGradient**: https://opengradient.ai
- **MemSync**: https://memsync.ai
- **GitHub**: https://github.com/giwaov/crabdao-agent/tree/main/og-fact-checker
- **API Docs**: See `api_server.py` docstrings

## 🤝 Contributing

PRs welcome! Areas to improve:
- UI/UX enhancements
- Additional API endpoints
- Performance optimizations
- New features

## 📄 License

MIT License

---

**Built with ❤️ using OpenGradient TEE-verified AI**
