"""
Flask API Server for Alpha Prophet
"""

import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.predictor import AlphaProphet
from api.data_collector import CryptoDataCollector

app = Flask(__name__)
CORS(app)

# Initialize predictor
print("Initializing Alpha Prophet...")
prophet = AlphaProphet()
collector = CryptoDataCollector()


@app.route('/')
def home():
    """API home"""
    return jsonify({
        'name': 'Alpha Prophet API',
        'version': '1.0.0',
        'description': 'Decentralized time series prediction on OpenGradient Alpha',
        'endpoints': {
            'GET /health': 'Health check',
            'GET /coins': 'List supported coins',
            'POST /predict': 'Get price prediction',
            'GET /current/:coin': 'Get current price',
            'GET /history/:coin': 'Get historical data'
        }
    })


@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'opengradient': 'connected' if prophet.client else 'disconnected',
        'model': 'loaded' if prophet.model_cid else 'not loaded'
    })


@app.route('/coins')
def list_coins():
    """List supported coins"""
    return jsonify({
        'coins': list(CryptoDataCollector.SUPPORTED_COINS.keys()),
        'symbols': CryptoDataCollector.SUPPORTED_COINS
    })


@app.route('/predict', methods=['POST'])
def predict():
    """Make prediction"""
    data = request.get_json() or {}
    coin_id = data.get('coin', 'bitcoin')
    sequence_length = data.get('sequence_length', 48)
    prediction_horizon = data.get('prediction_horizon', 24)

    # Validate coin
    if coin_id not in CryptoDataCollector.SUPPORTED_COINS:
        return jsonify({
            'error': f'Unsupported coin: {coin_id}',
            'supported': list(CryptoDataCollector.SUPPORTED_COINS.keys())
        }), 400

    # Run prediction
    result = prophet.predict(
        coin_id=coin_id,
        sequence_length=sequence_length,
        prediction_horizon=prediction_horizon
    )

    if 'error' in result:
        return jsonify(result), 500

    return jsonify(result)


@app.route('/current/<coin_id>')
def get_current(coin_id):
    """Get current price"""
    if coin_id not in CryptoDataCollector.SUPPORTED_COINS:
        return jsonify({'error': 'Unsupported coin'}), 400

    current = collector.fetch_current_price(coin_id)
    if current is None:
        return jsonify({'error': 'Failed to fetch price'}), 500

    return jsonify({
        'coin': coin_id,
        'symbol': CryptoDataCollector.SUPPORTED_COINS[coin_id],
        **current
    })


@app.route('/history/<coin_id>')
def get_history(coin_id):
    """Get historical data"""
    if coin_id not in CryptoDataCollector.SUPPORTED_COINS:
        return jsonify({'error': 'Unsupported coin'}), 400

    days = request.args.get('days', 7, type=int)
    interval = request.args.get('interval', 'hourly')

    df = collector.fetch_historical_data(
        coin_id=coin_id,
        days=min(days, 90),  # Max 90 days
        interval=interval
    )

    if df is None:
        return jsonify({'error': 'Failed to fetch data'}), 500

    return jsonify({
        'coin': coin_id,
        'symbol': CryptoDataCollector.SUPPORTED_COINS[coin_id],
        'data': {
            'timestamps': [str(ts) for ts in df.index],
            'prices': df['price'].tolist(),
            'volumes': df['volume'].tolist()
        },
        'count': len(df)
    })


def main():
    """Run the server"""
    print()
    print("=" * 60)
    print("Alpha Prophet API Server")
    print("=" * 60)
    print()
    print("Starting server on http://localhost:5000")
    print()
    print("Endpoints:")
    print("  GET  /              - API info")
    print("  GET  /health        - Health check")
    print("  GET  /coins         - List coins")
    print("  POST /predict       - Make prediction")
    print("  GET  /current/:coin - Current price")
    print("  GET  /history/:coin - Historical data")
    print()
    print("Press Ctrl+C to stop")
    print()

    app.run(host='0.0.0.0', port=5000, debug=False)


if __name__ == '__main__':
    main()
