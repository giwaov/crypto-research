# 🚀 Deploy Alpha Prophet to Vercel

Quick guide to deploy Alpha Prophet to Vercel.

## 📋 What Gets Deployed

- **Frontend**: Beautiful Vue.js dashboard
- **API**: Serverless Python functions for predictions
- **Data**: Real-time crypto prices from CoinGecko

## 🎯 Deployment Strategy

### Current Setup (Demo Mode)
- Frontend → Vercel static hosting
- API → Vercel serverless functions (demo predictions)
- No ML model deployment needed initially

### Full Production (Optional)
- Train model locally
- Deploy model to OpenGradient Alpha
- Update serverless functions to call Alpha inference

## 🚀 Deploy Now

### Option 1: Quick Deploy (Recommended)

```bash
cd c:/Users/DELL/Desktop/crabdao-agent/alpha-prophet

# Deploy to Vercel
vercel --prod
```

Vercel will:
1. Upload the `web/` directory as static site
2. Deploy `api_vercel/*.py` as serverless functions
3. Give you a live URL like `https://alpha-prophet.vercel.app`

### Option 2: Connect GitHub

1. Push to GitHub (already done!)
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-deploy on every push

## 🔧 Configuration

### vercel.json

Already configured with:
- Static web hosting from `web/`
- Python serverless functions from `api_vercel/`
- Proper routing for API endpoints

### API Endpoints (Demo Mode)

- `GET /api_vercel/current/{coin}` - Real-time prices from CoinGecko
- `POST /api_vercel/predict` - Demo predictions (mock data)

### API Endpoints (Production with OpenGradient)

To enable real AI predictions:

1. Train model locally:
   ```bash
   python api/data_collector.py
   python models/train_lstm.py
   ```

2. Deploy to OpenGradient Alpha:
   ```bash
   python deploy_model.py
   ```

3. Update `api_vercel/predict.py` to use real inference
4. Add environment variables in Vercel dashboard:
   - `OG_PRIVATE_KEY`
   - `OG_EMAIL`
   - `OG_PASSWORD`
   - `MODEL_CID` (from deployment)

## 📝 Post-Deployment

After deploying, your dashboard will be live at:

**https://alpha-prophet-<random>.vercel.app**

### Test It

1. Select a cryptocurrency (BTC, ETH, SOL)
2. Click "Get AI Prediction"
3. View real-time price + predictions
4. See the beautiful chart visualization!

## 🎨 Custom Domain

Add a custom domain in Vercel dashboard:

1. Go to project settings
2. Domains → Add Domain
3. Follow DNS setup instructions

## 🔄 Updates

Any push to GitHub will auto-deploy if connected.

Manual deploy:
```bash
vercel --prod
```

## 📊 Features on Vercel

✅ Real-time crypto prices (CoinGecko API)
✅ Beautiful responsive dashboard
✅ Chart visualizations
✅ Demo predictions (mock AI)
⚠️ Full AI predictions require OpenGradient setup

## 🚀 Going Full Production

To enable real OpenGradient Alpha inference:

1. **Train Model**: Run locally to create ONNX model
2. **Deploy to Alpha**: Upload model to OpenGradient
3. **Update API**: Modify serverless functions to call Alpha
4. **Add Env Vars**: Configure in Vercel dashboard
5. **Redeploy**: `vercel --prod`

**Note**: Vercel serverless functions have 10s timeout (Hobby) or 60s (Pro).
For heavy ML inference, consider deploying API separately to Railway/Render.

## 💡 Alternative Architecture

For production with real inference:

- **Frontend**: Vercel (fast, free CDN)
- **API**: Railway (Python-friendly, no timeout)
- **Model**: OpenGradient Alpha Testnet

This avoids serverless timeout limitations!

## 🎯 Current Status

🟢 **Demo Mode Active**
- Real prices from CoinGecko ✓
- Mock predictions ✓
- Beautiful UI ✓
- Vercel deployment ready ✓

🟡 **Production Mode**
- Requires model training
- Requires OpenGradient deployment
- Optional for demo purposes

---

**Ready to deploy?** Run `vercel --prod` now! 🚀
