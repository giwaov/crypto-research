# 🚀 Deploy to Vercel

Complete guide to deploy AI Fact Checker to Vercel.

## 📋 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** - Install globally:
   ```bash
   npm install -g vercel
   ```
3. **GitHub Account** - To connect your repository

## 🎯 Deployment Strategy

Since Vercel has limitations with Python serverless functions for heavy workloads, we'll use a hybrid approach:

### Option 1: Static Frontend + External API (Recommended)

**Frontend (Vercel)**: Deploy the web UI
**Backend (Railway/Fly.io)**: Deploy the Python API separately

### Option 2: All-in-One (Vercel with Python)

Deploy both frontend and API to Vercel (with limitations)

---

## 🚀 Option 1: Static Frontend + External API (Recommended)

### Step 1: Deploy API to Railway

Railway is perfect for Python APIs:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
cd ~/Desktop/crabdao-agent/og-fact-checker
railway init

# Set environment variables
railway variables set OG_PRIVATE_KEY="your_key_here"
railway variables set MEMSYNC_API_KEY="your_key_here"

# Deploy
railway up
```

After deployment, Railway will give you a URL like: `https://your-app.railway.app`

### Step 2: Update Web UI API URL

Edit `web/index.html`, find line 317:

```javascript
apiUrl: 'http://localhost:5000/api'
```

Change to your Railway URL:

```javascript
apiUrl: 'https://your-app.railway.app/api'
```

Or make it dynamic:

```javascript
apiUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://your-app.railway.app/api'
```

### Step 3: Deploy Frontend to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
cd ~/Desktop/crabdao-agent/og-fact-checker
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: ai-fact-checker
# - Directory: ./
# - Override settings? Yes
# - Build command: (leave empty)
# - Output directory: web
# - Development command: (leave empty)
```

### Step 4: Configure CORS

Update `api_server.py` to allow your Vercel domain:

```python
from flask_cors import CORS

# Add after app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3000",
    "https://your-vercel-app.vercel.app"  # Add your Vercel URL
])
```

Redeploy API:
```bash
railway up
```

### Step 5: Test

Visit your Vercel URL: `https://your-app.vercel.app`

---

## 🔧 Option 2: All-in-One Vercel Deployment

### Step 1: Create Vercel Python API

Create `api/index.py` (Vercel serverless function):

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from factcheck import get_og_client, check_claim

app = Flask(__name__)
CORS(app)

# Initialize client
try:
    og_client = get_og_client()
except Exception as e:
    og_client = None
    print(f"Failed to init OpenGradient: {e}")

@app.route('/api/check', methods=['POST'])
def check():
    if not og_client:
        return jsonify({"error": "OpenGradient not initialized"}), 503

    data = request.get_json()
    if not data or "claim" not in data:
        return jsonify({"error": "Missing 'claim' field"}), 400

    try:
        import opengradient as og
        model_map = {
            "claude-3.5-haiku": og.TEE_LLM.CLAUDE_3_5_HAIKU,
            "gpt-4o": og.TEE_LLM.GPT_4O,
        }
        model = model_map.get(data.get("model"))
        result = check_claim(og_client, data["claim"], model=model)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy" if og_client else "unhealthy"})
```

### Step 2: Update vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "web/index.html",
      "use": "@vercel/static"
    },
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.py"
    },
    {
      "src": "/(.*)",
      "dest": "/web/index.html"
    }
  ]
}
```

### Step 3: Update Web UI

Change `apiUrl` in `web/index.html`:

```javascript
apiUrl: '/api'  // Relative URL, works on Vercel
```

### Step 4: Deploy

```bash
# Set environment variables first
vercel env add OG_PRIVATE_KEY
vercel env add MEMSYNC_API_KEY

# Deploy
vercel --prod
```

**⚠️ Limitations:**
- Serverless function timeout (10s Hobby, 60s Pro)
- Cold starts can be slow
- TEE verification might timeout

---

## 🎨 Custom Domain

### Add Custom Domain

```bash
vercel domains add yourdomain.com
```

Or via Vercel dashboard:
1. Go to your project
2. Settings > Domains
3. Add your domain
4. Update DNS records

---

## 🔐 Environment Variables

Set via CLI:

```bash
vercel env add OG_PRIVATE_KEY production
# Paste your key when prompted

vercel env add MEMSYNC_API_KEY production
# Paste your key when prompted
```

Or via Vercel Dashboard:
1. Project Settings
2. Environment Variables
3. Add each variable

---

## 🐛 Troubleshooting

### API Timeout

**Error**: `FUNCTION_INVOCATION_TIMEOUT`

**Solution**: Use Option 1 (external API on Railway/Fly.io)

### CORS Errors

**Error**: `Access-Control-Allow-Origin`

**Solution**: Update `api_server.py`:

```python
CORS(app, origins=["*"])  # Allow all (not recommended for production)
# OR
CORS(app, origins=["https://your-vercel-app.vercel.app"])
```

### Environment Variables Not Working

**Solution**:
```bash
# Check vars
vercel env ls

# Pull vars to local
vercel env pull
```

### Build Fails

**Solution**: Check `vercel.json` syntax and paths

---

## 📊 Monitoring

### View Logs

```bash
vercel logs
```

### Analytics

Available in Vercel Dashboard:
- Page views
- Function invocations
- Errors
- Performance

---

## 💰 Cost

### Vercel

**Hobby (Free):**
- Unlimited deployments
- 100 GB bandwidth/month
- Serverless functions (10s timeout)

**Pro ($20/month):**
- Everything in Hobby
- 1 TB bandwidth
- 60s function timeout
- Analytics
- Team collaboration

### Railway (for API)

**Free Tier:**
- $5 free credit/month
- ~500 hours runtime
- 1 GB RAM

**Pro ($20/month):**
- $20 credit included
- Pay for usage

---

## 🚀 Quick Deploy Commands

```bash
# Deploy frontend to Vercel
cd ~/Desktop/crabdao-agent/og-fact-checker
vercel --prod

# Deploy API to Railway
railway login
railway init
railway up

# Update environment variables
vercel env add OG_PRIVATE_KEY
vercel env add MEMSYNC_API_KEY
railway variables set OG_PRIVATE_KEY="your_key"
railway variables set MEMSYNC_API_KEY="your_key"
```

---

## 🎯 Recommended Setup

1. **Frontend**: Vercel (fast, free, CDN)
2. **API**: Railway (Python-friendly, no timeout issues)
3. **Domain**: Custom domain on Vercel
4. **SSL**: Automatic (Vercel + Railway)

**Total Cost**: Free tier (both platforms) or ~$40/month (Pro tier)

---

## 📚 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Vercel Python**: https://vercel.com/docs/functions/serverless-functions/runtimes/python
- **Vercel CLI**: https://vercel.com/docs/cli

---

## ✅ Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] API deployed to Railway/Fly.io
- [ ] Environment variables set
- [ ] CORS configured
- [ ] Custom domain added (optional)
- [ ] SSL working (automatic)
- [ ] Tested fact checking
- [ ] Monitoring enabled
- [ ] Logs accessible

---

**Need help?** Check the [Vercel Community](https://vercel.com/community) or [Railway Discord](https://discord.gg/railway)
