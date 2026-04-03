# Vi-Notes

> AI authorship verification platform that detects whether writing is human-authored, AI-assisted, or AI-generated through behavior tracking, text analysis, and MongoDB-backed reports.

## Overview

Vi-Notes tracks how people write, not just what they write. It captures keystroke timing, paste events, edit patterns, and text statistics, then combines them into a report that classifies a session as `HUMAN`, `AI_ASSISTED`, or `AI_GENERATED`.

Current capabilities:

- Writer login and registration with JWT auth
- Tracked writing editor with keystrokes, pastes, edits, and active typing duration
- Session sync every 900ms while typing
- Server-side analysis with behavioral scoring, text statistics, correlation checks, and suspicious segment detection
- Report export in `json`, `html`, and `text` formats
- Shareable report tokens
- Admin views for all sessions, grouped user reports, and detailed report drill-downs

## Features

### Writer Experience

- Login and registration with role-based access
- Editor with real-time tracking of typing, paste, and edit events
- Session creation, sync, end, and manual refresh flows
- Session list and detailed session view

### Analysis Pipeline

- Behavioral scoring based on typing variance, paste ratio, edit ratio, and pause patterns
- Text statistics including word count, sentence variation, lexical diversity, and lexical richness
- Correlation checks that compare writing behavior with text complexity
- Suspicious segment detection for templated phrases, tone shifts, and overly polished text
- Verdict generation with confidence and suspicion scores

### Reporting and Admin

- Detailed analysis reports stored in MongoDB
- Export support for JSON, HTML, and text formats
- Shareable report tokens
- Admin dashboard with all sessions and grouped user reports
- Full report drill-down with metrics, reasons, and suspicious segments

## Tech Stack

### Frontend

| Technology     | Purpose                         |
| -------------- | ------------------------------- |
| React 18       | UI framework                    |
| TypeScript 5   | Type safety                     |
| Vite 4         | Dev server and build tool       |
| Tailwind CSS 3 | Utility-first styling           |
| shadcn/ui      | Accessible component primitives |
| Lucide React   | Icon library                    |

### Backend

| Technology   | Purpose            |
| ------------ | ------------------ |
| Node.js      | Runtime            |
| Express 4    | HTTP server        |
| TypeScript 5 | Type safety        |
| MongoDB      | Database           |
| Mongoose 7   | ODM                |
| Zod          | Request validation |
| Custom JWT   | Auth tokens        |
| PBKDF2       | Password hashing   |

## Architecture

```mermaid
flowchart LR
  Browser["Browser"] --> Client["Client: React + Vite"]

  Client --> AuthPage["AuthPage"]
  Client --> Layout["AppLayout"]

  Layout --> UserWorkspace["UserWorkspace"]
  Layout --> AdminWorkspace["AdminWorkspace"]

  UserWorkspace --> Editor["Editor"]
  UserWorkspace --> KeystrokeTracker["useKeystrokeTracker"]
  UserWorkspace --> SessionManager["useSessionManager"]

  AdminWorkspace --> AdminReportDetail["AdminReportDetail"]

  UserWorkspace --> API["Express API"]
  AdminWorkspace --> API
  AuthPage --> API

  subgraph Server["Server: Express + TypeScript"]
    API --> AuthRoutes["/api/auth"]
    API --> SessionRoutes["/api/sessions"]
    API --> AnalysisRoutes["/api/analysis"]
    API --> ReportRoutes["/api/reports"]

    AuthRoutes --> AuthServices["JWT auth + password hashing + seed users"]
    SessionRoutes --> SessionServices["Session CRUD + export + share tokens"]
    AnalysisRoutes --> AnalysisServices["Behavioral analysis + text statistics + correlation + suspicious segments"]
    ReportRoutes --> ReportServices["Archived report access"]

    AuthServices --> Mongo[(MongoDB)]
    SessionServices --> Mongo
    AnalysisServices --> Mongo
    ReportServices --> Mongo
  end
```

The server connects to MongoDB during startup and seeds initial users before listening for requests.

## Project Structure

```
vi-notes/
├── package.json        # Root workspace scripts
├── client/             # React frontend
├── server/             # Express backend
├── types/              # Shared TypeScript contracts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB, either local or MongoDB Atlas
- npm with workspace support

### Install

```bash
git clone <repo-url>
cd vi-notes
npm install
cp .env.example .env
```

Update `.env` with your MongoDB URI and secrets before starting the app.

### Run

```bash
npm run dev
```

This starts both the server and the client, opens the browser, and requires the server to connect to MongoDB successfully before the app is ready.

### Optional Scripts

```bash
npm run dev:server
npm run dev:client
npm run build
npm start
```

## Environment Variables

| Variable                 | Default                              | Description               |
| ------------------------ | ------------------------------------ | ------------------------- |
| `PORT`                   | `3001`                               | Server listen port        |
| `MONGODB_URI`            | `mongodb://127.0.0.1:27017/vi-notes` | MongoDB connection string |
| `NODE_ENV`               | `development`                        | Environment mode          |
| `JWT_SECRET`             | `vi-notes-secret`                    | JWT signing secret        |
| `JWT_EXPIRATION_SECONDS` | `14400`                              | Token TTL in seconds      |
| `SEED_ADMIN_EMAIL`       | `admin@vi-notes.local`               | Seed admin email          |
| `SEED_ADMIN_PASSWORD`    | `AdminPass!2026`                     | Seed admin password       |
| `SEED_USER_EMAIL`        | `writer@vi-notes.local`              | Seed writer email         |
| `SEED_USER_PASSWORD`     | `WriterPass!2026`                    | Seed writer password      |
| `VITE_API_URL`           | `http://localhost:3001/api`          | Client API base URL       |

## Available Scripts

### Root

| Script               | Description                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`        | Start server and client together, open the browser, stop both if either fails |
| `npm run dev:server` | Start only the server                                                         |
| `npm run dev:client` | Start only the client                                                         |
| `npm run build`      | Build server and client for production                                        |
| `npm start`          | Start the production server                                                   |
| `npm test`           | Run workspace tests                                                           |

### Client

| Script            | Description               |
| ----------------- | ------------------------- |
| `npm run dev`     | Start the Vite dev server |
| `npm run build`   | Build the client          |
| `npm run preview` | Preview the client build  |

### Server

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the TypeScript server with auto-reload |
| `npm run build` | Compile the server                           |
| `npm start`     | Run the compiled server                      |
| `npm test`      | Run server tests                             |

## API Reference

### Authentication

| Method | Endpoint             | Description                     |
| ------ | -------------------- | ------------------------------- |
| POST   | `/api/auth/register` | Create an account               |
| POST   | `/api/auth/login`    | Sign in and receive a JWT token |

### Sessions

| Method | Endpoint                           | Description                                  |
| ------ | ---------------------------------- | -------------------------------------------- |
| POST   | `/api/sessions/start`              | Start a writing session                      |
| POST   | `/api/sessions/update`             | Sync delta events to the session             |
| POST   | `/api/sessions/end`                | End the session and trigger analysis         |
| GET    | `/api/sessions`                    | List sessions                                |
| GET    | `/api/sessions/:id`                | Get a single session                         |
| DELETE | `/api/sessions/:id`                | Delete a session                             |
| GET    | `/api/sessions/:id/export/:format` | Export a report as `json`, `html`, or `text` |
| GET    | `/api/sessions/:id/share-token`    | Generate a shareable token                   |

### Analysis

| Method | Endpoint                   | Description                |
| ------ | -------------------------- | -------------------------- |
| POST   | `/api/analysis/:sessionId` | Run analysis for a session |

### Reports

| Method | Endpoint       | Description           |
| ------ | -------------- | --------------------- |
| GET    | `/api/reports` | List archived reports |

## Security

- JWT-based authentication
- Role-based access control for admin and writer users
- PBKDF2 password hashing
- MongoDB connection checks on startup
- Input validation through Zod on API routes
