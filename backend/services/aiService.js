/*
  File: services/aiService.js
  Purpose: 
  - Ollama local AI service using llama3.1:8b model (LLM)
  - Python ML analysis scripts (sentiment, price, hybrid analysis)
  No API key required - runs locally
*/

const fetch = require("node-fetch");
const { spawn } = require('child_process');
const path = require('path');

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

/**
 * Send messages to Ollama local AI
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<string>} AI-generated text response
 */
async function askAI(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages must be a non-empty array");
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("[AIService] Ollama API error:", error.message);
    throw error;
  }
}

/**
 * Send a simple message (convenience function)
 * @param {string} message - User message
 * @param {string} systemPrompt - Optional system prompt
 * @returns {Promise<string>} AI response
 */
async function sendMessage(message, systemPrompt = null) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt
    });
  }
  
  messages.push({
    role: "user",
    content: message
  });

  return askAI(messages);
}

/**
 * Run Python script and return JSON result
 * @param {string} scriptPath - Path to Python script
 * @param {Array<string>} args - Arguments to pass to script
 * @returns {Promise<Object>} Parsed JSON result
 */
function runPythonScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
        return;
      }
      
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Python output: ${output}`));
      }
    });
  });
}

/**
 * Analyze sentiment of text using Python script
 * @param {string} text - Text to analyze
 * @param {string} method - Analysis method: "textblob", "vader", or "auto"
 * @returns {Promise<Object>} Sentiment result with label, score, method
 */
async function getSentiment(text, method = "auto") {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      label: 'Neutral',
      score: 0,
      method: 'No input'
    };
  }

  try {
    const scriptPath = path.join(__dirname, '..', 'ai_scripts', 'sentiment_analyzer.py');
    const result = await runPythonScript(scriptPath, [text, method]);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[AIService] Sentiment analysis error:', error.message);
    // Return neutral sentiment on error
    return {
      label: 'Neutral',
      score: 0,
      method: 'Error: ' + error.message
    };
  }
}

/**
 * Analyze hybrid (technical indicators + sentiment)
 * @param {Array} historyData - Array of {price, timestamp} objects
 * @param {string} newsText - Combined news text for sentiment
 * @returns {Promise<Object>} Hybrid analysis result
 */
async function analyzeHybrid(historyData, newsText) {
  try {
    const scriptPath = path.join(__dirname, '..', 'ai_scripts', 'hybrid_analyzer.py');
    const historyJson = JSON.stringify(historyData);
    const newsTextSafe = newsText || '';
    
    const result = await runPythonScript(scriptPath, [historyJson, newsTextSafe]);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[AIService] Hybrid analysis error:', error.message);
    throw error;
  }
}

/**
 * Analyze price history with ML or traditional methods
 * @param {string} symbol - Stock symbol
 * @param {Array} historyData - Array of {price, timestamp} objects
 * @returns {Promise<Object>} Price analysis result
 */
async function analyzePriceHistoryEnhanced(symbol, historyData) {
  try {
    // Try ML model first
    const mlPredictorPath = path.join(__dirname, '..', 'ai_scripts', 'ml_price_predictor.py');
    const fs = require('fs');
    
    // Check if ML model exists
    const modelPath = path.join(__dirname, '..', 'ai_models', `price_model_${symbol.toUpperCase()}.pkl`);
    if (fs.existsSync(modelPath)) {
      try {
        const historyJson = JSON.stringify(historyData);
        const result = await runPythonScript(mlPredictorPath, [symbol, historyJson]);
        if (result && !result.error) {
          return result;
        }
      } catch (mlError) {
        console.log(`[AIService] ML model failed for ${symbol}, using traditional analysis`);
      }
    }
    
    // Fallback to traditional analysis
    const scriptPath = path.join(__dirname, '..', 'ai_scripts', 'price_analyzer.py');
    const historyJson = JSON.stringify(historyData);
    const result = await runPythonScript(scriptPath, [historyJson]);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[AIService] Price analysis error:', error.message);
    throw error;
  }
}

/**
 * Calculate evaluation metrics for ML models
 * @param {Array} actual - Actual values
 * @param {Array} predicted - Predicted values
 * @returns {Promise<Object>} Metrics (MAE, RMSE, MAPE, direction_accuracy)
 */
async function calculateEvaluationMetrics(actual, predicted) {
  try {
    const scriptPath = path.join(__dirname, '..', 'ai_scripts', 'evaluation.py');
    const actualJson = JSON.stringify(actual);
    const predictedJson = JSON.stringify(predicted);
    
    const result = await runPythonScript(scriptPath, [actualJson, predictedJson]);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('[AIService] Evaluation metrics error:', error.message);
    throw error;
  }
}

module.exports = { 
  askAI, 
  sendMessage,
  getSentiment,
  analyzeHybrid,
  analyzePriceHistoryEnhanced,
  calculateEvaluationMetrics
};
