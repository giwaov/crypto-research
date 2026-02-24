"""
Vercel Serverless Function - Prediction Endpoint
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle prediction requests"""
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            # For now, return mock data since full ML inference might timeout
            # In production, you'd use a lighter model or pre-computed predictions

            coin = data.get('coin', 'bitcoin')

            # Mock prediction response
            result = {
                'success': True,
                'coin': coin,
                'current_price': 95234.50,
                'predictions': [95450.20, 95678.30, 95892.10, 96105.40, 96318.70],
                'next_hour_prediction': 95450.20,
                'next_24h_prediction': 96318.70,
                'predicted_change_1h': 0.23,
                'predicted_change_24h': 1.14,
                'trend': 'bullish',
                'confidence': 87.5,
                'historical_prices': [94500, 94750, 95000, 95234.50],
                'timestamps': ['2026-02-24T10:00:00', '2026-02-24T11:00:00', '2026-02-24T12:00:00', '2026-02-24T13:00:00'],
                'tx_hash': '0xdemo...',
                'note': 'Demo mode - Deploy full model for real predictions'
            }

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
