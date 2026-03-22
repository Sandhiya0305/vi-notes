/**
 * Text Statistics Analyzer for Vi-Notes
 * Analyzes textual characteristics to help distinguish human-written from AI-generated content
 */

/**
 * Splits text into sentences
 * @param {string} text - The text to analyze
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text) {
  // Split by sentence-ending punctuation (. ! ?)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

/**
 * Splits text into words
 * @param {string} text - The text to analyze
 * @returns {string[]} Array of words (lowercased)
 */
function splitIntoWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Calculates the standard deviation of sentence lengths
 * Human writing typically has more variation in sentence length
 * @param {string} text - The text to analyze
 * @returns {object} Sentence length statistics
 */
function analyzeSentenceLengthVariation(text) {
  const sentences = splitIntoSentences(text);
  
  if (sentences.length === 0) {
    return {
      meanLength: 0,
      standardDeviation: 0,
      minLength: 0,
      maxLength: 0,
      sentenceCount: 0
    };
  }
  
  // Calculate word count for each sentence
  const sentenceWordCounts = sentences.map(s => splitIntoWords(s).length);
  
  // Calculate mean
  const sum = sentenceWordCounts.reduce((acc, count) => acc + count, 0);
  const meanLength = sum / sentenceWordCounts.length;
  
  // Calculate standard deviation
  const squaredDiffs = sentenceWordCounts.map(count => Math.pow(count - meanLength, 2));
  const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / sentenceWordCounts.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    meanLength: Math.round(meanLength * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    minLength: Math.min(...sentenceWordCounts),
    maxLength: Math.max(...sentenceWordCounts),
    sentenceCount: sentences.length
  };
}

/**
 * Calculates vocabulary diversity (Type-Token Ratio)
 * Human writing typically has higher vocabulary diversity
 * @param {string} text - The text to analyze
 * @returns {object} Vocabulary diversity metrics
 */
function analyzeVocabularyDiversity(text) {
  const words = splitIntoWords(text);
  
  if (words.length === 0) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      diversityRatio: 0,
      hapaxLegomena: 0
    };
  }
  
  const uniqueWords = new Set(words);
  const diversityRatio = uniqueWords.size / words.length;
  
  // Hapax legomena: words that appear only once
  const wordFrequency = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  const hapaxLegomena = Object.values(wordFrequency).filter(count => count === 1).length;
  
  return {
    totalWords: words.length,
    uniqueWords: uniqueWords.size,
    diversityRatio: Math.round(diversityRatio * 10000) / 10000,
    hapaxLegomena: hapaxLegomena,
    hapaxRatio: Math.round((hapaxLegomena / uniqueWords.size) * 10000) / 10000
  };
}

/**
 * Analyzes word frequency for repetitive patterns
 * AI-generated text often has more uniform word distribution
 * @param {string} text - The text to analyze
 * @returns {object} Word frequency analysis
 */
function analyzeWordFrequency(text) {
  const words = splitIntoWords(text);
  
  if (words.length === 0) {
    return {
      mostCommon: [],
      repetitionRate: 0,
      topBigrams: []
    };
  }
  
  // Calculate word frequencies
  const wordFrequency = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1]);
  
  // Get top 10 most common words
  const mostCommon = sortedWords.slice(0, 10).map(([word, count]) => ({
    word,
    count,
    percentage: Math.round((count / words.length) * 10000) / 100
  }));
  
  // Calculate repetition rate (how much of the text is made of repeated words)
  const totalRepeats = sortedWords.reduce((acc, [_, count]) => {
    return count > 1 ? acc + (count - 1) : acc;
  }, 0);
  const repetitionRate = totalRepeats / words.length;
  
  // Calculate bigrams (pairs of consecutive words)
  const bigrams = {};
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    bigrams[bigram] = (bigrams[bigram] || 0) + 1;
  }
  
  const topBigrams = Object.entries(bigrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([bigram, count]) => ({
      bigram,
      count
    }));
  
  return {
    mostCommon,
    repetitionRate: Math.round(repetitionRate * 10000) / 10000,
    topBigrams
  };
}

/**
 * Main function to analyze text and return all statistics
 * @param {string} text - The text to analyze
 * @returns {object} Complete text statistics
 */
function analyzeText(text) {
  if (!text || typeof text !== 'string') {
    return {
      error: 'Invalid input: text must be a non-empty string',
      sentenceLength: null,
      vocabularyDiversity: null,
      wordFrequency: null
    };
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length === 0) {
    return {
      error: 'Invalid input: text cannot be empty',
      sentenceLength: null,
      vocabularyDiversity: null,
      wordFrequency: null
    };
  }
  
  return {
    sentenceLength: analyzeSentenceLengthVariation(trimmedText),
    vocabularyDiversity: analyzeVocabularyDiversity(trimmedText),
    wordFrequency: analyzeWordFrequency(trimmedText)
  };
}

module.exports = {
  analyzeText,
  analyzeSentenceLengthVariation,
  analyzeVocabularyDiversity,
  analyzeWordFrequency
};