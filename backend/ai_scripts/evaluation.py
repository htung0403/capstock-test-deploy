# File: backend/ai_scripts/evaluation.py
# Purpose: Calculate evaluation metrics (MAE, RMSE, MAPE) for AI predictions
# Date: 2025-01-15

import sys
import json
import numpy as np
from math import sqrt

def mean_absolute_error(actual, predicted):
    """Calculate Mean Absolute Error (MAE)"""
    if len(actual) != len(predicted):
        raise ValueError("Actual and predicted arrays must have the same length")
    return float(np.mean(np.abs(np.array(actual) - np.array(predicted))))

def root_mean_squared_error(actual, predicted):
    """Calculate Root Mean Squared Error (RMSE)"""
    if len(actual) != len(predicted):
        raise ValueError("Actual and predicted arrays must have the same length")
    return float(sqrt(np.mean((np.array(actual) - np.array(predicted)) ** 2)))

def mean_absolute_percentage_error(actual, predicted):
    """Calculate Mean Absolute Percentage Error (MAPE)"""
    if len(actual) != len(predicted):
        raise ValueError("Actual and predicted arrays must have the same length")
    
    actual = np.array(actual)
    predicted = np.array(predicted)
    
    # Avoid division by zero
    mask = actual != 0
    if not np.any(mask):
        return None
    
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask]) * 100))

def calculate_all_metrics(actual, predicted):
    """
    Calculate all evaluation metrics
    
    Args:
        actual: List of actual values
        predicted: List of predicted values
    
    Returns:
        dict with MAE, RMSE, MAPE, and additional statistics
    """
    if len(actual) == 0 or len(predicted) == 0:
        return {"error": "Empty arrays provided"}
    
    if len(actual) != len(predicted):
        return {"error": f"Array length mismatch: actual={len(actual)}, predicted={len(predicted)}"}
    
    try:
        mae = mean_absolute_error(actual, predicted)
        rmse = root_mean_squared_error(actual, predicted)
        mape = mean_absolute_percentage_error(actual, predicted)
        
        # Additional statistics
        actual_mean = float(np.mean(actual))
        predicted_mean = float(np.mean(predicted))
        actual_std = float(np.std(actual))
        predicted_std = float(np.std(predicted))
        
        # Direction accuracy (how often prediction direction matches actual direction)
        if len(actual) > 1:
            actual_directions = np.diff(actual) > 0  # True if price went up
            predicted_directions = np.diff(predicted) > 0
            direction_accuracy = float(np.mean(actual_directions == predicted_directions) * 100)
        else:
            direction_accuracy = None
        
        return {
            "MAE": mae,
            "RMSE": rmse,
            "MAPE": mape if mape is not None else None,
            "direction_accuracy": direction_accuracy,
            "statistics": {
                "actual_mean": actual_mean,
                "predicted_mean": predicted_mean,
                "actual_std": actual_std,
                "predicted_std": predicted_std,
                "data_points": len(actual)
            }
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Please provide actual and predicted arrays as JSON arguments."}), file=sys.stderr)
        sys.exit(1)
    
    try:
        actual = json.loads(sys.argv[1])
        predicted = json.loads(sys.argv[2])
        
        result = calculate_all_metrics(actual, predicted)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

