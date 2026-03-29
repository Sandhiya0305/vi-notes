# Vi-Notes — Complete Feature Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Algorithms & Analysis Engine](#algorithms--analysis-engine)
5. [Execution Workflow](#execution-workflow)
6. [Data Models](#data-models)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Privacy & Security](#privacy--security)

---

## Project Overview

**Vi-Notes** is a full-stack authenticity verification platform designed to distinguish genuine human-written content from AI-generated or AI-assisted text. The system analyzes **writing behavior** alongside **statistical and linguistic characteristics** to establish reliable authorship verification.

### Core Philosophy

Human writing naturally includes:
- Variable typing speeds
- Pauses during thinking
- Revisions during idea formation
- Irregular sentence structures
- A relationship between content complexity and editing frequency

AI-generated or pasted text often lacks these behavioral signatures. Vi-Notes captures and analyzes these characteristics to assess authorship authenticity.

---

## Architecture

### Tech Stack (MERN Architecture)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + TypeScript + Vite | User interface and real-time tracking |
| **Desktop** | Electron | Desktop-level keyboard event access |
| **Backend** | Node.js + Express.js | RESTful API and analysis engine |
| **Database** | MongoDB + Mongoose | Session and report storage |
| **Validation** | Zod | Request/response schema validation |

### Project Structure

```
vi-notes/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── Dashboard/     # Session history viewer
│   │   │   ├── Editor/        # Content-editable writing area
│   │   │   ├── LiveIndicator/ # Real-time metrics display
│   │   │   └── ReportViewer/  # Analysis report display
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useKeystrokeTracker.ts  # Keystroke capture logic
│   │   │   └── useSessionManager.ts    # Session lifecycle management
│   │   ├── styles/            # CSS stylesheets
│   │   └── types/             # TypeScript type definitions
│   └── package.json
├── electron/                  # Electron desktop wrapper
│   └── main.ts
├── server/                    # Express backend
│   ├── models/                # Mongoose schemas
│   │   ├── Session.ts         # Writing session model
│   │   └── Report.ts          # Report archive model
│   ├── routes/                # API route handlers
│   │   ├── sessions.ts        # Session CRUD operations
│   │   └── analysis.ts        # Analysis trigger endpoint
│   ├── services/              # Business logic
│   │   ├── behavioralAnalysis.ts  # Core analysis engine
│   │   ├── textStatistics.ts      # Text metrics calculator
│   │   └── correlationEngine.ts   # Cross-verification logic
│   └── index.ts               # Server entry point
├── types/                     # Shared TypeScript types
│   └── index.ts
└── package.json               # Root package configuration
```

---

## Core Features

### 1. Writing Session Monitoring

The system captures keystroke timing metadata (not raw key content) to track the writing process:

- **Keystroke Events**: Records timestamp, key category, interval between keystrokes, and document length at each keystroke
- **Paste Events**: Detects and logs clipboard insertions with character count
- **Edit Events**: Tracks insertions, deletions, and replacements with delta values
- **Session Duration**: Measures active writing time excluding idle periods (the hook sums each keystroke interval, clamped to 2 seconds, via `typingActiveMsRef` so `sessionDurationMs` represents real typing activity rather than wall-clock focus spans).

### 2. Behavioral Pattern Analysis

Analyzes writing patterns to identify human vs. AI characteristics:

- **Typing Cadence Variance**: Measures consistency of keystroke intervals
- **Pause Distribution**: Identifies thinking pauses before sentences and paragraphs
- **Revision Frequency**: Tracks corrections relative to text complexity
- **Micro-pause Detection**: Analyzes pauses around punctuation and structural boundaries

### 3. Textual Statistical Analysis

Examines the written content for linguistic patterns:

- **Word Count**: Total words in the document
- **Average Word Length**: Character count per word
- **Sentence Count**: Number of sentences detected
- **Vocabulary Diversity**: Variation in word usage

### 4. Cross-Verification Engine

Correlates keyboard behavior with text evolution:

- **Behavioral-Content Matching**: Identifies mismatches between typing patterns and content
- **Uniformity Detection**: Flags suspicious consistency in writing patterns
- **Summary Generation**: Creates human-readable verification summaries

### 5. Authenticity Reports

Generates comprehensive verification reports:

- **Verdict Classification**: HUMAN, AI_ASSISTED, or AI_GENERATED
- **Confidence Score**: Percentage confidence in the verdict
- **Suspicion Score**: Overall suspicion level (0-100)
- **Naturalness Score**: How natural the writing behavior appears
- **Reasoning**: Human-readable explanations for the verdict
- **Detailed Metrics**: Raw behavioral and textual statistics

### 6. Live Indicator Dashboard

Real-time monitoring during active writing sessions:

- **Words Per Minute (WPM)**: Calculated from alphanumeric keystrokes
- **Session Duration**: Active writing time in seconds
- **Naturalness Score**: Live assessment of writing behavior
- **Paste Count**: Number of paste operations detected
- **Visual Status Bar**: Graphical representation of naturalness score

---

## Algorithms & Analysis Engine

### Algorithm 1: Typing Variance Calculation

**Purpose**: Measures the consistency of keystroke intervals to detect machine-like typing.

**Implementation** ([`behavioralAnalysis.ts:21-30`](server/services/behavioralAnalysis.ts:21-30)):

```typescript
function getVariance(keystrokes: KeystrokeEvent[]): number {
  if (keystrokes.length < 2) return 0;
  
  const intervals = keystrokes.map((stroke) => stroke.intervalMs);
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const variance = intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length;
  return Math.sqrt(variance); // Returns standard deviation
}
```

**Interpretation**:
- **High variance (≥80ms)**: Indicates healthy human-like variation in typing speed
- **Low variance (<45ms)**: Suggests unusually uniform typing intervals (suspicious)
- **Normal range (45-80ms)**: Typical human typing patterns

**Suspicion Scoring**:
```typescript
const varianceSuspicion = clamp(typingVariance < 45 ? (45 - typingVariance) * 1.4 : 0, 0, 35);
```
- Lower variance increases suspicion score linearly
- Maximum suspicion contribution: 35 points

### Algorithm 2: Paste Ratio Analysis

**Purpose**: Detects excessive paste operations that may indicate copied content.

**Implementation** ([`behavioralAnalysis.ts:32-35`](server/services/behavioralAnalysis.ts:32-35)):

```typescript
function getPasteRatio(pastes: PasteEvent[], documentSnapshot: string): number {
  const totalPastedChars = pastes.reduce((sum, paste) => sum + paste.insertedLength, 0);
  return totalPastedChars / Math.max(documentSnapshot.length, 1);
}
```

**Interpretation**:
- **Low ratio (<0.18)**: Most text entered directly (normal)
- **Moderate ratio (0.18-0.45)**: Elevated paste activity (caution)
- **High ratio (>0.45)**: Large share arrived through paste (suspicious)

**Suspicion Scoring**:
```typescript
const pasteSuspicion = clamp(pasteRatio * 100, 0, 45);
```
- Direct linear mapping to suspicion score
- Maximum suspicion contribution: 45 points

### Algorithm 3: Edit Ratio Analysis

**Purpose**: Measures revision frequency to detect lack of human editing patterns.

**Implementation** ([`behavioralAnalysis.ts:37-40`](server/services/behavioralAnalysis.ts:37-40)):

```typescript
function getEditRatio(edits: EditEvent[], keystrokes: KeystrokeEvent[]): number {
  const totalEditDelta = edits.reduce((sum, edit) => sum + Math.abs(edit.delta), 0);
  return totalEditDelta / Math.max(keystrokes.length, 1);
}
```

**Interpretation**:
- **Low ratio (<0.04)**: Very few corrections (suspicious for longer texts)
- **Moderate ratio (0.04-0.12)**: Normal editing activity
- **High ratio (>0.12)**: Iterative human editing (positive indicator)

**Suspicion Scoring**:
```typescript
const editSuspicion = clamp(editRatio < 0.04 ? (0.04 - editRatio) * 700 : 0, 0, 20);
```
- Only penalizes low edit ratios
- Maximum suspicion contribution: 20 points

### Algorithm 4: Overall Suspicion Score

**Purpose**: Combines individual suspicion signals into a single score.

**Implementation** ([`behavioralAnalysis.ts:57-58`](server/services/behavioralAnalysis.ts:57-58)):

```typescript
const overallSuspicionScore = round(clamp(varianceSuspicion + pasteSuspicion + editSuspicion, 0, 100));
const naturalnessScore = round(clamp(100 - overallSuspicionScore, 0, 100));
```

**Score Composition**:
| Component | Max Contribution | Weight |
|-----------|-----------------|--------|
| Typing Variance | 35 points | 35% |
| Paste Ratio | 45 points | 45% |
| Edit Ratio | 20 points | 20% |
| **Total** | **100 points** | **100%** |

### Algorithm 5: Verdict Classification

**Purpose**: Maps suspicion scores to authorship verdicts.

**Implementation** ([`behavioralAnalysis.ts:86-98`](server/services/behavioralAnalysis.ts:86-98)):

```typescript
let verdict: Verdict = 'HUMAN';
let confidenceScore = 82;

if (overallSuspicionScore >= 70) {
  verdict = 'AI_GENERATED';
  confidenceScore = round(clamp(65 + (overallSuspicionScore - 70) * 1.1, 65, 98));
} else if (overallSuspicionScore >= 38) {
  verdict = 'AI_ASSISTED';
  confidenceScore = round(clamp(58 + (overallSuspicionScore - 38) * 0.9, 58, 88));
} else {
  verdict = 'HUMAN';
  confidenceScore = round(clamp(78 + (30 - overallSuspicionScore) * 0.4, 70, 96));
}
```

**Classification Thresholds**:

| Suspicion Score | Verdict | Confidence Range |
|----------------|---------|------------------|
| 0-37 | HUMAN | 70-96% |
| 38-69 | AI_ASSISTED | 58-88% |
| 70-100 | AI_GENERATED | 65-98% |

### Algorithm 5.1: Large Paste Heuristic

**Purpose**: Treats unusually large paste operations as high-fidelity suspicion signals that can immediately elevate the overall score.

**Implementation** ([`behavioralAnalysis.ts:11-180`](server/services/behavioralAnalysis.ts:11-180)):

```typescript
const totalPastedWords = session.pastes.reduce((sum, paste) => sum + countWords(paste.insertedText), 0);
const hasLongPasteEvent = session.pastes.some((paste) => countWords(paste.insertedText) >= 10);

let overallSuspicionScore = round(clamp(baseSuspicion, 0, 100));
if (hasLongPasteEvent) {
  overallSuspicionScore = Math.max(overallSuspicionScore, 70);
}
if (wordCount > 0 && totalPastedWords / wordCount > 0.5) {
  overallSuspicionScore = Math.max(overallSuspicionScore, 85);
}
```

**Formulas**:
- **Long paste trigger**: `countWords(paste.insertedText) >= 10` pushes the score into the higher bands regardless of other signals.
- **Paste coverage**: `totalPastedWords / wordCount > 0.5` forces the score to at least 85 and triggers a distinct explanation line.

**Reasoning**: When these heuristics activate the report appends reasons such as "Suspiciously large paste chunks (10+ words) were inserted at once."

### Algorithm 6: Live Naturalness Score

**Purpose**: Real-time assessment of writing behavior during active sessions.

**Implementation** ([`LiveIndicator.tsx:38-50`](client/src/components/LiveIndicator/LiveIndicator.tsx:38-50)):

```typescript
let naturalnessScore = 82; // Base score

// Penalize very fast typing
if (averageInterval > 0 && averageInterval < 70) {
  naturalnessScore -= 14;
}

// Penalize very slow typing
if (averageInterval > 900) {
  naturalnessScore -= 8;
}

// Penalize paste-heavy sessions
naturalnessScore -= Math.min(pasteRatio * 100, 35);

// Penalize lack of edits in longer texts
if (editDensity < 0.03 && alphaCount > 40) {
  naturalnessScore -= 12;
} else if (editDensity > 0.09) {
  naturalnessScore += 6; // Reward active editing
}
```

**Adjustment Factors**:
| Condition | Adjustment | Reasoning |
|-----------|-----------|-----------|
| Fast typing (<70ms avg) | -14 | Machine-like speed |
| Slow typing (>900ms avg) | -8 | Unusual pauses |
| High paste ratio | -35 max | External content |
| Low edit density | -12 | No revisions |
| High edit density | +6 | Active human editing |

### Algorithm 7: Words Per Minute (WPM)

**Purpose**: Calculates typing speed from keystroke data.

**Implementation** ([`LiveIndicator.tsx:23-27`](client/src/components/LiveIndicator/LiveIndicator.tsx:23-27)):

```typescript
const alphaCount = keystrokes.filter(
  (stroke) => stroke.keyCategory === 'alpha' || stroke.keyCategory === 'numeric'
).length;
const minutes = sessionDurationMs / 60000;
const currentWpm = minutes > 0 ? Math.round((alphaCount / 5) / minutes) : 0;
```

**Formula**: `WPM = (alphanumeric keystrokes / 5) / minutes`
- Standard word definition: 5 characters = 1 word
- Only counts alphanumeric and numeric keystrokes

### Algorithm 8: Key Categorization

**Purpose**: Classifies keystrokes for behavioral analysis.

**Implementation** ([`useKeystrokeTracker.ts:33-57`](client/src/hooks/useKeystrokeTracker.ts:33-57)):

```typescript
function getKeyCategory(key: string): KeyCategory {
  if (/^[a-z]$/i.test(key)) return 'alpha';
  if (/^[0-9]$/.test(key)) return 'numeric';
  if (key === ' ' || key === 'Tab') return 'whitespace';
  if (['Backspace', 'Delete'].includes(key)) return 'delete';
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return 'navigation';
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) return 'modifier';
  if (/^[.,!?;:'"()[\]{}-]$/.test(key)) return 'punctuation';
  return 'special';
}
```

**Categories**:
- `alpha`: Letters a-z (case insensitive)
- `numeric`: Digits 0-9
- `whitespace`: Space and Tab
- `delete`: Backspace and Delete
- `navigation`: Arrow keys, Home, End
- `modifier`: Shift, Control, Alt, Meta
- `punctuation`: Common punctuation marks
- `special`: All other keys

---

## Execution Workflow

### Complete Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. FOCUS EDITOR
   │
   ├─► handleFocus() triggered
   │   ├─► Start session timer
   │   ├─► Resume from pause (if returning)
   │   └─► Set isTracking = true
   │
   ├─► startSession() API call
   │   └─► POST /api/sessions/start
   │       └─► Create new session in MongoDB
   │           └─► Return session._id
   │
   └─► Active session established

2. TYPING/EDITING
   │
   ├─► handleKeyDown() for each keystroke
   │   ├─► Record timestamp
   │   ├─► Calculate interval since last keystroke
   │   ├─► Categorize key type
   │   └─► Append to keystrokes array
   │
   ├─► handleInput() for content changes
   │   ├─► Detect edit type (insert/delete/replace)
   │   ├─► Calculate delta (character change count)
   │   └─► Append to edits array
   │
   ├─► handlePaste() for clipboard operations
   │   ├─► Extract pasted text
   │   ├─► Record insertion length
   │   └─► Append to pastes array
   │
   └─► Periodic sync (every 900ms)
       └─► POST /api/sessions/update
           └─► Send delta payload to server
               └─► Append to session in MongoDB

3. BLUR EDITOR (Session End)
   │
   ├─► handleBlur() triggered
   │   ├─► Record pause start time
   │   └─► Set isTracking = false
   │
   ├─► endSession() API call
   │   └─► POST /api/sessions/end
   │       ├─► Final update to session
   │       ├─► Set status = 'completed'
   │       └─► Save to MongoDB
   │
   ├─► analyzeSession() API call
   │   └─► POST /api/analysis/:sessionId
   │       ├─► Load session from MongoDB
   │       ├─► Run behavioral analysis
   │       ├─► Generate authenticity report
   │       ├─► Store report on session
   │       └─► Return report
   │
   └─► refreshSessions() API call
       └─► GET /api/sessions
           └─► Update dashboard with new session

4. VIEW RESULTS
   │
   ├─► Dashboard displays session card
   │   ├─► Verdict badge (HUMAN/AI_ASSISTED/AI_GENERATED)
   │   ├─► Content preview
   │   ├─► Word count
   │   ├─► Duration
   │   └─► Timestamp
   │
   └─► ReportViewer displays detailed analysis
       ├─► Verdict and confidence score
       ├─► Naturalness score
       ├─► Suspicion score
       ├─► Detailed metrics
       └─► Reasoning explanations
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT (React)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   Editor     │───►│ useKeystroke     │───►│ LiveIndicator│  │
│  │ (contentEdit)│    │ Tracker          │    │ (real-time)  │  │
│  └──────────────┘    └──────────────────┘    └──────────────┘  │
│         │                    │                        │         │
│         │                    │                        │         │
│         ▼                    ▼                        ▼         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              useSessionManager                            │  │
│  │  • startSession()    • syncSession()    • endSession()   │  │
│  │  • analyzeSession()  • refreshSessions() • deleteSession()│  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ HTTP/REST API
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                      SERVER (Express)                            │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │                    Routes                                 │  │
│  │  • POST /api/sessions/start                               │  │
│  │  • POST /api/sessions/update                              │  │
│  │  • POST /api/sessions/end                                 │  │
│  │  • GET  /api/sessions                                     │  │
│  │  • GET  /api/sessions/:id                                 │  │
│  │  • DELETE /api/sessions/:id                               │  │
│  │  • POST /api/analysis/:sessionId                          │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │                  Services                                 │  │
│  │  • behavioralAnalysis.ts  (Core analysis engine)          │  │
│  │  • textStatistics.ts      (Text metrics)                  │  │
│  │  • correlationEngine.ts   (Cross-verification)            │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐  │
│  │                   Models                                  │  │
│  │  • Session (Mongoose schema)                              │  │
│  │  • Report  (Mongoose schema)                              │  │
│  └───────────────────────────┬──────────────────────────────┘  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ Mongoose ODM
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      DATABASE (MongoDB)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │   Sessions      │              │  ReportArchive  │          │
│  │   Collection    │              │   Collection    │          │
│  └─────────────────┘              └─────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Session State Machine

```
                    ┌─────────────┐
                    │   IDLE      │
                    │  (No session)│
                    └──────┬──────┘
                           │
                           │ User focuses editor
                           ▼
                    ┌─────────────┐
                    │   ACTIVE    │◄─────────────────┐
                    │  (Tracking) │                  │
                    └──────┬──────┘                  │
                           │                         │
                           │ User blurs editor       │ User refocuses
                           ▼                         │
                    ┌─────────────┐                  │
                    │  COMPLETED  │                  │
                    │  (Analyzed) │                  │
                    └──────┬──────┘                  │
                           │                         │
                           │ Report generated        │
                           ▼                         │
                    ┌─────────────┐                  │
                    │   STORED    │──────────────────┘
                    │  (In DB)    │
                    └─────────────┘
```

---

## Data Models

### WritingSession Model

```typescript
interface WritingSession {
  _id: string;                    // MongoDB ObjectId
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  documentSnapshot: string;       // Final text content
  keystrokes: KeystrokeEvent[];   // Array of keystroke events
  pastes: PasteEvent[];           // Array of paste events
  edits: EditEvent[];             // Array of edit events
  sessionDurationMs: number;      // Active writing duration
  status: 'active' | 'completed'; // Session status
  analysis: AuthenticityReport | null; // Generated report
}
```

### KeystrokeEvent Model

```typescript
interface KeystrokeEvent {
  timestamp: number;      // Unix timestamp (ms)
  key: string;            // Key pressed (not stored for privacy)
  keyCategory: KeyCategory; // Classified key type
  intervalMs: number;     // Time since last keystroke
  documentLength: number; // Document length at this point
}
```

### PasteEvent Model

```typescript
interface PasteEvent {
  timestamp: number;      // Unix timestamp (ms)
  insertedText: string;   // Pasted content
  insertedLength: number; // Character count
  documentLength: number; // Document length after paste
}
```

### EditEvent Model

```typescript
interface EditEvent {
  timestamp: number;      // Unix timestamp (ms)
  type: EditType;         // 'insert' | 'delete' | 'replace'
  delta: number;          // Character change count
  documentLength: number; // Document length after edit
}
```

### AuthenticityReport Model

```typescript
interface AuthenticityReport {
  sessionId: string;              // Associated session ID
  generatedAt: string;            // ISO timestamp
  verdict: Verdict;               // 'HUMAN' | 'AI_ASSISTED' | 'AI_GENERATED'
  confidenceScore: number;        // 0-100 confidence percentage
  overallSuspicionScore: number;  // 0-100 suspicion level
  naturalnessScore: number;       // 0-100 naturalness level
  reasons: string[];              // Human-readable explanations
  metrics: AnalysisMetrics;       // Detailed statistics
}
```

### AnalysisMetrics Model

```typescript
interface AnalysisMetrics {
  typingVariance: number;    // Standard deviation of intervals
  averageIntervalMs: number; // Mean keystroke interval
  pasteRatio: number;        // Pasted chars / total chars
  editRatio: number;         // Edit delta / keystroke count
  wordCount: number;         // Total words in document
}
```

---

## API Endpoints

### Session Management

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `POST` | `/api/sessions/start` | Create new session | `{ documentSnapshot?: string }` |
| `POST` | `/api/sessions/update` | Update active session | `{ sessionId, documentSnapshot, keystrokes, pastes, edits, sessionDurationMs }` |
| `POST` | `/api/sessions/end` | Finalize session | Same as update |
| `GET` | `/api/sessions` | List all sessions | - |
| `GET` | `/api/sessions/:id` | Get single session | - |
| `DELETE` | `/api/sessions/:id` | Delete session | - |

### Analysis

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `POST` | `/api/analysis/:sessionId` | Generate report | - |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health status |

---

## Frontend Components

### Editor Component

**File**: [`client/src/components/Editor/Editor.tsx`](client/src/components/Editor/Editor.tsx)

**Purpose**: Content-editable writing area with behavior tracking

**Features**:
- Content-editable div with placeholder text
- Session status indicator (live/idle)
- Event handlers for focus, blur, keydown, paste, and input
- Synchronized content state

**Event Flow**:
```
User Input → handleInput() → onContentChange() → App.tsx
     ↓
handleKeyDown() → useKeystrokeTracker
     ↓
handlePaste() → useKeystrokeTracker
```

### LiveIndicator Component

**File**: [`client/src/components/LiveIndicator/LiveIndicator.tsx`](client/src/components/LiveIndicator/LiveIndicator.tsx)

**Purpose**: Real-time writing behavior metrics display

**Metrics Displayed**:
- **WPM**: Words per minute from alphanumeric keystrokes
- **Duration**: Active session time in seconds
- **Naturalness**: Live behavior assessment score
- **Pastes**: Number of paste operations

**Visual Elements**:
- Metric cards with labels and values
- Status bar showing naturalness score
- Alert message for recent paste detection

### Dashboard Component

**File**: [`client/src/components/Dashboard/Dashboard.tsx`](client/src/components/Dashboard/Dashboard.tsx)

**Purpose**: Session history viewer and manager

**Features**:
- List of all saved sessions
- Session cards with:
  - Verdict badge (HUMAN/AI_ASSISTED/AI_GENERATED/PENDING)
  - Content preview (first 120 characters)
  - Word count
  - Duration
  - Timestamp
- Select session to view details
- Delete session functionality
- Refresh button

### ReportViewer Component

**File**: [`client/src/components/ReportViewer/ReportViewer.tsx`](client/src/components/ReportViewer/ReportViewer.tsx)

**Purpose**: Display detailed authenticity analysis reports

**Information Displayed**:
- Verdict classification
- Confidence score
- Naturalness score
- Suspicion score
- Detailed metrics
- Reasoning explanations

### ErrorBoundary Component

**File**: [`client/src/components/ErrorBoundary/ErrorBoundary.tsx`](client/src/components/ErrorBoundary/ErrorBoundary.tsx)

**Purpose**: Prevents silent blank-screen failures

**Features**:
- Catches React component errors
- Displays fallback UI
- Prevents application crash

---

## Privacy & Security

### Data Collection Principles

1. **No Raw Keystroke Content**: Only timing and metadata are stored
2. **Metadata Only**: Keystroke intervals, categories, and counts
3. **Encrypted Storage**: MongoDB with encryption at rest
4. **User Control**: Sessions only tracked when editor is focused
5. **Limited Scope**: Monitoring restricted to active writing sessions

### Privacy-Preserving Design

- **Keystroke Events**: Store `keyCategory` instead of actual key pressed
- **Paste Events**: Store `insertedLength` instead of full pasted text
- **Session Data**: User can delete any session at any time
- **No External Sharing**: Data stays within the application

### Security Measures

- **Input Validation**: Zod schema validation on all API endpoints
- **Error Handling**: Graceful error handling without exposing internals
- **CORS Configuration**: Restricted to allowed origins
- **Rate Limiting**: (Recommended for production)

---

## Current Limitations & Future Enhancements

### Current Limitations

1. **Heuristic Analysis**: Rule-based, not machine learning
2. **Single Language**: English text only
3. **Basic Text Statistics**: Limited linguistic analysis
4. **No User Authentication**: Single-user application
5. **Local Storage Only**: No cloud sync

### Planned Enhancements

1. **Machine Learning Integration**:
   - TensorFlow/PyTorch models for classification
   - Supervised learning on human vs. AI text
   - Unsupervised anomaly detection

2. **Advanced NLP**:
   - Vocabulary diversity metrics
   - Stylistic consistency analysis
   - Linguistic irregularity detection

3. **Multi-User Support**:
   - User authentication
   - Personal dashboards
   - Shared verification reports

4. **Enhanced Analytics**:
   - Pause distribution analysis
   - Sentence-boundary detection
   - Paragraph structure analysis

5. **Export & Sharing**:
   - PDF report generation
   - Shareable verification links
   - API for third-party integration

---

## Testing & Validation

### Recommended Manual Tests
1. **Single large paste**: Run `npm run dev:site`, focus the editor, paste a 300+ word paragraph, then blur. Inspect the backend logs for the new reasons and confirm the verdict transitions to `AI_GENERATED`.
2. **Balanced typing + paste**: Compose manually for at least 60 seconds, then paste <=5 words; expect `HUMAN` or `AI_ASSISTED` depending on the ratio, verifying the edit ratio reward and paste penalty.
3. **High edit frequency**: Type, delete, and replace frequently to raise the edit ratio above 0.12, ensuring the confidence tilts toward human despite low variance.
4. **Paste-heavy but short**: Paste only around 20 words while leaving keystrokes minimal to observe the long-paste and coverage heuristics kicking the suspicion into the high band.

### Automated Checks
- `npm run dev:site` (launches backend + frontend with automatic browser open)
- `npm run test -w server` (runs server Jest suites where available)
- `npm run test -w client` (executes frontend tests, if added)
- `npm run build` (validates both workspaces compile)

### Document Validation Tips
- Use MongoDB Compass or `mongosh` to inspect `sessions` documents and confirm `analysis.reasons`, `metrics`, and `suspiciousSegments` match the generated report.
- Use `curl -X POST http://localhost:3001/api/analysis/<sessionId>` after ending a session to ensure the API returns the JSON report directly and contains the new `paste` reasons.
- Restart `npm run dev:site` whenever backend code changes to `behavioralAnalysis.ts` to ensure the scoring logic rebuilds before running manual tests.

## Summary

Vi-Notes is a comprehensive authenticity verification platform that combines behavioral analysis with textual statistics to distinguish human-written content from AI-generated text. The system captures writing patterns through keystroke timing, paste detection, and edit tracking, then applies rule-based algorithms to generate confidence scores and verdicts.

The architecture follows MERN best practices with clear separation of concerns, type-safe development with TypeScript, and a privacy-first approach to data collection. The current implementation provides a solid foundation for future machine learning enhancements and multi-user capabilities.
