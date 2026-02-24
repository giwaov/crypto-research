"""
Predictor - Run predictions using OpenGradient Alpha Testnet
"""

import os
import sys
import numpy as np
from dotenv import load_dotenv
import opengradient as og
import pickle

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.data_collector import CryptoDataCollector

load_dotenv()


class AlphaProphet:
    """Time series predictor using OpenGradient Alpha"""

    def __init__(self):
        self.client = None
        self.model_cid = None
        self.scaler = None
        self.collector = CryptoDataCollector()
        self._initialize()

    def _initialize(self):
        """Initialize OpenGradient client and load model CID"""
        # Get credentials
        private_key = os.getenv('OG_PRIVATE_KEY')
        email = os.getenv('OG_EMAIL')
        password = os.getenv('OG_PASSWORD')

        if not all([private_key, email, password]):
            print("Warning: Missing OpenGradient credentials")
            return

        # Initialize client
        try:
            self.client = og.Client(
                private_key=private_key,
                email=email,
                password=password
            )
            print(f"✓ OpenGradient client initialized ({self.client.wallet_address[:10]}...)")
        except Exception as e:
            print(f"Error initializing client: {e}")
            return

        # Load model CID
        cid_file = 'models/saved/model_cid.txt'
        if os.path.exists(cid_file):
            with open(cid_file, 'r') as f:
                self.model_cid = f.read().strip()
            print(f"✓ Model CID loaded: {self.model_cid[:20]}...")
        else:
            print(f"Warning: Model CID not found at {cid_file}")

        # Load scaler
        scaler_path = 'models/saved/scaler.pkl'
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            print("✓ Scaler loaded")
        else:
            print(f"Warning: Scaler not found at {scaler_path}")

    def predict(self, coin_id='bitcoin', sequence_length=48, prediction_horizon=24):
        """
        Make price prediction

        Args:
            coin_id: Coin to predict (bitcoin, ethereum, solana)
            sequence_length: Hours of history to use
            prediction_horizon: Hours to predict

        Returns:
            dict with predictions and metadata
        """
        if not all([self.client, self.model_cid, self.scaler]):
            return {
                'error': 'Predictor not properly initialized',
                'details': {
                    'client': bool(self.client),
                    'model_cid': bool(self.model_cid),
                    'scaler': bool(self.scaler)
                }
            }

        try:
            # Fetch recent data
            print(f"Fetching recent data for {coin_id}...")
            df = self.collector.fetch_historical_data(
                coin_id=coin_id,
                days=3,  # Last 3 days
                interval='hourly'
            )

            if df is None or len(df) < sequence_length:
                return {'error': 'Insufficient historical data'}

            # Prepare input
            recent_prices = df['price'].values[-sequence_length:].reshape(-1, 1)
            scaled_input = self.scaler.transform(recent_prices)
            model_input = scaled_input.reshape(1, sequence_length, 1).astype(np.float32)

            # Run inference on OpenGradient Alpha
            print(f"Running inference on Alpha Testnet...")
            result = self.client.inference.infer(
                model_cid=self.model_cid,
                model_input={"input": model_input.tolist()},
                inference_mode=og.InferenceMode.VANILLA
            )

            # Extract predictions
            predictions_scaled = np.array(result.model_output).flatten()
            predictions = self.scaler.inverse_transform(
                predictions_scaled.reshape(-1, 1)
            ).flatten()

            # Get current price
            current_data = self.collector.fetch_current_price(coin_id)
            current_price = current_data['price'] if current_data else df['price'].iloc[-1]

            # Calculate statistics
            predicted_change = ((predictions[0] - current_price) / current_price) * 100
            predicted_24h = predictions[-1]
            predicted_24h_change = ((predicted_24h - current_price) / current_price) * 100

            return {
                'success': True,
                'coin': coin_id,
                'current_price': float(current_price),
                'predictions': predictions[:prediction_horizon].tolist(),
                'next_hour_prediction': float(predictions[0]),
                'next_24h_prediction': float(predicted_24h),
                'predicted_change_1h': float(predicted_change),
                'predicted_change_24h': float(predicted_24h_change),
                'trend': 'bullish' if predicted_change > 0 else 'bearish',
                'confidence': self._calculate_confidence(predictions),
                'historical_prices': df['price'].values[-sequence_length:].tolist(),
                'timestamps': [str(ts) for ts in df.index[-sequence_length:]],
                'tx_hash': result.transaction_hash if hasattr(result, 'transaction_hash') else None
            }

        except Exception as e:
            print(f"Prediction error: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e)}

    def _calculate_confidence(self, predictions):
        """Calculate prediction confidence based on variance"""
        variance = np.var(predictions)
        # Lower variance = higher confidence
        confidence = max(0, min(100, 100 - (variance / 1000)))
        return round(confidence, 2)


def main():
    """Test predictor"""
    print("=" * 60)
    print("Alpha Prophet - Predictor Test")
    print("=" * 60)
    print()

    prophet = AlphaProphet()

    if not all([prophet.client, prophet.model_cid, prophet.scaler]):
        print("Error: Predictor not initialized")
        print("Make sure you've:")
        print("1. Set up .env with credentials")
        print("2. Trained the model: python models/train_lstm.py")
        print("3. Deployed to Alpha: python deploy_model.py")
        return

    print("Running prediction for Bitcoin...")
    print()

    result = prophet.predict(coin_id='bitcoin')

    if 'error' in result:
        print(f"Error: {result['error']}")
    else:
        print("✓ Prediction successful!")
        print()
        print(f"Current Price: ${result['current_price']:,.2f}")
        print(f"Next Hour: ${result['next_hour_prediction']:,.2f} ({result['predicted_change_1h']:+.2f}%)")
        print(f"Next 24h: ${result['next_24h_prediction']:,.2f} ({result['predicted_change_24h']:+.2f}%)")
        print(f"Trend: {result['trend'].upper()}")
        print(f"Confidence: {result['confidence']}%")
        if result['tx_hash']:
            print(f"TX Hash: {result['tx_hash']}")


if __name__ == "__main__":
    main()
