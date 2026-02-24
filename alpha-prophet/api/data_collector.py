"""
Data Collector - Fetches historical crypto price data from CoinGecko
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
import os


class CryptoDataCollector:
    """Collect historical cryptocurrency price data"""

    BASE_URL = "https://api.coingecko.com/api/v3"

    SUPPORTED_COINS = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'solana': 'SOL',
    }

    def __init__(self, api_key=None):
        self.api_key = api_key
        self.session = requests.Session()
        if api_key:
            self.session.headers.update({'x-cg-pro-api-key': api_key})

    def fetch_historical_data(self, coin_id='bitcoin', days=30, interval='hourly'):
        """
        Fetch historical price data

        Args:
            coin_id: Coin ID (bitcoin, ethereum, solana)
            days: Number of days of history (1-365)
            interval: Data interval (hourly, daily)

        Returns:
            DataFrame with timestamp, price, volume
        """
        print(f"Fetching {days} days of {interval} data for {coin_id}...")

        # CoinGecko market_chart endpoint
        url = f"{self.BASE_URL}/coins/{coin_id}/market_chart"
        params = {
            'vs_currency': 'usd',
            'days': days,
            'interval': interval
        }

        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Extract prices and volumes
            prices = data.get('prices', [])
            volumes = data.get('total_volumes', [])

            # Convert to DataFrame
            df = pd.DataFrame({
                'timestamp': [p[0] for p in prices],
                'price': [p[1] for p in prices],
                'volume': [v[1] for v in volumes]
            })

            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df = df.set_index('timestamp')

            print(f"✓ Fetched {len(df)} data points")
            print(f"  Date range: {df.index[0]} to {df.index[-1]}")
            print(f"  Price range: ${df['price'].min():.2f} - ${df['price'].max():.2f}")

            return df

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data: {e}")
            return None

    def fetch_current_price(self, coin_id='bitcoin'):
        """Get current price"""
        url = f"{self.BASE_URL}/simple/price"
        params = {
            'ids': coin_id,
            'vs_currencies': 'usd',
            'include_24hr_change': 'true'
        }

        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            return {
                'price': data[coin_id]['usd'],
                'change_24h': data[coin_id].get('usd_24h_change', 0)
            }
        except Exception as e:
            print(f"Error fetching current price: {e}")
            return None

    def prepare_training_data(self, df, sequence_length=48, prediction_horizon=24):
        """
        Prepare data for LSTM training

        Args:
            df: DataFrame with price data
            sequence_length: Number of hours to use as input
            prediction_horizon: Number of hours to predict

        Returns:
            X (sequences), y (targets), scaler
        """
        from sklearn.preprocessing import MinMaxScaler

        # Use only price for now
        prices = df['price'].values.reshape(-1, 1)

        # Normalize data
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_prices = scaler.fit_transform(prices)

        # Create sequences
        X, y = [], []

        for i in range(len(scaled_prices) - sequence_length - prediction_horizon):
            # Input: sequence_length hours
            X.append(scaled_prices[i:i + sequence_length])
            # Target: next prediction_horizon hours
            y.append(scaled_prices[i + sequence_length:i + sequence_length + prediction_horizon])

        X = np.array(X)
        y = np.array(y)

        print(f"\nPrepared training data:")
        print(f"  Input shape: {X.shape} ({sequence_length} hours)")
        print(f"  Output shape: {y.shape} ({prediction_horizon} hours)")
        print(f"  Total samples: {len(X)}")

        return X, y, scaler

    def save_data(self, df, filename='data/crypto_prices.csv'):
        """Save data to CSV"""
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        df.to_csv(filename)
        print(f"✓ Data saved to {filename}")

    def load_data(self, filename='data/crypto_prices.csv'):
        """Load data from CSV"""
        if os.path.exists(filename):
            df = pd.read_csv(filename, index_col='timestamp', parse_dates=True)
            print(f"✓ Loaded {len(df)} rows from {filename}")
            return df
        return None


def main():
    """Test data collection"""
    print("=" * 60)
    print("Alpha Prophet - Data Collector")
    print("=" * 60)
    print()

    collector = CryptoDataCollector()

    # Fetch Bitcoin data
    df = collector.fetch_historical_data(coin_id='bitcoin', days=90, interval='hourly')

    if df is not None:
        # Save data
        collector.save_data(df)

        # Prepare training data
        X, y, scaler = collector.prepare_training_data(df, sequence_length=48, prediction_horizon=24)

        print()
        print("✓ Data collection complete!")
        print(f"  Ready for model training with {len(X)} samples")

    # Get current price
    current = collector.fetch_current_price('bitcoin')
    if current:
        print(f"\nCurrent BTC Price: ${current['price']:,.2f}")
        print(f"24h Change: {current['change_24h']:.2f}%")


if __name__ == "__main__":
    main()
