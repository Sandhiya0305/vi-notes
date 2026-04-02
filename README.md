# Vi-Notes

> AI Authorship Verification Platform — Detect whether writing is human-authored, AI-assisted, or AI-generated through behavioral keystroke analysis and text statistics.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Analysis Engine](#analysis-engine)
- [UI / Design System](#ui--design-system)
- [Security](#security)
- [License](#license)

---

## Overview

Vi-Notes is a writing analytics platform that tracks how users write — not just what they write. By capturing keystroke timing, paste events, edit patterns, and text statistics in real-time, it builds a behavioral fingerprint that distinguishes genuine human writing from AI-generated or AI-assisted content.

The platform serves two roles:

- **Writers** use the editor to compose text while behavioral data is silently captured. After clicking "Analyze Writing", they receive a detailed report with a verdict (HUMAN / AI_ASSISTED / AI_GENERATED), confidence score, and reasons.
- **Admins** view all sessions across users in a table, browse reports grouped by user, and drill down into detailed analysis for any session.

---

## Features

### Writing & Tracking

- **Real-time keystroke capture** — key, key category (alpha/numeric/punctuation/etc.), interval between keystrokes, document length at time of press
- **Paste detection** — tracks when content is pasted, the inserted length, and flags large paste events
- **Edit tracking** — records insertions, deletions, and replacements with delta counts
- **Session duration** — measures total active writing time (focus/blur aware)
- **Delta sync** — only new events are sent to the server every 900ms, minimizing bandwidth

### Analysis

- **Behavioral analysis** — keystroke interval variance, average typing speed, pause patterns around punctuation, context-aware cadence classification
- **Text statistics** — word count, average word length, sentence count, sentence length variation, lexical diversity (TTR), lexical richness (hapax legomena ratio)
- **Correlation engine** — cross-verifies behavioral signals against text complexity to detect mismatches (e.g., fast typing with complex vocabulary)
- **Suspicious segment detection** — flags templated AI phrases, tone shifts between sentences, suspiciously perfect sentences, overconfident language, and repetitive word patterns
- **Three-tier verdict** — HUMAN / AI_ASSISTED / AI_GENERATED with confidence percentages

### Reporting

- **Analysis reports** — scores for clarity, confidence, naturalness, and suspicion with detailed reasons
- **Session history** — browse all past sessions with verdicts, word counts, WPM, and timestamps
- **Export** — download reports as JSON, HTML, or plain text
- **Shareable tokens** — generate base64-encoded report summaries

### User Management

- **JWT authentication** — login/register with email + password
- **Role-based access** — admin and writer roles with route-level guards
- **Password security** — PBKDF2 hashing with 120,000 iterations and constant-time comparison
- **Seed users** — auto-created on first startup (configurable via env vars)

### Admin Dashboard

- **All Sessions table** — sortable view of every session with user email, content preview, WPM, duration, scores, and verdict badges
- **User Reports** — sessions grouped by user email in collapsible accordion sections with counts (total, human, flagged)
- **Session drill-down** — full detailed report with key metrics, analysis scores, text statistics, behavioral metrics, verdict, reasons, suspicious segments, and session statistics

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 4 | Build tool and dev server |
| Tailwind CSS 3 | Utility-first styling |
| shadcn/ui | Pre-built accessible components (Radix UI primitives) |
| Lucide React | Icon library |
| class-variance-authority | Component variant management |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express 4 | HTTP server |
| TypeScript 5 | Type safety |
| MongoDB | Database |
| Mongoose 7 | ODM |
| Zod | Request validation |
| Custom JWT | HS256 token signing/verification |
| Custom PBKDF2 | Password hashing |

### Desktop (Planned)

| Technology | Purpose |
|---|---|
| Electron | Desktop wrapper (workspace configured, not yet implemented) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│                                                              │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│  │  Editor   │  │  Keystroke  │  │     useSessionManager  │  │
│  │ (content- │→ │  Tracker    │→ │   (delta sync → API)   │  │
│  │ editable) │  │  (hook)     │  │                        │  │
│  └──────────┘  └─────────────┘  └───────────┬────────────┘  │
│                                              │               │
│  ┌───────────────────────────────────────────┤               │
│  │  Views: Write │ Sessions │ Session Detail │               │
│  │  (UserWorkspace + SessionDetailView)      │               │
│  │  Admin: All Sessions │ User Reports       │               │
│  │  (AdminWorkspace + AdminReportDetail)     │               │
│  └───────────────────────────────────────────┤               │
└──────────────────────────────────────────────┼───────────────┘
                                               │ HTTP/JSON
┌──────────────────────────────────────────────┼───────────────┐
│                        SERVER (Express)                      │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Auth Routes  │  │Session Routes│  │ Analysis Routes     │ │
│  │ /api/auth/*  │  │/api/sessions/*│ │ /api/analysis/:id   │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                      │            │
│  ┌──────┴────────────────┴──────────────────────┴──────────┐ │
│  │                    SERVICES LAYER                        │ │
│  │  ┌───────────────────┐  ┌────────────────────────────┐  │ │
│  │  │ BehavioralAnalysis│  │ TextStatistics             │  │ │
│  │  │ (variance, paste  │  │ (lexical diversity,        │  │ │
│  │  │  ratio, edit ratio│  │  sentence variation)       │  │ │
│  │  │  pause patterns)  │  │                            │  │ │
│  │  └────────┬──────────┘  └──────────┬─────────────────┘  │ │
│  │  ┌────────┴─────────────────────────┴─────────────────┐ │ │
│  │  │  CorrelationEngine (behavioral ↔ text alignment)   │ │ │
│  │  └──────────────────────┬────────────────────────────┘ │ │
│  │  ┌──────────────────────┴────────────────────────────┐ │ │
│  │  │  SuspiciousSegmentDetector (phrases, tone, etc.)  │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Models: User │ Session │ ReportArchive                 │ │
│  │  (Mongoose schemas → MongoDB)                           │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User types in Editor
  → keystrokeTracker captures key + interval + timestamp
  → 900ms debounce fires syncSession() with delta payload
  → Server appends events to Session document in MongoDB

User clicks "Analyze Writing"
  → syncSession() final sync
  → endSession() sets status='completed'
  → analyzeSession() runs the analysis pipeline:
      1. Behavioral analysis (variance, paste ratio, edit ratio, pauses)
      2. Text statistics (word count, lexical diversity, sentence variation)
      3. Correlation engine (behavioral ↔ text alignment)
      4. Suspicious segment detection (AI phrases, tone shifts, etc.)
      5. Scoring + verdict assignment
      6. Report saved to session.analysis + ReportArchive collection
  → Report displayed on Write page
```

---

## Project Structure

```
vi-notes/
├── package.json                     # Root workspace config (npm workspaces)
├── .env.example                     # Environment variable template
├── scripts/
│   └── dev-open.js                  # Starts server + client, opens browser
├── types/
│   └── index.ts                     # Shared TypeScript interfaces (client + server)
├── client/                          # React frontend
│   ├── package.json
│   ├── vite.config.ts               # Vite config with @ → ./src alias
│   ├── tsconfig.json                # TS paths: @/* → src/*, @shared/* → ../../types/*
│   ├── tailwind.config.ts           # Tailwind + shadcn color tokens
│   ├── postcss.config.js
│   ├── components.json              # shadcn/ui configuration
│   ├── index.html                   # SPA entry
│   └── src/
│       ├── main.tsx                 # React root: ThemeProvider → AuthProvider → ErrorBoundary → App
│       ├── App.tsx                  # Root router: Auth → UserWorkspace | AdminWorkspace
│       ├── config/api.ts            # API_BASE constant
│       ├── context/
│       │   ├── AuthContext.tsx       # Auth state, login/register/logout, localStorage
│       │   └── ThemeContext.tsx      # Light/dark toggle, system preference detection
│       ├── hooks/
│       │   ├── useKeystrokeTracker.ts  # Captures keystrokes, pastes, edits, timing
│       │   └── useSessionManager.ts    # Session CRUD, delta sync, analysis trigger
│       ├── lib/utils.ts             # cn() helper (clsx + tailwind-merge)
│       ├── styles/app.css           # Tailwind directives + CSS variable theme
│       ├── types/index.ts           # Re-exports from ../../types
│       └── components/
│           ├── Auth/AuthPage.tsx           # Login/register form
│           ├── Editor/Editor.tsx           # ContentEditable writing surface
│           ├── UserWorkspace/UserWorkspace.tsx  # Write, Sessions list, Session detail
│           ├── Admin/AdminWorkspace.tsx         # All Sessions table, User Reports
│           ├── Admin/AdminReportDetail.tsx      # Detailed single-session report
│           ├── Layout/AppLayout.tsx        # Sidebar + main content wrapper
│           ├── Layout/Sidebar.tsx          # Notion-style sidebar navigation
│           ├── ErrorBoundary/ErrorBoundary.tsx   # React error boundary
│           └── ui/                          # shadcn/ui components
│               ├── button.tsx
│               ├── input.tsx
│               ├── card.tsx
│               ├── badge.tsx
│               ├── scroll-area.tsx
│               ├── separator.tsx
│               ├── avatar.tsx
│               └── collapsible.tsx
├── server/                          # Express backend
│   ├── index.ts                     # Entry point: routes, MongoDB connect, seed users
│   ├── package.json
│   ├── tsconfig.json
│   ├── middleware/
│   │   └── auth.ts                  # JWT auth guard + role-based access
│   ├── models/
│   │   ├── User.ts                  # Mongoose User schema
│   │   ├── Session.ts               # Mongoose Session schema (events + analysis)
│   │   └── Report.ts                # Mongoose ReportArchive schema
│   ├── routes/
│   │   ├── auth.ts                  # POST /api/auth/login, /api/auth/register
│   │   ├── sessions.ts              # Session CRUD, export, share tokens
│   │   ├── analysis.ts              # POST /api/analysis/:sessionId
│   │   └── reports.ts               # GET /api/reports (admin only)
│   ├── services/
│   │   ├── behavioralAnalysis.ts    # Core analysis engine
│   │   ├── textStatistics.ts        # Text metrics computation
│   │   ├── correlationEngine.ts     # Behavioral ↔ text cross-verification
│   │   ├── suspiciousSegmentDetector.ts  # AI phrase/tone/perfect-sentence detection
│   │   ├── reportExporter.ts        # Export as JSON/HTML/text + shareable tokens
│   │   └── userSetup.ts             # Seed admin + writer users
│   └── utils/
│       ├── passwordHash.ts          # PBKDF2 hashing with constant-time comparison
│       └── jwt.ts                   # Custom HS256 JWT sign/verify
└── FILE_REFERENCE.md                # Component reference and change guide
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **MongoDB** (local instance or MongoDB Atlas)
- **npm** (workspace support)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd vi-notes

# Install all dependencies (root, server, client)
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
```

### Development

```bash
# Start both server and client (opens browser automatically)
npm run dev

# Or start individually
npm run dev:server   # Express on port 3001
npm run dev:client   # Vite on port 5173
```

### Production Build

```bash
npm run build        # Builds both server and client
npm start            # Starts production server
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/vi-notes` | MongoDB connection string |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | `vi-notes-secret` | HMAC secret for JWT signing |
| `JWT_EXPIRATION_SECONDS` | `14400` | Token TTL in seconds (default 4 hours) |
| `SEED_ADMIN_EMAIL` | `admin@vi-notes.local` | Admin seed account email |
| `SEED_ADMIN_PASSWORD` | `AdminPass!2026` | Admin seed account password |
| `SEED_USER_EMAIL` | `writer@vi-notes.local` | Writer seed account email |
| `SEED_USER_PASSWORD` | `WriterPass!2026` | Writer seed account password |
| `VITE_API_URL` | `http://localhost:3001/api` | Client API base URL |

---

## Available Scripts

### Root

| Script | Description |
|---|---|
| `npm run dev` | Start server + client, open browser |
| `npm run dev:server` | Start only the server |
| `npm run dev:client` | Start only the client |
| `npm run build` | Build server and client for production |
| `npm start` | Start production server |
| `npm test` | Run all tests |

### Client

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

### Server

| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev (auto-reload) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled production server |
| `npm test` | Run Jest tests |

---

## How It Works

### Session Lifecycle

1. **Start** — User focuses the editor and types the first character. The client calls `POST /api/sessions/start` and receives a session ID.

2. **Sync** — Every 900ms while the user is typing, the client sends a delta payload (only new keystrokes, pastes, and edits since the last sync) via `POST /api/sessions/update`.

3. **Analyze** — User clicks "Analyze Writing". The client sends a final sync, then calls `POST /api/sessions/end` which sets the session status to `completed` and triggers the analysis pipeline.

4. **Report** — The analysis pipeline runs (behavioral analysis → text statistics → correlation → suspicious segments → scoring → verdict). The report is stored on the session and returned to the client.

### Verdict Scoring

| Score Range | Verdict | Description |
|---|---|---|
| >= 70 | `AI_GENERATED` | High suspicion — likely fully AI-generated |
| >= 38 | `AI_ASSISTED` | Moderate suspicion — some AI involvement |
| < 38 | `HUMAN` | Low suspicion — likely human-authored |

### Suspicion Signals

| Signal | Max Points | Trigger |
|---|---|---|
| Keystroke variance | 35 | Variance < 45ms indicates robotic typing |
| Paste ratio | 45 | High ratio of pasted content |
| Edit ratio | 20 | Very few edits relative to keystrokes |
| Pause patterns | 15 | Inconsistent or unnatural pauses |
| Text complexity | ~24 | Mismatch between typing speed and vocabulary |
| Large paste events | automatic | 10+ words pasted at once → score >= 70 |
| Heavy paste | automatic | >65% pasted content → score >= 78 |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account (email + password) |
| POST | `/api/auth/login` | No | Sign in, returns JWT token |

### Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/sessions/start` | Yes | Start a new writing session |
| POST | `/api/sessions/update` | Yes | Sync delta events to active session |
| POST | `/api/sessions/end` | Yes | End session + trigger analysis |
| GET | `/api/sessions` | Yes | List sessions (admin: all, user: own) |
| GET | `/api/sessions/:id` | Yes | Get single session |
| DELETE | `/api/sessions/:id` | Yes | Delete session |
| GET | `/api/sessions/:id/export/:format` | Yes | Export report (json/html/text) |
| GET | `/api/sessions/:id/share-token` | Yes | Generate shareable token |

### Analysis

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/analysis/:sessionId` | Yes | Run analysis on a session |

### Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reports` | Admin | List all archived reports |

---

## Data Models

### User

```typescript
{
  email: string;          // unique, lowercase, trimmed
  passwordHash: string;   // PBKDF2 hash
  passwordSalt: string;   // 16-byte random salt
  role: 'admin' | 'user';
}
```

### Session

```typescript
{
  _id: string;
  ownerId: string;
  ownerEmail: string;
  documentSnapshot: string;          // final text content
  keystrokes: KeystrokeEvent[];     // each key press with timing
  pastes: PasteEvent[];             // paste events with content length
  edits: EditEvent[];               // insert/delete/replace events
  sessionDurationMs: number;        // total active writing time
  status: 'active' | 'completed';
  analysis: AuthenticityReport | null;
  createdAt: string;
  updatedAt: string;
}
```

### AuthenticityReport

```typescript
{
  sessionId: string;
  generatedAt: string;
  verdict: 'HUMAN' | 'AI_ASSISTED' | 'AI_GENERATED';
  confidenceScore: number;           // 0-100
  overallSuspicionScore: number;     // 0-100
  naturalnessScore: number;          // 0-100
  reasons: string[];                 // human-readable explanations
  metrics: {
    typingVariance: number;
    averageIntervalMs: number;
    pasteRatio: number;              // 0-1
    editRatio: number;               // 0-1
    wordCount: number;
    textStatistics?: TextStatisticsMetrics;
    behavioral?: BehavioralMetrics;
  };
  suspiciousSegments?: SuspiciousSegment[];
  correlationFindings?: string[];
}
```

### KeystrokeEvent

```typescript
{
  timestamp: number;                 // Date.now()
  key: string;                       // the key pressed
  keyCategory: 'alpha' | 'numeric' | 'whitespace' | 'punctuation'
             | 'navigation' | 'delete' | 'modifier' | 'special';
  intervalMs: number;                // time since last keystroke
  documentLength: number;            // doc length at time of press
}
```

### PasteEvent

```typescript
{
  timestamp: number;
  insertedText: string;
  insertedLength: number;
  documentLength: number;
}
```

### EditEvent

```typescript
{
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  delta: number;                     // character count change
  documentLength: number;
}
```

---

## Analysis Engine

The analysis pipeline runs five stages sequentially:

### 1. Behavioral Analysis (`behavioralAnalysis.ts`)

- **Keystroke variance** — Standard deviation of intervals between keystrokes. Low variance (< 45ms) suggests automated typing.
- **Average interval** — Mean time between keystrokes. Very fast (< 70ms) or very slow (> 900ms) patterns are flagged.
- **Paste ratio** — Total pasted characters divided by document length. High ratios indicate copy-paste content.
- **Edit ratio** — Total edit deltas divided by keystroke count. Very low edit ratios (< 0.04) suggest text was composed elsewhere.
- **Pause patterns** — Analyzes pauses before sentence-ending punctuation and near punctuation marks. Classifies cadence as `insufficient_data`, `frequent_long_pauses`, `consistent_fast_typing`, `regular_cadence`, `irregular_pattern`, or `balanced_pattern`.

### 2. Text Statistics (`textStatistics.ts`)

- **Word count** and **average word length**
- **Sentence count** and **sentence length variation** (normalized std dev, 0-100)
- **Lexical diversity** — Type-Token Ratio (unique words / total words) × 100
- **Lexical richness** — Hapax legomena ratio (words appearing once / total unique words) × 100
- **Linguistic irregularities** — excessive word repetition, unusual punctuation density, very long sentences, high contraction frequency

### 3. Correlation Engine (`correlationEngine.ts`)

Cross-verifies behavioral signals against text complexity. Detects mismatches such as:
- Fast typing with complex vocabulary (suspicious)
- Slow typing with simple vocabulary (suspicious)
- Long pauses but uniform sentence lengths (suspicious)
- No pastes but high lexical diversity (suspicious)
- Frequent edits but low lexical richness (consistent)

Returns correlation score (0-100) and findings.

### 4. Suspicious Segment Detector (`suspiciousSegmentDetector.ts`)

Scans the document text for:
- **Templated phrases** — 15 common AI phrases ("In conclusion", "Furthermore", "Moreover", etc.) — only flagged when suspicion >= 45
- **Tone shifts** — complexity jumps > 2x between adjacent sentences
- **Perfect sentences** — no informal markers, no contractions, > 50 words — only if edit ratio <= 0.1
- **Overconfident passages** — "definitely", "certainly", "obviously", etc. — only if suspicion >= 50
- **Repeated patterns** — same word (> 4 chars) appearing 3+ times within 50 words

Each segment is tagged with `low`, `medium`, or `high` suspicion level.

### 5. Scoring & Verdict

All signals are combined into a 0-100 suspicion score with weighted contributions:
- Variance: max 35 points
- Paste ratio: max 45 points
- Edit ratio: max 20 points
- Pause patterns: max 15 points
- Text complexity: max ~24 points
- Large paste events: auto-elevates to >= 70
- Heavy paste: auto-elevates to >= 78

Final verdict thresholds: >= 70 is `AI_GENERATED`, >= 38 is `AI_ASSISTED`, < 38 is `HUMAN`.

---

## UI / Design System

### Design Language

Notion-inspired clean, minimal interface with:
- **Sidebar** — Fixed 240px left sidebar with workspace navigation, user avatar, and theme toggle
- **Main content** — Scrollable area with card-based layout
- **Typography** — Inter font family, clear hierarchy with 11px uppercase labels
- **Spacing** — 8px grid-aligned spacing with rounded corners
- **Colors** — Neutral palette with semantic accent colors (green for success, amber for warning, red for destructive)

### Theme

HSL-based CSS variable system supporting light and dark modes:

| Token | Light | Dark |
|---|---|---|
| Background | `hsl(0 0% 100%)` | `hsl(0 0% 7.5%)` |
| Foreground | `hsl(0 0% 9%)` | `hsl(0 0% 98%)` |
| Muted | `hsl(0 0% 96.1%)` | `hsl(0 0% 14.9%)` |
| Border | `hsl(0 0% 89.8%)` | `hsl(0 0% 18%)` |
| Sidebar | `hsl(0 0% 98%)` | `hsl(0 0% 9%)` |

Theme toggling uses Tailwind's class-based dark mode (`dark:` variant).

### Component Library

shadcn/ui components built on Radix UI primitives:

| Component | Used In |
|---|---|
| Button | All pages — actions, navigation |
| Input | Auth page — email/password fields |
| Card | All pages — section containers |
| Badge | Verdicts, status indicators |
| ScrollArea | Session lists, admin tables |
| Separator | Sidebar dividers |
| Avatar | Sidebar user section |
| Collapsible | Admin user reports accordion |

### Pages

| Page | Location | Description |
|---|---|---|
| Auth | Unauthenticated | Login/register card centered on screen |
| Write | Sidebar: Write | Editor + live stats + analysis report |
| Sessions | Sidebar: Sessions | List of all writing sessions as cards |
| Session Detail | Session click from list | Full report with verdict, scores, reasons, document |
| Admin Sessions | Sidebar: All Sessions | Table of all sessions across users |
| Admin User Reports | Sidebar: User Reports | Sessions grouped by user in collapsible accordions |
| Admin Detail | Session click from table/accordion | Full detailed analysis report |

---

## Security

### Authentication

- **JWT tokens** — Custom HS256 implementation, 4-hour expiration
- **Bearer scheme** — Token sent in `Authorization: Bearer <token>` header
- **localStorage** — Token and user data persisted in browser localStorage

### Password Storage

- **PBKDF2** — SHA-512, 120,000 iterations, 64-byte key
- **Random salt** — 16-byte cryptographically random salt per password
- **Constant-time comparison** — `timingSafeEqual` prevents timing attacks

### Route Protection

- `requireAuth` middleware — Validates JWT on protected routes
- `requireRole('admin')` — Restricts admin-only routes (e.g., viewing all sessions)
- **Ownership checks** — Users can only access their own sessions (admin bypasses)

### Data Privacy

- Keystroke data is stored per-session and scoped to the session owner
- Admins can view all sessions but cannot impersonate users
- Sessions can be deleted by their owners

---

## License

MIT License — Copyright 2026 vicharanashala
