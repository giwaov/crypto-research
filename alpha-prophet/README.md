# Alpha Prophet - Decentralized Time Series Predictor

AI-powered time series forecasting with on-chain verification on OpenGradient Alpha Testnet.

## 🌟 Features

- **AI Predictions**: LSTM-based time series forecasting
- **On-Chain Verified**: All predictions verified on OpenGradient Alpha
- **Real-Time Data**: Live crypto price predictions (BTC, ETH, SOL)
- **Beautiful Dashboard**: Interactive charts with historical + predicted data
- **No Payment Required**: Runs on Alpha Testnet with native gas tokens

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure OpenGradient
python setup_alpha.py

# Train and deploy model
python train_model.py

# Start dashboard
python dashboard.py
```

Then open: **http://localhost:3000**

## 📊 How It Works

1. **Data Collection**: Fetches historical price data from CoinGecko API
2. **Model Training**: Trains LSTM model for next-hour predictions
3. **Model Deployment**: Uploads model to OpenGradient Alpha Testnet
4. **Inference**: Runs predictions on-chain with verification
5. **Visualization**: Real-time dashboard with predictions

## 🏗️ Architecture

```
┌─────────────────┐
│  CoinGecko API  │  (Historical Data)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LSTM Model     │  (Local Training)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenGradient   │  (Model Storage + Inference)
│  Alpha Testnet  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Web Dashboard  │  (Visualization)
└─────────────────┘
```

## 💡 Use Cases

- Crypto price predictions
- Stock market forecasting
- Weather predictions
- Energy consumption forecasting
- Traffic prediction

## 🛠️ Tech Stack

- **ML**: TensorFlow/Keras (LSTM)
- **Data**: CoinGecko API, pandas, numpy
- **Blockchain**: OpenGradient Alpha Testnet
- **Backend**: Flask REST API
- **Frontend**: Vue.js + Chart.js

## 📝 Project Structure

```
alpha-prophet/
├── models/
│   ├── train_lstm.py          # Model training
│   └── model_export.py        # ONNX export
├── api/
│   ├── data_collector.py      # Fetch price data
│   ├── predictor.py           # Run predictions
│   └── server.py              # Flask API
├── web/
│   └── index.html             # Dashboard UI
├── setup_alpha.py             # OpenGradient setup
├── deploy_model.py            # Deploy to Alpha
├── requirements.txt
└── README.md
```

## 🎯 Predictions

The model predicts:
- **Next hour price**: Short-term prediction
- **Next 24 hours**: Daily forecast
- **Confidence intervals**: Upper/lower bounds
- **Trend direction**: Bullish/Bearish

## 🔐 Security

- No private keys in code (uses .env)
- Alpha Testnet only (no real funds)
- On-chain verification of all predictions

## 📚 Resources

- [OpenGradient Docs](https://docs.opengradient.ai)
- [Python SDK Tutorial](https://docs.opengradient.ai/tutorials/python_sdk.html)
- [CoinGecko API](https://www.coingecko.com/en/api)

## 📄 License

MIT
