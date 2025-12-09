/*
  File: utils/datasetParser.js
  Purpose: Parse CSV/Excel datasets and map to TrainingData schema
  Date: 2025-01-15
*/
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const XLSX = require('xlsx');

// Default allowed symbols
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NFLX'];

/**
 * Normalize column names (handle variations like 'Symbol', 'symbol', 'SYMBOL', 'ticker')
 */
function normalizeColumnName(colName) {
  if (!colName) return null;
  const normalized = colName.trim().toLowerCase();
  
  // Symbol variations
  if (normalized === 'symbol' || normalized === 'ticker' || normalized === 'ticker_symbol') {
    return 'symbol';
  }
  
  // Date variations
  if (normalized === 'date' || normalized === 'timestamp' || normalized === 'time') {
    return 'date';
  }
  
  // Price variations
  if (normalized === 'open' || normalized === 'open_price') return 'open';
  if (normalized === 'high' || normalized === 'high_price') return 'high';
  if (normalized === 'low' || normalized === 'low_price') return 'low';
  if (normalized === 'close' || normalized === 'close_price' || normalized === 'close/last' || normalized === 'close_last' || normalized.includes('close')) return 'close';
  if (normalized === 'adjusted_close' || normalized === 'adj_close' || normalized === 'adjclose') return 'adjusted_close';
  if (normalized === 'volume') return 'volume';
  
  // News/sentiment variations
  if (normalized === 'news_text' || normalized === 'text' || normalized === 'content') return 'news_text';
  if (normalized === 'news_title' || normalized === 'title' || normalized === 'headline') return 'news_title';
  if (normalized === 'sentiment_score' || normalized === 'sentiment' || normalized === 'score') return 'sentiment_score';
  
  return normalized;
}

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

/**
 * Parse Excel file
 */
function parseExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet);
    return records;
  } catch (error) {
    throw new Error(`Failed to parse Excel: ${error.message}`);
  }
}

/**
 * Parse dataset file (CSV or Excel)
 */
function parseDataset(filePath, fileExtension) {
  const ext = fileExtension.toLowerCase();
  
  if (ext === '.csv') {
    return parseCSV(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Normalize column names in records
 */
function normalizeColumns(records) {
  if (!records || records.length === 0) return [];
  
  // Get first record to determine column mapping
  const firstRecord = records[0];
  const columnMap = {};
  
  Object.keys(firstRecord).forEach(key => {
    const normalized = normalizeColumnName(key);
    if (normalized) {
      columnMap[key] = normalized;
    }
  });
  
  // Map all records
  return records.map(record => {
    const normalized = {};
    Object.keys(record).forEach(key => {
      const mappedKey = columnMap[key];
      if (mappedKey) {
        normalized[mappedKey] = record[key];
      }
    });
    return normalized;
  });
}

/**
 * Filter records by allowed symbols
 */
function filterBySymbols(records, allowedSymbols) {
  const symbolSet = new Set(allowedSymbols.map(s => s.toUpperCase()));
  return records.filter(record => {
    const symbol = record.symbol ? String(record.symbol).toUpperCase().trim() : null;
    return symbol && symbolSet.has(symbol);
  });
}

/**
 * Clean and parse numeric value (remove $, commas, etc.)
 */
function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse date from various formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
 */
function parseDate(value) {
  if (!value) return null;
  
  // Try standard Date parsing first
  let date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try MM/DD/YYYY format
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value));
  if (mmddyyyy) {
    const month = parseInt(mmddyyyy[1]) - 1; // JS months are 0-indexed
    const day = parseInt(mmddyyyy[2]);
    const year = parseInt(mmddyyyy[3]);
    date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Map records to TrainingData documents for price prediction mode
 */
function mapToPricePrediction(records, userId, defaultSymbol = null) {
  const trainingDataDocs = [];
  const symbolData = {}; // Track previous close for each symbol
  
  records.forEach((record, index) => {
    try {
      // Try to get symbol from record, or use defaultSymbol
      let symbol = record.symbol ? String(record.symbol).toUpperCase().trim() : null;
      if (!symbol && defaultSymbol) {
        symbol = defaultSymbol.toUpperCase().trim();
      }
      if (!symbol) {
        if (index < 3) console.log(`Record ${index}: Skipped - no symbol. Record keys:`, Object.keys(record));
        return; // Skip if no symbol
      }
      
      // Parse date
      let predictionDate = parseDate(record.date);
      if (!predictionDate) {
        if (index < 3) console.log(`Record ${index}: Skipped - invalid date. Date value:`, record.date);
        return; // Skip if invalid date
      }
      
      // Parse prices (handle $ and commas)
      const open = parseNumericValue(record.open);
      const high = parseNumericValue(record.high);
      const low = parseNumericValue(record.low);
      const close = parseNumericValue(record.close);
      const adjustedClose = parseNumericValue(record.adjusted_close) || close;
      const volume = parseNumericValue(record.volume) || 0;
      
      if (close === null) {
        if (index < 3) console.log(`Record ${index}: Skipped - no close price. Close value:`, record.close);
        return; // Skip if no close price
      }
      
      // Calculate actual_trend
      let actualTrend = null;
      if (symbolData[symbol] && symbolData[symbol].previousClose !== null) {
        const prevClose = symbolData[symbol].previousClose;
        if (close > prevClose * 1.001) { // 0.1% threshold to avoid noise
          actualTrend = 'Bullish';
        } else if (close < prevClose * 0.999) {
          actualTrend = 'Bearish';
        } else {
          actualTrend = 'Neutral';
        }
      }
      
      // Update previous close for next iteration
      symbolData[symbol] = { previousClose: close };
      
      // Build input_data object
      const inputData = {
        open,
        high,
        low,
        close,
        adjusted_close: adjustedClose,
        volume,
      };
      
      const doc = {
        data_type: 'price_prediction',
        symbol,
        input_data: inputData,
        actual_price: close,
        actual_trend: actualTrend,
        prediction_date: predictionDate,
        actual_date: predictionDate, // For now, use same date (can be updated later)
        source: 'dataset',
        added_by: userId,
        status: 'pending',
      };
      
      trainingDataDocs.push(doc);
    } catch (error) {
      console.error(`Error mapping record ${index}:`, error);
      // Continue with next record
    }
  });
  
  return trainingDataDocs;
}

/**
 * Map records to TrainingData documents for sentiment mode
 */
function mapToSentiment(records, userId, defaultSymbol = null) {
  const trainingDataDocs = [];
  
  records.forEach((record, index) => {
    try {
      let symbol = record.symbol ? String(record.symbol).toUpperCase().trim() : null;
      if (!symbol && defaultSymbol) {
        symbol = defaultSymbol.toUpperCase().trim();
      }
      
      // Parse date
      let predictionDate = parseDate(record.date);
      if (!predictionDate) {
        predictionDate = new Date(); // Default to now if no date
      }
      
      // Get input text (prefer news_text, fallback to news_title)
      const inputText = record.news_text || record.news_title || null;
      if (!inputText) return; // Skip if no text
      
      // Parse sentiment score
      const sentimentScore = record.sentiment_score !== undefined 
        ? parseFloat(record.sentiment_score) 
        : null;
      
      // Derive sentiment label from score
      let actualSentiment = null;
      if (sentimentScore !== null) {
        if (sentimentScore > 0.1) {
          actualSentiment = 'Positive';
        } else if (sentimentScore < -0.1) {
          actualSentiment = 'Negative';
        } else {
          actualSentiment = 'Neutral';
        }
      }
      
      const doc = {
        data_type: 'sentiment',
        symbol,
        input_text: String(inputText),
        actual_sentiment_score: sentimentScore,
        actual_sentiment: actualSentiment,
        prediction_date: predictionDate,
        actual_date: predictionDate,
        source: 'dataset',
        added_by: userId,
        status: 'pending',
      };
      
      trainingDataDocs.push(doc);
    } catch (error) {
      console.error(`Error mapping record ${index}:`, error);
      // Continue with next record
    }
  });
  
  return trainingDataDocs;
}

/**
 * Main function to process dataset file
 */
function processDataset(filePath, fileExtension, mode, allowedSymbols, userId, defaultSymbol = null) {
  // Parse file
  const rawRecords = parseDataset(filePath, fileExtension);
  console.log(`Parsed ${rawRecords.length} raw records from file`);
  
  // Normalize columns
  const normalizedRecords = normalizeColumns(rawRecords);
  console.log(`Normalized columns, ${normalizedRecords.length} records`);
  
  // Debug: Log first record to see normalized columns
  if (normalizedRecords.length > 0) {
    console.log('First normalized record keys:', Object.keys(normalizedRecords[0]));
    console.log('First normalized record sample:', JSON.stringify(normalizedRecords[0], null, 2).substring(0, 300));
  }
  
  // Check if records have symbol column
  const hasSymbolColumn = normalizedRecords.length > 0 && normalizedRecords[0].symbol;
  
  // If no symbol column and no defaultSymbol, try to infer from filename
  let inferredSymbol = defaultSymbol && defaultSymbol.trim() ? defaultSymbol.trim().toUpperCase() : null;
  if (!hasSymbolColumn && !inferredSymbol) {
    const filename = path.basename(filePath, fileExtension);
    // Try to extract symbol from filename (e.g., "AAPL_HistoricalQuotes.csv" -> "AAPL")
    const symbolMatch = filename.match(/^([A-Z]{1,5})/i);
    if (symbolMatch) {
      inferredSymbol = symbolMatch[1].toUpperCase();
      console.log(`Inferred symbol from filename: ${inferredSymbol}`);
    }
  }
  
  // Filter by symbols (only if symbol column exists)
  let filteredRecords = normalizedRecords;
  if (hasSymbolColumn) {
    const symbols = allowedSymbols && allowedSymbols.length > 0 
      ? allowedSymbols 
      : DEFAULT_SYMBOLS;
    filteredRecords = filterBySymbols(normalizedRecords, symbols);
    console.log(`Filtered to ${filteredRecords.length} records for symbols: ${symbols.join(', ')}`);
  } else {
    console.log(`No symbol column found. Using inferred/default symbol: ${inferredSymbol || 'N/A'}`);
  }
  
  // Map to TrainingData documents
  let trainingDataDocs = [];
  console.log(`[DEBUG] About to map records. Mode: ${mode}, inferredSymbol: ${inferredSymbol}, filteredRecords: ${filteredRecords.length}`);
  if (mode === 'price_prediction') {
    trainingDataDocs = mapToPricePrediction(filteredRecords, userId, inferredSymbol);
  } else if (mode === 'sentiment') {
    trainingDataDocs = mapToSentiment(filteredRecords, userId, inferredSymbol);
  } else {
    throw new Error(`Unsupported mode: ${mode}. Use 'price_prediction' or 'sentiment'`);
  }
  
  console.log(`Mapped to ${trainingDataDocs.length} TrainingData documents`);
  
  return {
    trainingDataDocs,
    stats: {
      rawRecords: rawRecords.length,
      normalizedRecords: normalizedRecords.length,
      filteredRecords: filteredRecords.length,
      mappedRecords: trainingDataDocs.length,
      skippedRecords: filteredRecords.length - trainingDataDocs.length,
    },
  };
}

module.exports = {
  processDataset,
  DEFAULT_SYMBOLS,
};

