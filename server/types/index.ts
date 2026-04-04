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

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface AuthSessionResponse {
  token: string;
  expiresAt: number;
  user: AuthUser;
}

export interface RegisterInitiationResponse {
  verificationRequired: true;
  verificationToken: string;
  expiresAt: number;
  message: string;
}

export interface VerifyRegistrationRequest {
  verificationToken: string;
  otpCode: string;
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
  type: 'insert' | 'delete' | 'replace';
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

interface AnalysisMetrics {
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
  correlationFindings?: string[];
  exportFormat?: 'json' | 'pdf' | 'html';
}

export interface WritingSession {
  _id: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
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

export interface EndSessionRequest {
  sessionId: string;
  documentSnapshot: string;
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
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