export interface TextStatisticsSnapshot {
  wordCount: number;
  averageWordLength: number;
  sentenceCount: number;
}

export default class TextStatisticsService {
  analyze(text: string): TextStatisticsSnapshot {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const sentences = text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0);
    const characterTotal = words.reduce((sum, word) => sum + word.length, 0);

    return {
      wordCount: words.length,
      averageWordLength: words.length ? Number((characterTotal / words.length).toFixed(2)) : 0,
      sentenceCount: sentences.length,
    };
  }
}
