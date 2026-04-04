import type { TextStatisticsMetrics } from '../types';

export default class TextStatisticsService {
  private round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private getSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private getWords(text: string): string[] {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  private calculateSentenceLengthVariation(sentences: string[]): number {
    if (sentences.length < 2) return 0;

    const lengths = sentences.map((s) => this.getWords(s).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-100 scale (higher = more variation)
    return Math.min(this.round((stdDev / mean) * 100), 100);
  }

  private calculateLexicalDiversity(words: string[]): number {
    if (words.length === 0) return 0;

    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    // Type-Token Ratio (unique words / total words)
    const ttr = uniqueWords.size / words.length;

    // Normalize to 0-100 scale
    return this.round(ttr * 100);
  }

  private calculateLexicalRichness(words: string[]): number {
    if (words.length === 0) return 0;

    // Count words that appear only once
    const wordFreq = new Map<string, number>();
    words.forEach((w) => {
      const lower = w.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    });

    const hapaxCount = Array.from(wordFreq.values()).filter((count) => count === 1).length;
    const hapaxIndex = (hapaxCount / words.length) * 100;

    return this.round(hapaxIndex);
  }

  private detectLinguisticIrregularities(text: string, words: string[]): string[] {
    const irregularities: string[] = [];

    // Check for excessive repetition
    const wordFreq = new Map<string, number>();
    words.forEach((w) => {
      const lower = w.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    });

    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    topWords.forEach(([word, count]) => {
      if (count > words.length * 0.15) {
        irregularities.push(`Excessive repetition of "${word}" (${count} times)`);
      }
    });

    // Check for unusual punctuation patterns
    const punctuationCount = (text.match(/[!?]{2,}/g) || []).length;
    if (punctuationCount > words.length * 0.02) {
      irregularities.push('Unusual punctuation density (multiple ! or ? in sequence)');
    }

    // Check for very long sentences
    const sentences = this.getSentences(text);
    sentences.forEach((sent) => {
      const sentLength = this.getWords(sent).length;
      if (sentLength > 50) {
        irregularities.push(`Extremely long sentence detected (${sentLength} words)`);
      }
    });

    // Check for contracted forms and informal patterns
    const contractions = (text.match(/\b(don't|can't|won't|shouldn't|haven't|doesn't)\b/gi) || []).length;
    const totalSentences = sentences.length;
    if (contractions > totalSentences * 2) {
      irregularities.push('High frequency of contractions (informal style)');
    }

    return irregularities;
  }

  analyze(text: string): TextStatisticsMetrics {
    const words = this.getWords(text);
    const sentences = this.getSentences(text);
    const characterTotal = words.reduce((sum, word) => sum + word.length, 0);

    const sentenceLengthVariation = this.calculateSentenceLengthVariation(sentences);
    const lexicalDiversity = this.calculateLexicalDiversity(words);
    const lexicalRichness = this.calculateLexicalRichness(words);
    const linguisticIrregularities = this.detectLinguisticIrregularities(text, words);

    return {
      wordCount: words.length,
      averageWordLength: words.length ? this.round(characterTotal / words.length) : 0,
      sentenceCount: sentences.length,
      sentenceLengthVariation,
      lexicalDiversity,
      lexicalRichness,
      linguisticIrregularities,
    };
  }
}
