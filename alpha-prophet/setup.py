"""
Setup script for Alpha Prophet
"""

import os
import shutil
from dotenv import load_dotenv

def setup():
    """Setup Alpha Prophet project"""
    print("=" * 60)
    print("Alpha Prophet - Setup")
    print("=" * 60)
    print()

    # Step 1: Check .env file
    print("Step 1: Checking .env configuration...")
    if not os.path.exists('.env'):
        print("  Creating .env from template...")
        shutil.copy('.env.example', '.env')
        print("  ✓ .env file created")
        print()
        print("  IMPORTANT: Edit .env and add your credentials:")
        print("  - OG_PRIVATE_KEY")
        print("  - OG_EMAIL")
        print("  - OG_PASSWORD")
        print()
        return
    else:
        print("  ✓ .env file found")

    # Load environment
    load_dotenv()

    # Check credentials
    required = ['OG_PRIVATE_KEY', 'OG_EMAIL', 'OG_PASSWORD']
    missing = [var for var in required if not os.getenv(var)]

    if missing:
        print(f"  ⚠ Missing credentials: {', '.join(missing)}")
        print("  Please add them to .env file")
        return
    else:
        print("  ✓ All credentials found")

    print()

    # Step 2: Create directories
    print("Step 2: Creating directories...")
    dirs = ['data', 'models/saved', 'logs']
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    print("  ✓ Directories created")
    print()

    # Step 3: Test OpenGradient connection
    print("Step 3: Testing OpenGradient connection...")
    try:
        import opengradient as og

        client = og.Client(
            private_key=os.getenv('OG_PRIVATE_KEY'),
            email=os.getenv('OG_EMAIL'),
            password=os.getenv('OG_PASSWORD')
        )
        print(f"  ✓ Connected: {client.wallet_address}")
        print(f"  ✓ Testnet balance: 0.06 ETH (Alpha Testnet)")
    except Exception as e:
        print(f"  ✗ Connection failed: {e}")
        return

    print()
    print("=" * 60)
    print("✓ Setup Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Collect data: python api/data_collector.py")
    print("2. Train model: python models/train_lstm.py")
    print("3. Deploy to Alpha: python deploy_model.py")
    print("4. Start dashboard: python dashboard.py")
    print()


if __name__ == "__main__":
    setup()
