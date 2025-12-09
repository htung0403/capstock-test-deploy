# File: backend/ai_scripts/sentiment_analyzer.py
# Purpose: Sentiment analysis using TextBlob and VADER (with fallback)
# Date: 2025-10-20
# CHANGES (2025-01-15):
# - Added VADER sentiment analyzer support
# - Added method selection (TextBlob or VADER)
# - Returns both label and score for better analysis

import sys
import json
from textblob import TextBlob

# Try to import VADER, fallback to TextBlob if not available
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    VADER_AVAILABLE = True
except ImportError:
    VADER_AVAILABLE = False
    print("Warning: VADER not available. Install with: pip install vaderSentiment", file=sys.stderr)

def analyze_with_textblob(text):
    """Analyze sentiment using TextBlob"""
    analysis = TextBlob(text)
    polarity = analysis.sentiment.polarity
    
    if polarity > 0.1:
        label = "Positive"
    elif polarity < -0.1:
        label = "Negative"
    else:
        label = "Neutral"
    
    return {
        "label": label,
        "score": float(polarity),
        "method": "TextBlob"
    }

def analyze_with_vader(text):
    """Analyze sentiment using VADER (better for social media and financial text)"""
    if not VADER_AVAILABLE:
        return None
    
    analyzer = SentimentIntensityAnalyzer()
    scores = analyzer.polarity_scores(text)
    
    compound = scores['compound']
    
    if compound >= 0.05:
        label = "Positive"
    elif compound <= -0.05:
        label = "Negative"
    else:
        label = "Neutral"
    
    return {
        "label": label,
        "score": float(compound),
        "method": "VADER",
        "scores": {
            "positive": float(scores['pos']),
            "neutral": float(scores['neu']),
            "negative": float(scores['neg']),
            "compound": float(scores['compound'])
        }
    }

def analyze_sentiment(text, method="auto"):
    """
    Analyze sentiment with specified method or auto-select best available
    
    Args:
        text: Text to analyze
        method: "textblob", "vader", or "auto" (default: auto)
    
    Returns:
        dict with label, score, method
    """
    if method == "vader" and VADER_AVAILABLE:
        result = analyze_with_vader(text)
        if result:
            return result
    
    # Fallback to TextBlob
    return analyze_with_textblob(text)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Please provide text as an argument."}), file=sys.stderr)
        sys.exit(1)
    
    text_to_analyze = sys.argv[1]
    method = sys.argv[2] if len(sys.argv) > 2 else "auto"
    
    try:
        result = analyze_sentiment(text_to_analyze, method)
        # Output as JSON for better parsing
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
