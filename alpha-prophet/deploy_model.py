"""
Deploy Model to OpenGradient Alpha Testnet
"""

import os
import sys
from dotenv import load_dotenv
import opengradient as og

load_dotenv()


def deploy_to_alpha():
    """Deploy LSTM model to OpenGradient Alpha Testnet"""
    print("=" * 60)
    print("Alpha Prophet - Model Deployment")
    print("=" * 60)
    print()

    # Get credentials
    private_key = os.getenv('OG_PRIVATE_KEY')
    email = os.getenv('OG_EMAIL')
    password = os.getenv('OG_PASSWORD')

    if not all([private_key, email, password]):
        print("Error: Missing credentials in .env file")
        print("Required: OG_PRIVATE_KEY, OG_EMAIL, OG_PASSWORD")
        return

    # Initialize client
    print("Initializing OpenGradient client...")
    try:
        client = og.Client(
            private_key=private_key,
            email=email,
            password=password
        )
        print(f"✓ Connected with wallet: {client.wallet_address}")
        print()
    except Exception as e:
        print(f"Error initializing client: {e}")
        return

    # Check for ONNX model
    onnx_path = 'models/saved/lstm_model.onnx'
    if not os.path.exists(onnx_path):
        print(f"Error: ONNX model not found at {onnx_path}")
        print("Run 'python models/train_lstm.py' first")
        return

    print(f"Found ONNX model: {onnx_path}")
    file_size = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"Model size: {file_size:.2f} MB")
    print()

    # Upload model to Model Hub
    print("Uploading model to OpenGradient Model Hub...")
    try:
        # Upload file
        upload_result = client.model_hub.upload_file(onnx_path)

        model_cid = upload_result.cid
        print(f"✓ Model uploaded successfully!")
        print(f"  CID: {model_cid}")
        print()

        # Save CID for later use
        cid_file = 'models/saved/model_cid.txt'
        with open(cid_file, 'w') as f:
            f.write(model_cid)
        print(f"✓ CID saved to {cid_file}")
        print()

    except Exception as e:
        print(f"Error uploading model: {e}")
        print()
        print("This might be due to:")
        print("1. Model Hub authentication issues")
        print("2. Network connectivity")
        print("3. File size limits")
        return

    # Test inference on Alpha Testnet
    print("Testing inference on Alpha Testnet...")
    try:
        import numpy as np

        # Create a dummy input (48 hours of normalized price data)
        dummy_input = np.random.rand(1, 48, 1).astype(np.float32)

        print(f"Running inference with model CID: {model_cid}")
        result = client.inference.infer(
            model_cid=model_cid,
            model_input={
                "input": dummy_input.tolist()
            },
            inference_mode=og.InferenceMode.VANILLA
        )

        print("✓ Inference successful!")
        print(f"  Output shape: {np.array(result.model_output).shape}")
        print(f"  Transaction hash: {result.transaction_hash if hasattr(result, 'transaction_hash') else 'N/A'}")
        print()

    except Exception as e:
        print(f"Error during inference test: {e}")
        print()
        print("Note: Model uploaded successfully, but test inference failed.")
        print("The model is still deployed and can be used.")
        print()

    print("=" * 60)
    print("✓ Deployment Complete!")
    print("=" * 60)
    print()
    print("Model Details:")
    print(f"  CID: {model_cid}")
    print(f"  Location: {onnx_path}")
    print(f"  Network: OpenGradient Alpha Testnet")
    print()
    print("Next steps:")
    print("1. Start the API server: python api/server.py")
    print("2. Open dashboard: http://localhost:3000")
    print()


if __name__ == "__main__":
    deploy_to_alpha()
