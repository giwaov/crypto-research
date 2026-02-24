"""
Simple Statistical Predictor - Lightweight time series forecasting
Uses exponential smoothing and trend analysis (no heavy ML dependencies)
"""

import os
import sys
import json
import pickle
import numpy as np

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.data_collector import CryptoDataCollector


class SimpleForecaster:
    """Lightweight statistical forecaster using exponential smoothing"""

    def __init__(self, alpha=0.3, beta=0.1):
        """
        Args:
            alpha: Smoothing factor for level (0-1)
            beta: Smoothing factor for trend (0-1)
        """
        self.alpha = alpha
        self.beta = beta
        self.level = None
        self.trend = None
        self.scaler_mean = None
        self.scaler_std = None

    def fit(self, prices):
        """
        Fit the model to historical prices

        Args:
            prices: Array of historical prices
        """
        # Normalize data
        self.scaler_mean = np.mean(prices)
        self.scaler_std = np.std(prices)
        normalized = (prices - self.scaler_mean) / self.scaler_std

        # Initialize level and trend
        self.level = normalized[0]
        self.trend = normalized[1] - normalized[0] if len(normalized) > 1 else 0

        # Update with historical data
        for price in normalized[1:]:
            prev_level = self.level
            self.level = self.alpha * price + (1 - self.alpha) * (self.level + self.trend)
            self.trend = self.beta * (self.level - prev_level) + (1 - self.beta) * self.trend

        print(f"Model fitted:")
        print(f"  Level: {self.level:.4f}")
        print(f"  Trend: {self.trend:.4f}")
        print(f"  Mean: ${self.scaler_mean:.2f}")
        print(f"  Std: ${self.scaler_std:.2f}")

    def predict(self, steps=24):
        """
        Predict future prices

        Args:
            steps: Number of future time steps to predict

        Returns:
            Array of predicted prices
        """
        if self.level is None:
            raise ValueError("Model not fitted. Call fit() first")

        predictions = []
        level = self.level
        trend = self.trend

        for _ in range(steps):
            # Forecast next value
            forecast = level + trend
            predictions.append(forecast)

            # Update level and trend
            level = level + trend
            trend = trend  # Keep trend constant for simplicity

        # Denormalize predictions
        predictions = np.array(predictions) * self.scaler_std + self.scaler_mean

        return predictions

    def save(self, path='models/saved/simple_model.pkl'):
        """Save model"""
        os.makedirs(os.path.dirname(path), exist_ok=True)

        model_data = {
            'alpha': self.alpha,
            'beta': self.beta,
            'level': self.level,
            'trend': self.trend,
            'scaler_mean': self.scaler_mean,
            'scaler_std': self.scaler_std
        }

        with open(path, 'wb') as f:
            pickle.dump(model_data, f)

        print(f"Model saved to {path}")

    def load(self, path='models/saved/simple_model.pkl'):
        """Load model"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)

        self.alpha = model_data['alpha']
        self.beta = model_data['beta']
        self.level = model_data['level']
        self.trend = model_data['trend']
        self.scaler_mean = model_data['scaler_mean']
        self.scaler_std = model_data['scaler_std']

        print(f"Model loaded from {path}")

    def to_json_serializable(self):
        """Convert model to JSON-serializable format for OpenGradient"""
        return {
            'model_type': 'exponential_smoothing',
            'alpha': float(self.alpha),
            'beta': float(self.beta),
            'level': float(self.level) if self.level is not None else None,
            'trend': float(self.trend) if self.trend is not None else None,
            'scaler_mean': float(self.scaler_mean) if self.scaler_mean is not None else None,
            'scaler_std': float(self.scaler_std) if self.scaler_std is not None else None
        }


def main():
    """Train and save the simple forecaster"""
    print("=" * 60)
    print("Simple Statistical Forecaster - Training")
    print("=" * 60)
    print()

    # Step 1: Collect data
    print("Step 1: Collecting Bitcoin data...")
    collector = CryptoDataCollector()

    df = collector.fetch_historical_data(coin_id='bitcoin', days=30, interval='hourly')

    if df is None or len(df) < 48:
        print("Error: Insufficient data")
        return

    # Step 2: Train model
    print("\nStep 2: Training model...")
    prices = df['price'].values

    model = SimpleForecaster(alpha=0.3, beta=0.1)
    model.fit(prices)

    # Step 3: Test predictions
    print("\nStep 3: Testing predictions...")
    predictions = model.predict(steps=24)

    print(f"\nCurrent price: ${prices[-1]:.2f}")
    print(f"Predicted in 1h: ${predictions[0]:.2f}")
    print(f"Predicted in 24h: ${predictions[-1]:.2f}")
    print(f"Change: {((predictions[-1] - prices[-1]) / prices[-1] * 100):+.2f}%")

    # Step 4: Save model
    print("\nStep 4: Saving model...")
    model.save()

    # Also save as JSON for easy deployment
    json_path = 'models/saved/simple_model.json'
    with open(json_path, 'w') as f:
        json.dump(model.to_json_serializable(), f, indent=2)
    print(f"JSON model saved to {json_path}")

    # Save sample predictions
    sample_data = {
        'historical_prices': prices[-48:].tolist(),
        'predictions': predictions.tolist(),
        'current_price': float(prices[-1]),
        'model_params': model.to_json_serializable()
    }

    sample_path = 'models/saved/sample_prediction.json'
    with open(sample_path, 'w') as f:
        json.dump(sample_data, f, indent=2)
    print(f"Sample prediction saved to {sample_path}")

    print()
    print("=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print()
    print("Model ready for deployment!")
    print()


if __name__ == "__main__":
    main()
