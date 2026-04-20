# Sakinah — AI-Powered Qur'an Companion

> An intelligent companion for daily Qur'an reflection, grammar learning, and structured memorization.

---

## Overview

Sakinah helps English-speaking Muslims build a consistent, meaningful relationship with the Qur'an. Most people struggle with passive reading that creates no lasting connection — Sakinah makes every interaction active, personalized, and habit-forming through three reinforcing systems: an AI reflection coach, a gamified grammar quiz engine, and a step-by-step 3×3 Hifdh memorization tool.

Built for the [Quran Foundation Hackathon](https://hackathon.quran.com), Sakinah integrates the official Quran.com API v4 for all Arabic text, translations, audio recitations, and tafsir.

---

## Features

### 🤖 AI Reflection Coach
- Responds to how a verse lands personally in the user's life
- Context-aware conversation history using OpenRouter (GPT-4o-mini)
- Consistent personality system — warm, non-preachy, Socratic
- Voice input via Web Speech API
- Persistent chat history via Firebase Firestore

### 📖 Grammar & Learning
- Adaptive quiz engine with spaced repetition (New → Learning → Mastered)
- Word-level mastery tracking synced across the entire app — words learned in the quiz appear highlighted in the Memorizer
- Difficulty scales with user level (more distractors as you advance)
- Heart-based penalty system and streak counter
- AI-generated 2-line Impact Quotes based on the current verse

### 📿 3×3 Hifdh Memorizer
- Duolingo-style path map unlocking surahs in sequence: Al-Fatiha → An-Nas → An-Naas → ... → Al-Baqarah
- **Initial Soak**: tap every word in reading order, 7 rounds — sequential locking enforces correct reading direction
- **Chain Repetitions**: Verse A × 3, Verse B × 3, A+B × 3
- **Blind Recitation**: 5-minute countdown, text hidden, full-quality recording with `MediaRecorder`
- Sheikh recitation audio preloaded from Quran.com API
- Adjustable Arabic font size (18–40px)
- Word mastery colors from grammar progress rendered live in the memorization view

### 📊 Spiritual Growth Dashboard
- Emotional trend chart (Recharts) tracking reflection mood over time
- Reflection theme analysis (patience, gratitude, trust, etc.)
- AI-generated weekly insight with growth signal, key struggle, and action step
- Achievement system (First Reflection, 7-Day Streak, Surah Complete, etc.)

### 🔐 Authentication & Persistence
- Google Sign-In via Firebase Auth
- Streak tracking and XP/level system synced to Firestore
- Memorization progress persisted per module
- Guest mode with localStorage fallback

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand (with localStorage persistence) |
| Auth | Firebase Authentication (Google) |
| Database | Firebase Firestore |
| AI | OpenRouter API (GPT-4o-mini) |
| Quran Data | Quran.com API v4 |
| Charts | Recharts |
| Icons | Lucide React |

---

## Architecture

```
app/
├── api/
│   ├── verse/          # Random verse with translation, tafsir, audio
│   ├── coach/          # AI reflection coach (OpenRouter)
│   ├── grammar/        # Word-by-word Arabic breakdown (OpenRouter)
│   ├── impact-quote/   # 2-line motivational verse insight
│   └── insights/       # Weekly spiritual growth analysis
├── learn/              # Grammar quiz + Impact Quotes
├── memorize/           # 3×3 Hifdh path map + stepper
└── dashboard/          # Growth analytics

components/
├── Memorizer3x3.jsx    # Full 3×3 stepper with soak, chain, blind recording
├── MemorizePath.jsx    # Duolingo-style snake-path map
├── AdaptiveQuiz.jsx    # Spaced repetition grammar quiz
├── Chat.jsx            # AI reflection coach UI
└── Dashboard.jsx       # Analytics + insight generation

lib/
├── quranApi.js         # Chapter-level bundle fetcher with Map-based lookup cache
├── userApi.js          # Firestore CRUD (bookmarks, streaks, XP, memorize progress)
├── promptBuilder.js    # Structured prompt construction for all AI routes
├── personality.js      # Sakinah AI identity and tone system
└── memorizeMap.js      # Surah sequence generator [1, 114→2] with review nodes

context/
└── masteryStore.js     # Zustand: word mastery, ayah status, XP, hearts
```

---

## Quran.com API Integration

Sakinah uses the [Quran Foundation API v4](https://api.quran.com/api/v4) for all content:

- **Verses** — `/quran/verses/uthmani` (Uthmani script)
- **Translations** — `/quran/translations/131` (Saheeh International)
- **Tafsir** — `/quran/tafsirs/169` (Ibn Kathir condensed)
- **Audio** — `/recitations/1/by_chapter/{n}` (Al-Afasy)
- **Chapter info** — `/chapters/{n}`

All chapter data is fetched in a single 4-request parallel bundle and stored in `Map<verse_key, value>` objects for O(1) lookups. The bundle is cached at module scope, eliminating redundant API calls within a session.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication (Google) and Firestore enabled
- An [OpenRouter](https://openrouter.ai) API key

### Installation

```bash
git clone https://github.com/your-username/sakinah.git
cd sakinah
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

```env
# OpenRouter (GPT-4o-mini via OpenRouter proxy)
OPENROUTER_API_KEY=your_openrouter_key_here

# Firebase (safe to expose — protected by Firestore Security Rules)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Enable **Authentication** → Google provider
3. Enable **Firestore Database** → Start in production mode
4. Add your domain to **Authentication → Settings → Authorized domains**
5. Set Firestore Security Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy

```bash
# Deploy to Vercel
vercel deploy

# Add environment variables in:
# Vercel Dashboard → Project → Settings → Environment Variables
```

---

## How the 3×3 Method Works

The 3×3 Hifdh methodology is a structured memorization technique:

1. **Initial Soak (7×)** — Read the entire section aloud 7 times while looking. In Sakinah, each word must be tapped in order to enforce active reading. All 7 rounds must complete.
2. **Chain Repetitions (3×)** — Verse A × 3, Verse B × 3, then A+B together × 3. Continues for all verses in the section.
3. **Final Polish (3×)** — Recite the whole section 3 times to consolidate.
4. **Blind Test** — Record yourself reciting from memory (up to 5 minutes). Text is hidden. Stop recording to reveal the text and play back your audio for self-correction.
5. **Mark as Mastered** — User confirms mastery. Ayahs are marked green in the global mastery state.

---

## Word Mastery System

Words learned in the Grammar Quiz update a global Zustand store (`masteryStore`) keyed by Arabic word string:

| Level | Color | Status |
|---|---|---|
| 0 | Default | New / not seen |
| 1–2 | 🟡 Yellow | Learning |
| 3–5 | 🟢 Green | Mastered |

These colors render live in the Memorizer's word display — so if you mastered `الْحَمْدُ` in the grammar quiz, it appears green when you open Al-Fatiha in the Memorizer.

---

## Project Structure Notes

- All AI prompts use a layered system: `AI_PERSONALITY` (identity) → `buildPersonalityContext` (user memory) → task instruction → verse context. This ensures Sakinah always sounds like itself.
- The memorize path generates ~500+ nodes from the surah sequence `[1, 114, 113, ..., 2]` with review nodes injected every 6 modules (every 4 for longer surahs).
- Audio recording uses `MediaRecorder` with a 1000ms timeslice. Stream tracks are released only inside the `onstop` callback after the blob is fully constructed, preventing the 7-second cutoff bug common with premature stream termination.

---

## License

MIT

---

## Acknowledgements

- [Quran Foundation](https://quran.com) — Quran.com API v4
- [OpenRouter](https://openrouter.ai) — AI API access
- [Firebase](https://firebase.google.com) — Auth and Firestore
- Arabic typography: [Amiri Font](https://www.amirifont.org)
