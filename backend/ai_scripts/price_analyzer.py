# File: backend/ai_scripts/price_analyzer.py
# Purpose: A Python script to analyze historical stock price data, calculate moving averages, and determine trends.
# Date: 2025-10-20

import sys
import json
import pandas as pd

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

    return {
        "short_term_trend": short_term_trend,
        "long_term_trend": long_term_trend,
        "ma_short": latest_sma_10,
        "ma_long": latest_sma_50,
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        history_json = sys.argv[1]
        history_data = json.loads(history_json)
        analysis_result = analyze_price_history(history_data)
        print(json.dumps(analysis_result))
    else:
        print(json.dumps({"error": "Please provide history data as a JSON argument."}), file=sys.stderr)
