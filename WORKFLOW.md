# Vi-Notes Workflow Diagrams

## Session Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant E as Editor
    participant KT as KeystrokeTracker
    participant SM as SessionManager
    participant API as Server API
    participant DB as MongoDB
    participant AE as Analysis Engine

    U->>E: Focus editor + type first key
    E->>KT: handleInput(content, inputType)
    KT->>SM: ensureSessionStarted(content)
    SM->>API: POST /api/sessions/start
    API->>DB: Create Session (status: active)
    DB-->>API: Session
    API-->>SM: { session }
    Note over SM: activeSessionId set

    loop Every 900ms while typing
        U->>E: Type / paste / edit
        E->>KT: handleInput / handlePaste / handleKeyDown
        KT->>SM: syncSession(delta payload)
        SM->>API: POST /api/sessions/update
        API->>DB: Push keystrokes/pastes/edits
        DB-->>API: Updated Session
    end

    U->>E: Click "Analyze Writing"
    SM->>API: POST /api/sessions/update (final sync)
    SM->>API: POST /api/sessions/end
    API->>DB: Set status = completed
    API->>AE: analyzeSessionBehavior(session)
    AE->>AE: Behavioral analysis
    AE->>AE: Text statistics
    AE->>AE: Correlation engine
    AE->>AE: Suspicious segment detection
    AE->>AE: Scoring + verdict
    AE-->>API: AuthenticityReport
    API->>DB: Save report to session.analysis
    API->>DB: Create ReportArchive
    API-->>SM: { session, report }
    SM-->>U: Display analysis report on Write page
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant AC as AuthContext
    participant API as Server API
    participant DB as MongoDB

    U->>C: Enter email + password
    C->>AC: login(credentials)
    AC->>API: POST /api/auth/login
    API->>DB: Find user by email
    DB-->>API: User document
    API->>API: verifyPassword(PBKDF2)
    API->>API: signJwt({ userId, email, role })
    API-->>AC: { token, expiresAt, user }
    AC->>AC: setState({ user, token })
    AC->>C: localStorage.setItem('vi-notes-auth', ...)
    AC-->>C: Redirect to workspace
```

## Admin User Reports View

```mermaid
flowchart TD
    A[Admin clicks "User Reports"] --> B[Fetch all sessions]
    B --> C[Group sessions by ownerEmail]
    C --> D{For each user group}
    D --> E[Render collapsible accordion]
    E --> F[Header: email + session count + human count + flagged count]
    E --> G[Expanded: session cards with verdict, WPM, duration, date]
    G --> H[Admin clicks a session]
    H --> I[Show AdminReportDetail]
    I --> J[Full analysis: metrics, scores, stats, verdict, reasons, segments]
```

## Analysis Pipeline

```mermaid
flowchart TD
    A[Session ended] --> B[Load session data]
    B --> C[Behavioral Analysis]
    C --> C1[Keystroke variance]
    C --> C2[Average interval]
    C --> C3[Paste ratio]
    C --> C4[Edit ratio]
    C --> C5[Pause patterns]

    B --> D[Text Statistics]
    D --> D1[Word count + avg word length]
    D --> D2[Sentence count + variation]
    D --> D3[Lexical diversity TTR]
    D --> D4[Lexical richness hapax]
    D --> D5[Linguistic irregularities]

    C --> E[Correlation Engine]
    D --> E
    E --> E1[Detect behavioral-text mismatches]
    E --> E2[Calculate correlation score]

    D --> F[Suspicious Segment Detector]
    F --> F1[Templated AI phrases]
    F --> F2[Tone shifts]
    F --> F3[Perfect sentences]
    F --> F4[Overconfident language]
    F --> F5[Repeated patterns]

    E --> G[Scoring]
    F --> G
    C --> G
    G --> H{Score >= 70?}
    H -->|Yes| I[AI_GENERATED]
    H -->|No| J{Score >= 38?}
    J -->|Yes| K[AI_ASSISTED]
    J -->|No| L[HUMAN]

    I --> M[Generate report]
    K --> M
    L --> M
    M --> N[Save to session + ReportArchive]
    N --> O[Return to client]
```

## Client Component Tree

```mermaid
flowchart TD
    A[main.tsx] --> B[ThemeProvider]
    B --> C[AuthProvider]
    C --> D[ErrorBoundary]
    D --> E[App.tsx]

    E --> F{Authenticated?}
    F -->|No| G[AuthPage]
    F -->|Yes| H{Admin?}

    H -->|Yes| I[AppLayout]
    I --> I1[Sidebar]
    I --> I2[AdminWorkspace]
    I2 --> I3[AdminReportDetail]

    H -->|No| J[AppLayout]
    J --> J1[Sidebar]
    J --> J2[UserWorkspace]
    J2 --> J3[Write View]
    J2 --> J4[Sessions View]
    J2 --> J5[Session Detail View]
    J3 --> J6[Editor]
```

## Theme Toggle Flow

```mermaid
flowchart LR
    A[User clicks theme toggle] --> B[ThemeContext.toggleTheme]
    B --> C{Current theme?}
    C -->|light| D[Set class='dark' on documentElement]
    C -->|dark| E[Set class='light' on documentElement]
    D --> F[Save to localStorage]
    E --> F
    F --> G[Tailwind dark: variants activate]
    G --> H[CSS variables switch]
    H --> I[UI re-renders with new colors]
```

## Delta Sync Mechanism

```mermaid
flowchart TD
    A[User types] --> B[KeystrokeEvent created]
    B --> C[Added to local keystrokes array]
    C --> D{900ms debounce timer}
    D --> E[syncSession called]
    E --> F[Build delta payload]
    F --> F1[new keystrokes since last sync]
    F --> F2[new pastes since last sync]
    F --> F3[new edits since last sync]
    F --> G{Has changes?}
    G -->|No| H[Skip sync]
    G -->|Yes| I[POST /api/sessions/update]
    I --> J[Server appends events to MongoDB]
    J --> K[Update syncedLengthsRef]
    K --> L[Wait for next keystroke]
```
