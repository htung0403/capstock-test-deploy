# File: backend/ai_scripts/ml_price_predictor.py
# Purpose: Load trained ML models (RandomForestRegressor) and make price predictions
# Date: 2025-12-06
# 
# This script loads models trained by ml_training/scripts/train_price_model.py
# Models are stored in backend/ai_models/{SYMBOL}_model.pkl with metadata in {SYMBOL}_metadata.json

import sys
import json
import os
import pandas as pd
import numpy as np
import joblib
from pathlib import Path

def load_model(symbol):
    """
    Load trained model and metadata for a given symbol
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
    
    Returns:
        tuple: (model, metadata) or (None, None) if not found
    """
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.parent
    model_dir = script_dir / 'ai_models'
    
    model_path = model_dir / f'{symbol}_model.pkl'
    metadata_path = model_dir / f'{symbol}_metadata.json'
    
    if not model_path.exists():
        return None, None
    
    if not metadata_path.exists():
        print(f"Warning: Model exists but metadata not found for {symbol}", file=sys.stderr)
        return None, None
    
    try:
        # Load model
        model = joblib.load(model_path)
        
        # Load metadata
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        return model, metadata
    except Exception as e:
        print(f"Error loading model for {symbol}: {e}", file=sys.stderr)
        return None, None

def prepare_features(history_data, metadata):
    """
    Prepare feature vector from history data according to model's expected features
    
    Args:
        history_data: List of dicts with {price, timestamp} or DataFrame with OHLCV columns
        metadata: Model metadata containing feature names and lags
    
    Returns:
        numpy array: Feature vector ready for prediction, or None if insufficient data
    """
    try:
        # Convert to DataFrame
        if isinstance(history_data, list):
            df = pd.DataFrame(history_data)
            # If history_data has 'price' field, we need to construct OHLCV from it
            if 'price' in df.columns:
                # Use price as Close, and create dummy Open/High/Low/Volume if needed
                df['Close'] = df['price']
                if 'open' not in df.columns:
                    df['Open'] = df['Close']  # Approximate
                if 'high' not in df.columns:
                    df['High'] = df['Close']  # Approximate
                if 'low' not in df.columns:
                    df['Low'] = df['Close']  # Approximate
                if 'volume' not in df.columns:
                    df['Volume'] = 0  # Default volume
        else:
            df = history_data.copy()
        
        # Normalize column names (handle various formats)
        df.columns = df.columns.str.strip()
        
        # Get required features from metadata
        required_features = metadata.get('features', [])
        lags = metadata.get('lags', 0)
        
        if len(df) < lags + 1:
            return None  # Insufficient data for lags
        
        # Get the latest row for current features
        latest = df.iloc[-1]
        
        # Build feature vector
        feature_vector = []
        
        for feat_name in required_features:
            feat_name_clean = feat_name.strip()
            
            # Handle lag features (e.g., "Close_lag1", "Close_lag2")
            if '_lag' in feat_name_clean:
                base_col = feat_name_clean.split('_lag')[0]
                lag_num = int(feat_name_clean.split('_lag')[1])
                
                # Try to find matching column (case-insensitive, handle spaces)
                col_match = None
                for col in df.columns:
                    if col.strip().lower() == base_col.lower():
                        col_match = col
                        break
                
                if col_match is None:
                    # Try common variations
                    if base_col.lower() in ['close', 'close/last']:
                        col_match = 'Close' if 'Close' in df.columns else 'price'
                    elif base_col.lower() in ['open']:
                        col_match = 'Open' if 'Open' in df.columns else None
                    elif base_col.lower() in ['high']:
                        col_match = 'High' if 'High' in df.columns else None
                    elif base_col.lower() in ['low']:
                        col_match = 'Low' if 'Low' in df.columns else None
                    elif base_col.lower() in ['volume']:
                        col_match = 'Volume' if 'Volume' in df.columns else None
                
                if col_match and len(df) > lag_num:
                    lag_value = df[col_match].iloc[-(lag_num + 1)]
                    feature_vector.append(float(lag_value))
                else:
                    # Use latest value as fallback
                    if col_match:
                        feature_vector.append(float(latest[col_match]))
                    else:
                        feature_vector.append(0.0)
            else:
                # Current value feature (e.g., "Open", "High", "Low", "Volume")
                col_match = None
                for col in df.columns:
                    if col.strip().lower() == feat_name_clean.lower():
                        col_match = col
                        break
                
                if col_match is None:
                    # Try common variations
                    if feat_name_clean.lower() in ['open']:
                        col_match = 'Open' if 'Open' in df.columns else 'price'
                    elif feat_name_clean.lower() in ['high']:
                        col_match = 'High' if 'High' in df.columns else 'price'
                    elif feat_name_clean.lower() in ['low']:
                        col_match = 'Low' if 'Low' in df.columns else 'price'
                    elif feat_name_clean.lower() in ['volume']:
                        col_match = 'Volume' if 'Volume' in df.columns else 'price'
                    elif feat_name_clean.lower() in ['close', 'close/last']:
                        col_match = 'Close' if 'Close' in df.columns else 'price'
                
                if col_match:
                    feature_vector.append(float(latest[col_match]))
                else:
                    feature_vector.append(0.0)
        
        return np.array(feature_vector).reshape(1, -1)
    
    except Exception as e:
        print(f"Error preparing features: {e}", file=sys.stderr)
        return None

def predict_price(symbol, history_data):
    """
    Predict next price using trained ML model
    
    Args:
        symbol: Stock symbol
        history_data: Historical price data (list of dicts or DataFrame)
    
    Returns:
        dict: Prediction result with predicted_price, confidence, and metadata
    """
    # Load model and metadata
    model, metadata = load_model(symbol)
    
    if model is None or metadata is None:
        return {
            "error": f"No trained model found for symbol {symbol}",
            "available": False
        }
    
    # Prepare features
    feature_vector = prepare_features(history_data, metadata)
    
    if feature_vector is None:
        return {
            "error": "Insufficient historical data to prepare features",
            "available": True,
            "model_type": metadata.get('model_type'),
            "required_lags": metadata.get('lags', 0)
        }
    
    try:
        # Make prediction
        predicted_price = model.predict(feature_vector)[0]
        
        # Get model metrics for confidence estimation
        metrics = metadata.get('metrics', {})
        rmse = metrics.get('RMSE', None)
        mae = metrics.get('MAE', None)
        
        # Calculate confidence based on model performance
        # Lower RMSE/MAE relative to current price = higher confidence
        if isinstance(history_data, list) and len(history_data) > 0:
            current_price = history_data[-1].get('price', history_data[-1].get('Close', 0))
        else:
            current_price = history_data.iloc[-1].get('price', history_data.iloc[-1].get('Close', 0))
        
        if current_price > 0 and rmse:
            # Confidence = 1 - (RMSE / current_price), capped at reasonable range
            relative_error = min(rmse / current_price, 1.0)
            confidence = max(0.3, 1.0 - relative_error)  # At least 30% confidence
        else:
            confidence = 0.5  # Default confidence
        
        # Calculate predicted change
        if current_price > 0:
            change = predicted_price - current_price
            change_pct = (change / current_price) * 100
        else:
            change = 0
            change_pct = 0
        
        # Determine trend
        if change_pct > 2:
            trend = "Bullish"
        elif change_pct < -2:
            trend = "Bearish"
        else:
            trend = "Neutral"
        
        return {
            "predicted_price": float(predicted_price),
            "current_price": float(current_price),
            "predicted_change": float(change),
            "predicted_change_pct": float(change_pct),
            "trend": trend,
            "confidence": float(confidence),
            "model_type": metadata.get('model_type'),
            "model_version": metadata.get('version', 'unknown'),
            "model_metrics": metrics,
            "available": True,
            "method": "ML_RandomForest"
        }
    
    except Exception as e:
        return {
            "error": f"Prediction failed: {str(e)}",
            "available": True,
            "model_type": metadata.get('model_type')
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        result = {
            "error": "Usage: python ml_price_predictor.py <symbol> <history_json>"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    history_json = sys.argv[2]
    
    try:
        history_data = json.loads(history_json)
        result = predict_price(symbol, history_data)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        result = {
            "error": f"Invalid JSON: {str(e)}"
        }
        print(json.dumps(result))
        sys.exit(1)
    except Exception as e:
        result = {
            "error": f"Unexpected error: {str(e)}"
        }
        print(json.dumps(result))
        sys.exit(1)

