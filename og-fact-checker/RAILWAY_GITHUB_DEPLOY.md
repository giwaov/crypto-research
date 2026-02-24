# 🚂 Deploy API to Railway via GitHub

Since Railway CLI requires interactive browser authentication, the easiest way is to deploy via GitHub integration.

## Quick Deploy (3 minutes)

### Step 1: Push to GitHub

```bash
cd c:/Users/DELL/Desktop/crabdao-agent/og-fact-checker

# If not already a git repo
git init
git add .
git commit -m "Add Railway deployment configuration"

# Create GitHub repo and push
gh repo create og-fact-checker --public --source=. --remote=origin --push
```

Or if you want to push to the existing crabdao-agent repo:

```bash
cd c:/Users/DELL/Desktop/crabdao-agent
git add og-fact-checker/
git commit -m "Add Fact Checker API deployment files"
git push origin master
```

### Step 2: Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repo: `giwaov/og-fact-checker` or `giwaov/crabdao-agent`
5. If using crabdao-agent, set **Root Directory**: `og-fact-checker`
6. Click **"Deploy Now"**

### Step 3: Add Environment Variables

In Railway dashboard:

1. Go to your project → **Variables** tab
2. Add these variables:
   - `OG_PRIVATE_KEY` = your OpenGradient private key
   - `MEMSYNC_API_KEY` = your MemSync API key
3. Click **"Deploy"** to restart with new env vars

### Step 4: Get Your Railway URL

1. Go to **Settings** tab
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://og-fact-checker-production.up.railway.app`)

### Step 5: Update Frontend

Update the API URL in your Vercel deployment:

```bash
cd c:/Users/DELL/Desktop/crabdao-agent/og-fact-checker
```

Edit `web/index.html` line 317, replace:

```javascript
apiUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : (process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.railway.app/api')
```

With your actual Railway URL:

```javascript
apiUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://og-fact-checker-production.up.railway.app/api'
```

Then redeploy to Vercel:

```bash
vercel --prod
```

## Done! 🎉

Your fact checker should now be fully functional at:
- **Frontend**: https://ai-fact-checker-two.vercel.app
- **API**: https://og-fact-checker-production.up.railway.app

## Test the API

```bash
curl https://og-fact-checker-production.up.railway.app/api/health
```

Should return:
```json
{"status": "healthy"}
```

## Troubleshooting

### Port Issues

Railway automatically sets the `PORT` environment variable. If the API doesn't start, update `api_server.py` line at the bottom:

```python
if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
```

### Build Fails

Check Railway logs in the dashboard. Common issues:
- Missing dependencies → check `requirements.txt`
- Environment variables not set → add in Variables tab

### CORS Errors

If you get CORS errors from the frontend, the `api_server.py` already has CORS configured. Make sure your Vercel URL is making requests to the correct Railway URL.

---

**Cost**: Railway free tier gives $5 credit/month (~500 hours runtime). Perfect for this project.
