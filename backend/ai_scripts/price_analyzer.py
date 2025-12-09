# File: backend/ai_scripts/price_analyzer.py
# Purpose: A Python script to analyze historical stock price data, calculate moving averages, and determine trends.
# Date: 2025-10-20
# CHANGES (2025-01-15):
# - Added ARIMA for short-term prediction (1-7 days)
# - Added Prophet for long-term trend (1-3 months)
# - Kept SMA as baseline for comparison

import sys
import json
import pandas as pd
import numpy as np

# Try to import ARIMA (statsmodels)
try:
    from statsmodels.tsa.arima.model import ARIMA
    ARIMA_AVAILABLE = True
except ImportError:
    ARIMA_AVAILABLE = False
    print("Warning: ARIMA not available. Install with: pip install statsmodels", file=sys.stderr)

# Try to import Prophet
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("Warning: Prophet not available. Install with: pip install prophet", file=sys.stderr)

def analyze_price_history(history_data):
    df = pd.DataFrame(history_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.set_index('timestamp').sort_index()

    if len(df) < 50: # Cần ít nhất 50 điểm dữ liệu cho MA dài hạn 50 ngày
        return {
            "short_term_trend": "Insufficient data",
            "long_term_trend": "Insufficient data",
            "ma_short": None,
            "ma_long": None
        }

    # Calculate Moving Averages
    df['SMA_10'] = df['price'].rolling(window=10).mean()
    df['SMA_50'] = df['price'].rolling(window=50).mean()

    latest_sma_10 = df['SMA_10'].iloc[-1]
    latest_sma_50 = df['SMA_50'].iloc[-1]

    short_term_trend = "Neutral"
    if latest_sma_10 > latest_sma_50:
        short_term_trend = "Bullish"
    elif latest_sma_10 < latest_sma_50:
        short_term_trend = "Bearish"

    # Long term trend can be based on the overall slope of SMA_50 or a longer MA
    # For simplicity, let's use the current value of SMA_50 vs. earlier value
    long_term_trend = "Neutral"
    if len(df) > 100: # Need more data for a more stable long-term trend
        if df['SMA_50'].iloc[-1] > df['SMA_50'].iloc[-50]: # Compare current SMA_50 with 50 days ago
            long_term_trend = "Bullish"
        elif df['SMA_50'].iloc[-1] < df['SMA_50'].iloc[-50]:
            long_term_trend = "Bearish"

    result = {
        "short_term_trend": short_term_trend,
        "long_term_trend": long_term_trend,
        "ma_short": latest_sma_10,
        "ma_long": latest_sma_50,
        "method": "SMA"  # Baseline method
    }

    # Add ARIMA prediction for short-term (1-7 days) if available
    if ARIMA_AVAILABLE and len(df) >= 30:
        try:
            arima_forecast = predict_with_arima(df['price'], days=7)
            if arima_forecast:
                result["arima_forecast"] = arima_forecast
                result["arima_short_term_trend"] = arima_forecast.get("trend", "Neutral")
        except Exception as e:
            print(f"ARIMA prediction failed: {e}", file=sys.stderr)

    # Add Prophet prediction for long-term (1-3 months) if available
    if PROPHET_AVAILABLE and len(df) >= 60:
        try:
            prophet_forecast = predict_with_prophet(df, days=90)
            if prophet_forecast:
                result["prophet_forecast"] = prophet_forecast
                result["prophet_long_term_trend"] = prophet_forecast.get("trend", "Neutral")
        except Exception as e:
            print(f"Prophet prediction failed: {e}", file=sys.stderr)

    return result

def predict_with_arima(price_series, days=7):
    """Predict short-term price using ARIMA model"""
    if not ARIMA_AVAILABLE:
        return None
    
    try:
        # Fit ARIMA model (auto-select order)
        model = ARIMA(price_series, order=(1, 1, 1))
        fitted_model = model.fit()
        
        # Forecast next 'days' periods
        forecast = fitted_model.forecast(steps=days)
        forecast_values = forecast.tolist()
        
        # Determine trend based on forecast direction
        current_price = price_series.iloc[-1]
        avg_forecast = np.mean(forecast_values)
        
        if avg_forecast > current_price * 1.02:  # 2% increase threshold
            trend = "Bullish"
        elif avg_forecast < current_price * 0.98:  # 2% decrease threshold
            trend = "Bearish"
        else:
            trend = "Neutral"
        
        return {
            "forecast_days": days,
            "forecast_values": [float(v) for v in forecast_values],
            "current_price": float(current_price),
            "forecast_avg": float(avg_forecast),
            "forecast_change_pct": float((avg_forecast - current_price) / current_price * 100),
            "trend": trend
        }
    except Exception as e:
        print(f"ARIMA error: {e}", file=sys.stderr)
        return None

def predict_with_prophet(df, days=90):
    """Predict long-term trend using Prophet model"""
    if not PROPHET_AVAILABLE:
        return None
    
    try:
        # Prepare data for Prophet (requires 'ds' and 'y' columns)
        prophet_df = pd.DataFrame({
            'ds': df.index,
            'y': df['price'].values
        })
        
        # Fit Prophet model
        model = Prophet(
            yearly_seasonality=False,  # Disable yearly for shorter datasets
            weekly_seasonality=True,
            daily_seasonality=False
        )
        model.fit(prophet_df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)
        
        # Get forecast values
        forecast_tail = forecast.tail(days)
        forecast_values = forecast_tail['yhat'].tolist()
        
        # Determine trend
        current_price = df['price'].iloc[-1]
        avg_forecast = np.mean(forecast_values)
        
        if avg_forecast > current_price * 1.05:  # 5% increase threshold for long-term
            trend = "Bullish"
        elif avg_forecast < current_price * 0.95:  # 5% decrease threshold
            trend = "Bearish"
        else:
            trend = "Neutral"
        
        return {
            "forecast_days": days,
            "forecast_avg": float(avg_forecast),
            "current_price": float(current_price),
            "forecast_change_pct": float((avg_forecast - current_price) / current_price * 100),
            "trend": trend,
            "forecast_values": [float(v) for v in forecast_values[:10]]  # Return first 10 for brevity
        }
    except Exception as e:
        print(f"Prophet error: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        history_json = sys.argv[1]
        history_data = json.loads(history_json)
        analysis_result = analyze_price_history(history_data)
        print(json.dumps(analysis_result))
    else:
        print(json.dumps({"error": "Please provide history data as a JSON argument."}), file=sys.stderr)
