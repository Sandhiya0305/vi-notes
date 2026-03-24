# Vi-Notes

**Vi-Notes** is a full-stack authenticity verification platform designed to distinguish genuine human-written content from AI-generated or AI-assisted text. The system focuses on analyzing **writing behavior** alongside **statistical and linguistic characteristics** of the text to establish reliable authorship verification.

This repository contains the **complete production-ready implementation** using the MERN stack (MongoDB, Express, React/TypeScript, Node.js) with Electron for desktop keyboard access.

---

## Motivation

With the widespread availability of AI writing tools, verifying true human authorship has become increasingly challenging. Most existing detection methods rely primarily on textual analysis, which can be inconsistent and easy to bypass.

Vi-Notes approaches this problem by combining:

- Behavioral signals from the writing process
- Statistical analysis of the written content
- Correlation between how content is written and what is written

---

## Core Idea

Human writing naturally includes:

- Variable typing speeds
- Pauses during thinking
- Revisions during idea formation
- Irregular sentence structures
- A relationship between content complexity and editing frequency

AI-generated or pasted text often lacks these behavioral signatures.

Vi-Notes is designed to capture and analyze these characteristics to assess authorship authenticity.

---

## Key Features

### Writing Session Monitoring

- Capture keystroke timing metadata (not raw key content)
- Track pauses, deletions, edits, and writing flow
- Detect pasted or externally inserted text blocks

### Behavioral Pattern Analysis

- Pause distribution before sentences and paragraphs
- Typing speed variance
- Revision frequency relative to text complexity
- Micro-pauses around punctuation and structural boundaries

### Textual Statistical Analysis

- Sentence length variation
- Vocabulary diversity metrics
- Stylistic consistency analysis
- Linguistic irregularities typical of human writing

### Cross-Verification Engine

- Correlate keyboard behavior with text evolution
- Identify mismatches between behavioral data and content
- Flag suspicious uniformity patterns

### Authenticity Reports

- Confidence score for human authorship
- Highlighted suspicious segments
- Supporting behavioral and textual indicators
- Shareable verification summaries

---

## Tech Stack (MERN Architecture)

### Frontend

- React
- TypeScript
- Electron for desktop-level keyboard event access

### Backend

- Node.js
- Express.js
- RESTful APIs for session handling and analysis

### Database

- MongoDB
- Encrypted storage for writing sessions, keystroke metadata, and reports

### Machine Learning

- TensorFlow / PyTorch
- Supervised learning for human vs AI-assisted writing
- Unsupervised anomaly detection
- NLP-based statistical signature analysis

---

## Privacy & Ethics

Vi-Notes is designed with privacy-first principles:

- No storage of raw keystroke content
- Only timing, frequency, and structural metadata is collected
- Encrypted data storage
- User-controlled session tracking
- Monitoring limited strictly to active writing sessions

---

## Project Goals

- Restore trust in written content authenticity
- Differentiate between human-written, AI-assisted, and AI-generated text
- Adapt detection methods as AI writing tools evolve
- Maintain ethical, transparent, and privacy-conscious verification

---

## Repository Scope

This repository currently serves as:

- A design reference
- A research and experimentation space
- A foundation for future MERN-based implementation

---

## Contributing

Contributions are welcome, especially for **feature requests and their implementation**.  
If you are interested in working on an existing feature request or proposing a new one, please open or comment on an issue to start the discussion.

---

## License

This project is licensed under the MIT License.

---
## Repository Layout

```text
vi-notes/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── electron/
│   └── main.ts
├── server/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
├── types/
│   └── index.ts
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or a MongoDB connection string

## Environment

Create a `.env` file at the project root.

```env
MONGODB_URI=mongodb://127.0.0.1:27017/vi-notes
PORT=3001
```

Optional frontend environment:

```env
VITE_API_URL=http://localhost:3001/api
```

If `VITE_API_URL` is not set, the client defaults to `http://localhost:3001/api`.

## Install

```bash
npm install
```

## Run in Development

Run the backend:

```bash
npm run dev -w server
```

Run the frontend in a second terminal:

```bash
npm run dev -w client
```

Open:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3001/health`

## Build

From the repo root:

```bash
npm run build
```

Or build each workspace separately:

```bash
npm run build -w server
npm run build -w client
```

## Current App Flow

1. Focus the editor to start a session.
2. Type, edit, or paste text in the contentEditable editor.
3. The frontend tracks keystrokes, edits, pastes, and elapsed duration.
4. Session deltas are sent to the backend while the session is active.
5. Blur the editor to end the session.
6. The backend analyzes the session and stores the report on the session.
7. The dashboard refreshes and shows the saved session with its verdict.

## Frontend Highlights

- `Editor`: contentEditable editor with guarded input handling
- `LiveIndicator`: shows WPM, duration, naturalness score, and paste activity
- `Dashboard`: lists saved sessions with preview, word count, duration, and verdict
- `ReportViewer`: displays the generated report
- `ErrorBoundary`: prevents silent blank-screen failures if the UI crashes

## Backend Highlights

- `POST /api/sessions/start`: create a new active session
- `POST /api/sessions/update`: append tracked activity to an active session
- `POST /api/sessions/end`: finalize a session
- `GET /api/sessions`: return all sessions as a JSON array
- `GET /api/sessions/:id`: fetch a single session
- `DELETE /api/sessions/:id`: delete a session
- `POST /api/analysis/:sessionId`: generate and store a report for a session

## Session Data Stored

Each session stores:

- `_id`
- `createdAt`
- `updatedAt`
- `documentSnapshot`
- `keystrokes`
- `pastes`
- `edits`
- `sessionDurationMs`
- `status`
- `analysis`

## Analysis Rules

The current analysis engine is deterministic and rule-based. It scores a session using:

- Typing interval variance
- Paste ratio against final document length
- Edit ratio relative to typed activity
- Session duration compared with document length

Those signals produce:

- `verdict`
- `confidenceScore`
- `overallSuspicionScore`
- `naturalnessScore`
- `reasons`
- summary metrics

## Important Notes

- The backend requires a working MongoDB connection to start.
- The app currently uses a contentEditable editor, not a rich text framework.
- The Electron entry point exists, but the main verified runtime flow is the web client plus Express server.
- The analysis is heuristic, not machine-learning based.

## Scripts

Root:

```bash
npm run dev
npm run build
npm run start
```

Client:

```bash
npm run dev -w client
npm run build -w client
npm run preview -w client
```

Server:

```bash
npm run dev -w server
npm run build -w server
npm run start -w server
```

## Verified State

The current codebase has been checked with:

- `npm run build -w server`
- `npm run build -w client`

## License

MIT
