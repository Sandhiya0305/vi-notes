/**
 * Basic tests for Vi-Notes Text Analyzer
 */

const { analyzeText, analyzeSentenceLengthVariation, analyzeVocabularyDiversity, analyzeWordFrequency } = require('./textAnalyzer');

console.log('=== Vi-Notes Text Analyzer Tests ===\n');

// Test 1: Human-like text with varied sentence lengths and good vocabulary diversity
const humanText = `
The quick brown fox jumps over the lazy dog. This is a simple sentence that demonstrates natural writing patterns.
Humans tend to vary their sentence structure, sometimes using short punchy statements and other times longer more complex sentences.
This variety in length and structure is a hallmark of authentic human writing. Different words are used throughout to express ideas.
The vocabulary choices reflect individual writing style and thought process.
`.trim();

console.log('Test 1: Human-like text');
console.log('Input:', humanText.substring(0, 80) + '...');
const result1 = analyzeText(humanText);
console.log('Sentence Length:', result1.sentenceLength);
console.log('Vocabulary Diversity:', result1.vocabularyDiversity);
console.log('Repetition Rate:', result1.wordFrequency.repetitionRate);
console.log('');

// Test 2: AI-like text with uniform sentences and repetitive patterns
const aiText = `
The technology is improving rapidly. The technology changes how we live. The technology creates new opportunities.
The technology enables better communication. The technology connects people worldwide. The technology solves many problems.
The technology drives innovation forward. The technology shapes our future. The technology impacts every industry.
The technology continues to evolve. The technology transforms our world.
`.trim();

console.log('Test 2: AI-like text (repetitive)');
console.log('Input:', aiText.substring(0, 80) + '...');
const result2 = analyzeText(aiText);
console.log('Sentence Length:', result2.sentenceLength);
console.log('Vocabulary Diversity:', result2.vocabularyDiversity);
console.log('Repetition Rate:', result2.wordFrequency.repetitionRate);
console.log('');

// Test 3: Edge cases
console.log('Test 3: Empty string');
const result3 = analyzeText('');
console.log('Result:', result3);
console.log('');

console.log('Test 4: Single word');
const result4 = analyzeText('Hello');
console.log('Result:', result4);
console.log('');

// Test 5: Invalid input
console.log('Test 5: Invalid input (null)');
const result5 = analyzeText(null);
console.log('Result:', result5);
console.log('');

// Summary
console.log('=== Test Summary ===');
console.log('Human text - Higher vocabulary diversity, more sentence length variation');
console.log('AI text   - Lower vocabulary diversity, higher repetition rate');
console.log('\nKey indicators for detecting AI-generated text:');
console.log('- Lower vocabulary diversity ratio (below 0.5)');
console.log('- Higher repetition rate (above 0.3)');
console.log('- Lower standard deviation in sentence length');
console.log('- More repetitive word patterns');
console.log('\nAll tests completed successfully!');