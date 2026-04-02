import type { AuthenticityReport, SuspiciousSegment } from '../../types';

export default class SuspiciousSegmentDetector {
  /**
   * Detect suspicious text segments that show signs of AI generation or plagiarism
   */
  detectSegments(text: string, report: AuthenticityReport): SuspiciousSegment[] {
    const segments: SuspiciousSegment[] = [];

    // 1. Detect overly formal/templated phrases (AI indicator)
    segments.push(...this.detectTemplatedPhrases(text, report));

    // 2. Detect abrupt tone/style shifts
    segments.push(...this.detectToneShifts(text, report));

    // 3. Detect perfect sentences (unusual perfection suggests AI)
    segments.push(...this.detectPerfectSentences(text, report));

    // 4. Detect high-confidence passages (AI tends to be more confident)
    segments.push(...this.detectOverconfidentPassages(text, report));

    // 5. Detect repeated phrases or patterns
    segments.push(...this.detectRepeatedPatterns(text, report));

    return segments;
  }

  /**
   * Detect templated/formal phrases common in AI output
   */
  private detectTemplatedPhrases(text: string, report: AuthenticityReport): SuspiciousSegment[] {
    const segments: SuspiciousSegment[] = [];
    const aiPhrases = [
      'In conclusion',
      'Furthermore',
      'Moreover',
      'In addition',
      'It is important to note',
      'It is worth noting',
      'As previously mentioned',
      'As stated earlier',
      'Without a doubt',
      'To summarize',
      'In summary',
      'As can be seen',
      'It is evident that',
      'One could argue',
      'In light of',
    ];

    aiPhrases.forEach((phrase) => {
      const regex = new RegExp(`${phrase}`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Only flag if high suspicion score (likely AI)
        if (report.overallSuspicionScore >= 45) {
          segments.push({
            text: phrase,
            startIndex: match.index,
            endIndex: match.index + phrase.length,
            reason: 'Templated formal phrase—common in AI generated text',
            suspicionLevel: report.overallSuspicionScore > 70 ? 'high' : 'medium',
          });
        }
      }
    });

    return segments;
  }

  /**
   * Detect abrupt shifts in tone or complexity
   */
  private detectToneShifts(text: string, report: AuthenticityReport): SuspiciousSegment[] {
    const segments: SuspiciousSegment[] = [];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length < 3) return segments;

    for (let i = 1; i < sentences.length - 1; i++) {
      const prevSentence = sentences[i - 1].trim();
      const currentSentence = sentences[i].trim();
      const nextSentence = sentences[i + 1].trim();

      const prevComplexity = this.calculateComplexity(prevSentence);
      const currentComplexity = this.calculateComplexity(currentSentence);
      const nextComplexity = this.calculateComplexity(nextSentence);

      // Detect jarring shifts (complexity jump > 2x)
      if (Math.abs(currentComplexity - prevComplexity) > 2 || Math.abs(currentComplexity - nextComplexity) > 2) {
        segments.push({
          text: currentSentence,
          startIndex: text.indexOf(currentSentence),
          endIndex: text.indexOf(currentSentence) + currentSentence.length,
          reason: 'Abrupt tone/complexity shift—inconsistent authorship',
          suspicionLevel: 'medium',
        });
      }
    }

    return segments;
  }

  /**
   * Detect sentences that are suspiciously perfect (lack of human errors)
   */
  private detectPerfectSentences(text: string, report: AuthenticityReport): SuspiciousSegment[] {
    const segments: SuspiciousSegment[] = [];

    if (report.metrics.editRatio > 0.1) {
      // If there are lots of edits, less likely to find "perfect" sentences
      return segments;
    }

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed.length < 20) return; // Skip very short sentences

      // Check if sentence has no common typos or informal markers
      const hasErrors = /\b(ur|u|ur|abt|tbh|ngl|etc)\b/i.test(trimmed); // Informal markers
      const hasRepeats = /(\w)\1{2,}/.test(trimmed); // Letter repeats (typos)
      const hasMissingPunct = /[a-z]\s[A-Z]/.test(trimmed); // Missing punctuation between sentences

      if (!hasErrors && !hasRepeats && !hasMissingPunct && trimmed.length > 50) {
        segments.push({
          text: trimmed,
          startIndex: text.indexOf(sentence),
          endIndex: text.indexOf(sentence) + sentence.length,
          reason: 'Unusually perfect sentence—lacks natural human errors',
          suspicionLevel: report.overallSuspicionScore > 60 ? 'medium' : 'low',
        });
      }
    });

    return segments.slice(0, 3); // Limit to top 3 to avoid noise
  }

  /**
   * Detect passages with overconfident language
   */
  private detectOverconfidentPassages(text: string, report: AuthenticityReport): SuspiciousSegment[] {
    const segments: SuspiciousSegment[] = [];

    const confidentMarkers = [
      'definitely',
      'certainly',
      'obviously',
      'clearly',
      'undoubtedly',
      'absolutely',
      'unquestionably',
      'without doubt',
    ];

    confidentMarkers.forEach((marker) => {
      const regex = new RegExp(`[^.!?]*${marker}[^.!?]*[.!?]`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (report.overallSuspicionScore >= 50) {
          segments.push({
            text: match[0].trim(),
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            reason: 'Overconfident language—AI tends to be more assertive than humans',
            suspicionLevel: 'medium',
          });
        }
      }
    });

    return segments.slice(0, 3);
  }

  /**
   * Detect repeated phrases or patterns
   */
  private detectRepeatedPatterns(text: string, report: AuthenticityReport): SuspiciousSegment[] {
    const segments: SuspiciousSegment[] = [];

    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number[]>();

    // Track word positions
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 4) {
        if (!wordFreq.has(cleanWord)) {
          wordFreq.set(cleanWord, []);
        }
        wordFreq.get(cleanWord)!.push(index);
      }
    });

    // Find words that appear close together multiple times
    wordFreq.forEach((positions, word) => {
      if (positions.length >= 3) {
        // Check for clustering
        for (let i = 1; i < positions.length; i++) {
          const distance = positions[i] - positions[i - 1];
          if (distance < 50 && distance > 5) {
            // Repeated within 50 words but not immediately adjacent
            const startPos = words.slice(0, positions[i - 1]).join(' ').length;
            const endPos = words.slice(0, positions[i] + 1).join(' ').length;

            segments.push({
              text: `Repeated word cluster: "${word}"`,
              startIndex: startPos,
              endIndex: endPos,
              reason: 'Repetitive pattern detected—common in less-varied writing',
              suspicionLevel: 'low',
            });
            break;
          }
        }
      }
    });

    return segments.slice(0, 2);
  }

  /**
   * Calculate complexity score for a sentence (length, avg word length, punctuation)
   */
  private calculateComplexity(sentence: string): number {
    const words = sentence.split(/\s+/);
    const wordLengthAvg = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const punctuationCount = (sentence.match(/[,;:—-]/g) || []).length;

    return (words.length / 10) * (wordLengthAvg / 5) + punctuationCount;
  }
}
