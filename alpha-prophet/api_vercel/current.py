"""
Vercel Serverless Function - Current Price Endpoint
"""

from http.server import BaseHTTPRequestHandler
import json
import requests


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle current price requests"""
        try:
            # Extract coin from path
            path_parts = self.path.split('/')
            coin_id = path_parts[-1] if len(path_parts) > 1 else 'bitcoin'

            # Fetch from CoinGecko
            url = f"https://api.coingecko.com/api/v3/simple/price"
            params = {
                'ids': coin_id,
                'vs_currencies': 'usd',
                'include_24hr_change': 'true'
            }

            response = requests.get(url, params=params, timeout=5)
            data = response.json()

            if coin_id in data:
                result = {
                    'coin': coin_id,
                    'price': data[coin_id]['usd'],
                    'change_24h': data[coin_id].get('usd_24h_change', 0)
                }
            else:
                result = {'error': 'Coin not found'}

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
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
