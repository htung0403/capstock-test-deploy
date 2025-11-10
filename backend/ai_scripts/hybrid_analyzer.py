# ==========================================================
# File: hybrid_analyzer.py
# Purpose: Combine technical indicators (EMA, RSI)
#          and sentiment analysis to generate Buy/Hold/Sell signal
# Date: 2025-11-03
# ==========================================================

import sys, json
import pandas as pd
from textblob import TextBlob

try:
    import ta
except ImportError:
    print(json.dumps({"error": "Please install the 'ta' library (pip install ta)"}))
    sys.exit(1)

def analyze_technical(history_data):
    df = pd.DataFrame(history_data)
    if 'timestamp' not in df or 'price' not in df:
        return {"ema": None, "rsi": None, "technical_signal": "Invalid input"}
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    if len(df) < 20:
        return {"ema": None, "rsi": None, "technical_signal": "Insufficient data"}

    df['ema_20'] = ta.trend.ema_indicator(df['price'], window=20)
    df['rsi_14'] = ta.momentum.rsi(df['price'], window=14)
    latest = df.iloc[-1]
    price, ema, rsi = float(latest['price']), float(latest['ema_20']), float(latest['rsi_14'])

    if price > ema and rsi < 70:
        tech = "Bullish"
    elif price < ema and rsi > 30:
        tech = "Bearish"
    else:
        tech = "Neutral"

    return {"ema": ema, "rsi": rsi, "technical_signal": tech}

def analyze_sentiment(text):
    polarity = TextBlob(text).sentiment.polarity
    if polarity > 0.1:  label = "Positive"
    elif polarity < -0.1: label = "Negative"
    else: label = "Neutral"
    return label, float(polarity)

def hybrid_decision(technical, sent_label):
    tsig = technical.get("technical_signal")
    if tsig == "Bullish" and sent_label == "Positive":
        return "Buy", "High"
    if tsig == "Bearish" and sent_label == "Negative":
        return "Sell", "High"
    if tsig == "Neutral":
        return "Hold", "Low"
    return "Hold", "Medium"

def hybrid_analyze(history_data, news_text):
    tech = analyze_technical(history_data)
    sent_label, sent_score = analyze_sentiment(news_text)
    final, confidence = hybrid_decision(tech, sent_label)
    return {
        "ema_20": tech.get("ema"),
        "rsi_14": tech.get("rsi"),
        "technical_signal": tech.get("technical_signal"),
        "sentiment_label": sent_label,
        "sentiment_score": sent_score,
        "final_signal": final,
        "confidence": confidence,
        "explanation": (
            f"Tech={tech.get('technical_signal')} (EMA20={round(tech.get('ema') or 0,2)}, "
            f"RSI14={round(tech.get('rsi') or 0,2)}); "
            f"Sentiment={sent_label} ({round(sent_score,2)}). "
            f"Signal={final} (conf={confidence})."
        )
    }

if __name__ == "__main__":
    if len(sys.argv) > 2:
        history_json, news_text = sys.argv[1], sys.argv[2]
        try:
            history_data = json.loads(history_json)
        except Exception as e:
            print(json.dumps({"error": f"Invalid JSON: {e}"}))
            sys.exit(1)
        print(json.dumps(hybrid_analyze(history_data, news_text), ensure_ascii=False))
    else:
        print(json.dumps({"error": "Please provide price history JSON and news text"}))
