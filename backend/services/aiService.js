/*
  File: services/aiService.js
  Purpose: Manages interaction with AI scripts for sentiment and price analysis.
  
  CHANGES (2025-10-20):
  - Corrected `pythonScriptPath` for `getSentiment` to point to `sentiment_analyzer.py`.
  - Added `analyzePriceHistory` function to call `price_analyzer.py` with historical data.
  - Ensures correct path handling using `path.join` (fixed backslash issues).
*/
const { spawn } = require('child_process');
const path = require('path');

exports.getSentiment = async (text) => {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '..', 'ai_scripts', 'sentiment_analyzer.py');
    const pythonProcess = spawn('python', [pythonScriptPath, text]);

    let sentimentResult = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      sentimentResult += data.toString().trim();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}. Error: ${errorOutput}`);
        return reject(new Error(`Python script failed: ${errorOutput}`));
      }
      resolve(sentimentResult);
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python subprocess:', err);
      reject(new Error(`Failed to start Python subprocess: ${err.message}`));
    });
  });
};

exports.analyzePriceHistory = async (history_data) => {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '..', 'ai_scripts', 'price_analyzer.py');
    const history_json = JSON.stringify(history_data);
    const pythonProcess = spawn('python', [pythonScriptPath, history_json]);

    let analysisResult = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      analysisResult += data.toString().trim();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}. Error: ${errorOutput}`);
        return reject(new Error(`Python script failed: ${errorOutput}`));
      }
      try {
        resolve(JSON.parse(analysisResult));
      } catch (e) {
        reject(new Error(`Failed to parse Python script output: ${analysisResult}`));
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python subprocess:', err);
      reject(new Error(`Failed to start Python subprocess: ${err.message}`));
    });
  });
};
