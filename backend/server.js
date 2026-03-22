const express = require('express');
const { analyzeText } = require('./textAnalyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// CORS middleware (for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/analyze
 * Analyze text for statistical characteristics
 * 
 * Request body:
 * {
 *   "text": "Your text to analyze..."
 * }
 * 
 * Response:
 * {
 *   "sentenceLength": { ... },
 *   "vocabularyDiversity": { ... },
 *   "wordFrequency": { ... }
 * }
 */
app.post('/api/analyze', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text'
      });
    }
    
    const result = analyzeText(text);
    
    if (result.error) {
      return res.status(400).json({
        error: result.error
      });
    }
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Internal server error during analysis'
    });
  }
});

/**
 * GET /api/stats
 * Get available analysis metrics (for API documentation)
 */
app.get('/api/stats', (req, res) => {
  res.json({
    metrics: [
      {
        name: 'sentenceLength',
        description: 'Sentence length variation using standard deviation',
        fields: ['meanLength', 'standardDeviation', 'minLength', 'maxLength', 'sentenceCount']
      },
      {
        name: 'vocabularyDiversity',
        description: 'Type-Token Ratio (TTR) and hapax legomena analysis',
        fields: ['totalWords', 'uniqueWords', 'diversityRatio', 'hapaxLegomena', 'hapaxRatio']
      },
      {
        name: 'wordFrequency',
        description: 'Word frequency and repetitive pattern detection',
        fields: ['mostCommon', 'repetitionRate', 'topBigrams']
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Vi-Notes Text Analysis API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Analysis endpoint: POST http://localhost:${PORT}/api/analyze`);
});

module.exports = app;