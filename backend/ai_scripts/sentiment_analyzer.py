# File: backend/ai_scripts/sentiment_analyzer.py
# Purpose: A simple Python script to perform sentiment analysis on text using TextBlob.
# Date: 2025-10-20

import sys
from textblob import TextBlob

def analyze_sentiment(text):
    analysis = TextBlob(text)
    if analysis.sentiment.polarity > 0:
        return "Positive"
    elif analysis.sentiment.polarity < 0:
        return "Negative"
    else:
        return "Neutral"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text_to_analyze = sys.argv[1]
        sentiment = analyze_sentiment(text_to_analyze)
        print(sentiment)
    else:
        print("Please provide text as an argument.")
