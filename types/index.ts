export type Verdict = 'HUMAN' | 'AI_ASSISTED' | 'AI_GENERATED';

export type KeyCategory =
  | 'alpha'
  | 'numeric'
  | 'whitespace'
  | 'punctuation'
  | 'navigation'
  | 'delete'
  | 'modifier'
  | 'special';

export type EditType = 'insert' | 'delete' | 'replace';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: number;
  user: AuthUser;
}

export interface KeystrokeEvent {
  timestamp: number;
  key: string;
  keyCategory: KeyCategory;
  intervalMs: number;
  documentLength: number;
}

export interface PasteEvent {
  timestamp: number;
  insertedText: string;
  insertedLength: number;
  documentLength: number;
}

export interface EditEvent {
  timestamp: number;
  type: EditType;
  delta: number;
  documentLength: number;
}

export interface SuspiciousSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  reason: string;
  suspicionLevel: 'low' | 'medium' | 'high';
}

export interface TextStatisticsMetrics {
  wordCount: number;
  averageWordLength: number;
  sentenceCount: number;
  sentenceLengthVariation: number;
  lexicalDiversity: number;
  lexicalRichness: number;
  linguisticIrregularities: string[];
}

export interface BehavioralMetrics {
  typingVariance: number;
  averageIntervalMs: number;
  pauseBeforeSentences: number[];
  microPausesNearPunctuation: number[];
  contextAwarePausePattern: string;
  pasteRatio: number;
  editRatio: number;
}

export interface CorrelationSnapshot {
  summary: string;
  correlationFindings: string[];
  correlationScore: number;
}

export interface AnalysisMetrics {
  typingVariance: number;
  averageIntervalMs: number;
  pasteRatio: number;
  editRatio: number;
  wordCount: number;
  textStatistics?: TextStatisticsMetrics;
  behavioral?: BehavioralMetrics;
}

export interface AuthenticityReport {
  sessionId: string;
  generatedAt: string;
  verdict: Verdict;
  confidenceScore: number;
  overallSuspicionScore: number;
  naturalnessScore: number;
  reasons: string[];
  metrics: AnalysisMetrics;
  suspiciousSegments?: SuspiciousSegment[];
  correlation?: CorrelationSnapshot;
  exportFormat?: 'json' | 'pdf' | 'html';
}

export interface WritingSession {
  _id: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerEmail: string;
  documentSnapshot: string;
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
  status: 'active' | 'completed';
  analysis: AuthenticityReport | null;
}

export interface StartSessionRequest {
  documentSnapshot?: string;
}

export interface StartSessionResponse {
  session: WritingSession;
}

export interface UpdateSessionRequest {
  sessionId: string;
  documentSnapshot: string;
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
}

export interface UpdateSessionResponse {
  session: WritingSession;
}

export interface EndSessionRequest {
  sessionId: string;
  documentSnapshot: string;
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
}

export interface EndSessionResponse {
  session: WritingSession;
}

export interface AnalysisResponse {
  report: AuthenticityReport;
}

export interface ArchivedReport {
  sessionId: string;
  userId: string;
  userEmail: string;
  generatedAt: string;
  verdict: Verdict;
  confidenceScore: number;
  overallSuspicionScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionsResponse {
  sessions: WritingSession[];
}

export interface DeleteSessionResponse {
  deletedSessionId: string;
}

export interface LiveIndicatorState {
  currentWpm: number;
  sessionDurationMs: number;
  naturalnessScore: number;
  recentPasteDetected: boolean;
  pasteCount: number;
}
