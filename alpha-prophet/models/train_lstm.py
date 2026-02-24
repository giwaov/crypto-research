"""
LSTM Model Training - Train time series prediction model
"""

import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
import pickle

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.data_collector import CryptoDataCollector


class LSTMPricePredictor:
    """LSTM model for cryptocurrency price prediction"""

    def __init__(self, sequence_length=48, prediction_horizon=24):
        self.sequence_length = sequence_length
        self.prediction_horizon = prediction_horizon
        self.model = None
        self.scaler = None

    def build_model(self):
        """Build LSTM model architecture"""
        model = keras.Sequential([
            # First LSTM layer with return sequences
            layers.LSTM(128, return_sequences=True,
                       input_shape=(self.sequence_length, 1)),
            layers.Dropout(0.2),

            # Second LSTM layer
            layers.LSTM(64, return_sequences=True),
            layers.Dropout(0.2),

            # Third LSTM layer
            layers.LSTM(32),
            layers.Dropout(0.2),

            # Dense layers for prediction
            layers.Dense(64, activation='relu'),
            layers.Dense(self.prediction_horizon)
        ])

        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )

        self.model = model
        return model

    def train(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32):
        """Train the model"""
        print("\nTraining LSTM model...")
        print(f"  Epochs: {epochs}")
        print(f"  Batch size: {batch_size}")
        print(f"  Training samples: {len(X_train)}")
        print(f"  Validation samples: {len(X_val)}")
        print()

        # Callbacks
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )

        reduce_lr = keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6
        )

        # Train
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )

        print("\n✓ Training complete!")
        return history

    def predict(self, X):
        """Make predictions"""
        return self.model.predict(X)

    def save(self, model_path='models/saved/lstm_model.h5',
             scaler_path='models/saved/scaler.pkl'):
        """Save model and scaler"""
        os.makedirs(os.path.dirname(model_path), exist_ok=True)

        # Save Keras model
        self.model.save(model_path)
        print(f"✓ Model saved to {model_path}")

        # Save scaler
        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        print(f"✓ Scaler saved to {scaler_path}")

    def load(self, model_path='models/saved/lstm_model.h5',
             scaler_path='models/saved/scaler.pkl'):
        """Load model and scaler"""
        self.model = keras.models.load_model(model_path)
        print(f"✓ Model loaded from {model_path}")

        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        print(f"✓ Scaler loaded from {scaler_path}")

    def export_to_onnx(self, onnx_path='models/saved/lstm_model.onnx'):
        """Export model to ONNX format for OpenGradient"""
        import tf2onnx

        print("\nExporting to ONNX format...")

        # Get input/output specs
        spec = (tf.TensorSpec(
            (None, self.sequence_length, 1),
            tf.float32,
            name="input"
        ),)

        # Convert to ONNX
        model_proto, _ = tf2onnx.convert.from_keras(
            self.model,
            input_signature=spec,
            opset=13
        )

        # Save
        os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
        with open(onnx_path, 'wb') as f:
            f.write(model_proto.SerializeToString())

        print(f"✓ ONNX model saved to {onnx_path}")
        print(f"  Model ready for OpenGradient deployment!")

        return onnx_path


def main():
    """Train and export the model"""
    print("=" * 60)
    print("Alpha Prophet - LSTM Model Training")
    print("=" * 60)
    print()

    # Step 1: Collect data
    print("Step 1: Collecting data...")
    collector = CryptoDataCollector()

    # Try to load existing data, otherwise fetch
    df = collector.load_data()
    if df is None:
        df = collector.fetch_historical_data(coin_id='bitcoin', days=90, interval='hourly')
        if df is not None:
            collector.save_data(df)

    if df is None:
        print("Error: Could not load or fetch data")
        return

    # Step 2: Prepare training data
    print("\nStep 2: Preparing training data...")
    X, y, scaler = collector.prepare_training_data(
        df,
        sequence_length=48,
        prediction_horizon=24
    )

    # Split into train and validation
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=False
    )

    # Step 3: Build and train model
    print("\nStep 3: Building model...")
    predictor = LSTMPricePredictor(sequence_length=48, prediction_horizon=24)
    predictor.build_model()
    predictor.scaler = scaler

    print(predictor.model.summary())

    print("\nStep 4: Training model...")
    history = predictor.train(X_train, y_train, X_val, y_val, epochs=30, batch_size=32)

    # Step 5: Evaluate
    print("\nStep 5: Evaluating...")
    val_loss, val_mae = predictor.model.evaluate(X_val, y_val, verbose=0)
    print(f"  Validation Loss (MSE): {val_loss:.6f}")
    print(f"  Validation MAE: {val_mae:.6f}")

    # Step 6: Save model
    print("\nStep 6: Saving model...")
    predictor.save()

    # Step 7: Export to ONNX
    print("\nStep 7: Exporting to ONNX...")
    onnx_path = predictor.export_to_onnx()

    print()
    print("=" * 60)
    print("✓ Training Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the model: models/saved/lstm_model.h5")
    print("2. Deploy to OpenGradient: python deploy_model.py")
    print()


if __name__ == "__main__":
    main()
