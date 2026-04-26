# QuizForge — AI-Powered Exam Practice Platform
## Complete Development Blueprint (HTML + CSS + JS)

---

## 1. PROJECT OVERVIEW

**QuizForge** is a fully client-side, AI-powered exam practice platform built with vanilla HTML, CSS, and JavaScript. It allows users to upload or paste a syllabus/topic, extract modules, generate uniquely tailored quizzes at three difficulty levels, review performance analytics, and revisit past attempts — all powered by the Anthropic Claude API (or OpenAI-compatible API).

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styling | CSS3 (variables, grid, flexbox, animations) |
| Logic | Vanilla JavaScript (ES6+ modules) |
| AI Backend | Anthropic Claude API (`claude-sonnet-4-20250514`) via `fetch()` |
| Storage | `localStorage` (quiz history, user sessions) |
| PDF Reading | PDF.js (CDN) for uploaded documents |
| Fonts | Google Fonts (e.g. `Sora` + `DM Mono`) |
| Icons | Lucide Icons (CDN) |

---

## 3. FILE STRUCTURE

```
quizforge/
├── index.html              ← Single-page app shell
├── style.css               ← All styles (variables, components, animations)
├── app.js                  ← App entry point + router
├── modules/
│   ├── api.js              ← Claude API integration
│   ├── parser.js           ← Syllabus text extraction + module detection
│   ├── quiz-engine.js      ← Question generation, validation, scoring
│   ├── storage.js          ← localStorage CRUD operations
│   ├── analytics.js        ← Performance analysis + insights
│   └── ui.js               ← DOM manipulation helpers
├── components/
│   ├── upload.js           ← Upload/paste screen
│   ├── module-select.js    ← Module listing + selection
│   ├── level-select.js     ← Difficulty level chooser
│   ├── quiz.js             ← Active quiz interface
│   ├── results.js          ← Post-quiz results + explanations
│   ├── analytics-view.js   ← Detailed improvement analysis
│   └── history.js          ← Past attempts browser
└── assets/
    └── (optional SVGs/icons)
```

> **Note for single-file builds:** All modules can be inlined into `index.html` as separate `<script type="module">` blocks or IIFE sections.

---

## 4. DESIGN SYSTEM

### 4.1 Color Palette (CSS Variables)
```css
:root {
  --bg-primary:     #0A0A0F;   /* Deep space black */
  --bg-secondary:   #12121A;   /* Card backgrounds */
  --bg-glass:       rgba(255,255,255,0.04);
  --accent-primary: #6EE7B7;   /* Emerald green — primary CTA */
  --accent-second:  #818CF8;   /* Indigo — secondary highlights */
  --accent-warm:    #FCD34D;   /* Amber — warnings, hard level */
  --accent-danger:  #F87171;   /* Red — wrong answers */
  --text-primary:   #F0F0F5;
  --text-muted:     #6B7280;
  --text-dim:       #374151;
  --border:         rgba(255,255,255,0.08);
  --border-accent:  rgba(110,231,183,0.3);
  --shadow-glow:    0 0 40px rgba(110,231,183,0.08);
  --radius-sm:      8px;
  --radius-md:      16px;
  --radius-lg:      24px;
}
```

### 4.2 Typography
```css
/* Headings: Sora (geometric, modern) */
/* Body: DM Sans (readable, clean) */
/* Code/data: DM Mono (monospace for Q numbers, stats) */

@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap');

body { font-family: 'DM Sans', sans-serif; }
h1, h2, h3 { font-family: 'Sora', sans-serif; }
.mono { font-family: 'DM Mono', monospace; }
```

### 4.3 Component Classes
- `.card` — glassmorphism card with border and backdrop blur
- `.btn-primary` — filled emerald button with hover glow
- `.btn-ghost` — transparent with border
- `.badge` — small pill labels (level, module count, etc.)
- `.progress-ring` — SVG circular progress indicator
- `.tag` — module/topic chips
- `.answer-option` — quiz answer card (normal / selected / correct / wrong states)

---

## 5. APPLICATION SCREENS & FLOW

```
[SCREEN 1: Upload/Paste]
        ↓
[SCREEN 2: Module Extraction + Selection]
        ↓
[SCREEN 3: Level Selection]
        ↓
[SCREEN 4: Quiz Generation Loading]
        ↓
[SCREEN 5: Active Quiz Interface]
        ↓
[SCREEN 6: Results + Explanations]
        ↓
[SCREEN 7: Performance Analytics]
        ↓ (accessible anytime via sidebar)
[SCREEN 8: History — Past Attempts]
```

---

## 6. SCREEN-BY-SCREEN SPECIFICATIONS

---

### SCREEN 1: Upload / Input Screen

**Purpose:** Accept syllabus or topic content from user.

**UI Elements:**
- App logo + tagline at top
- Two-tab toggle: `📄 Upload Document` | `✏️ Paste Text`
- **Upload tab:**
  - Drag-and-drop zone (dashed border, animated)
  - Accepts `.pdf`, `.txt`, `.docx` (PDF.js for PDF, raw text for txt)
  - File size indicator + file name preview
  - Error state for unsupported types
- **Paste tab:**
  - Large `<textarea>` (min 300px height)
  - Character count (`min: 100 chars to proceed`)
  - Placeholder: *"Paste your syllabus, topic outline, or study notes here…"*
- `Analyze Syllabus →` primary CTA button
- Loading state on button: spinner + *"Reading your content…"*

**JS Logic (`upload.js`):**
- PDF.js: extract text from PDF pages
- For `.txt`: use `FileReader.readAsText()`
- Validate minimum content length
- On submit → call `parser.js` → transition to Screen 2

---

### SCREEN 2: Module Extraction & Selection

**Purpose:** Show AI-detected modules/topics from the syllabus for user to select.

**UI Elements:**
- Header: *"We found [N] modules in your syllabus"*
- Grid of module cards (2-3 col on desktop, 1 col mobile):
  - Module name (bold)
  - Short 1-line description (AI-generated)
  - Subtopic count badge
  - Checkbox to select/deselect
- `Select All` / `Deselect All` toggle
- `Practice Selected Modules →` CTA (disabled if 0 selected)
- Back button

**AI Prompt (`parser.js`):**
```
System: You are an expert academic curriculum analyzer.

User: Analyze the following syllabus/topic content and extract all distinct modules or chapters. For each module, provide:
1. A short, clear module name
2. A one-sentence description
3. A list of 3-6 key subtopics

Return ONLY valid JSON in this format:
{
  "modules": [
    {
      "id": "mod_1",
      "name": "Module Name",
      "description": "Brief description",
      "subtopics": ["Subtopic A", "Subtopic B", "Subtopic C"]
    }
  ]
}

Syllabus content:
{{SYLLABUS_TEXT}}
```

**JS Logic:**
- Call Claude API with above prompt
- Parse JSON response
- Render module cards dynamically
- Store selected modules in session state

---

### SCREEN 3: Difficulty Level Selection

**Purpose:** Let user choose quiz difficulty and see what to expect.

**UI Elements:**
- Header: *"Choose Your Challenge Level"*
- Three large cards in a row (stacked on mobile):

**EASY Card (Green theme):**
- Icon: 🌱
- Label: `EASY`
- Title: *"Concept Builder"*
- Description: *"Foundational knowledge, definitions, and conceptual understanding"*
- Stats: `20–25 Questions` | `MCQ Format` | `~15 min`
- Bullet list: Core definitions, Factual recall, Basic application, Term identification

**INTERMEDIATE Card (Indigo theme):**
- Icon: ⚡
- Label: `INTERMEDIATE`
- Title: *"Applied Thinker"*
- Description: *"Case-based, real-world application and analytical reasoning"*
- Stats: `75 Questions` | `MCQ + Case-based` | `~60 min`
- Bullet list: Case scenarios, Real-world implementation, Conceptual analysis, Applied problem solving

**HARD Card (Amber theme):**
- Icon: 🔥
- Label: `HARD`
- Title: *"Exam Simulator"*
- Description: *"Paragraph-based, proof-reading, case studies — exactly like official exams"*
- Stats: `75–100 Questions` | `Full exam format` | `~90 min`
- Bullet list: Paragraph comprehension, Case studies, Proof-reading based, Real-world impact analysis, Official exam-style

- Selected card gets glowing border highlight
- `Start Quiz →` CTA

---

### SCREEN 4: Quiz Generation (Loading)

**Purpose:** Visually engaging loading screen while AI fetches web context and generates questions.

**UI Elements:**
- Animated logo / spinner
- Multi-step progress indicator:
  ```
  ✅ Syllabus analyzed
  ⏳ Researching topic context from knowledge base...
  ⬜ Generating unique questions...
  ⬜ Validating & shuffling...
  ⬜ Ready!
  ```
- Each step animates in sequence with 1.5–3s delays
- Fun message: *"Crafting questions that actually make you think…"*
- Background subtle particle/grid animation

**JS Logic (`quiz-engine.js`):**
- Build the appropriate system + user prompt based on level
- Stream or await Claude API response
- Parse question JSON
- Shuffle questions and options
- Store in sessionStorage

---

### SCREEN 5: Active Quiz Interface

**Purpose:** Clean, focused quiz-taking experience.

**Layout:**
```
[Header: Module Name | Level Badge | Q 12/75 | Timer | Progress Bar]
─────────────────────────────────────────────────────
[Question Panel]
  - Question number (large mono)
  - Question type badge (MCQ / Case Study / Paragraph)
  - [Case/Paragraph preamble block if applicable]
  - Question text (large, readable)

[Options Panel]
  - 4 answer options (A, B, C, D) as large clickable cards
  - Options labeled with A/B/C/D prefix in mono font

[Bottom Bar]
  - "Flag for Review" toggle
  - "Previous" / "Next" navigation
  - Question navigator grid (dots — answered, flagged, skipped)
  - "Submit Quiz" button (appears on last question or via navigator)
─────────────────────────────────────────────────────
```

**Answer Option States:**
- Default: subtle border, hover glow
- Selected: filled accent background, white text
- After submission — Correct: green border + ✓ icon
- After submission — Wrong: red border + ✗ icon, correct highlighted

**Timer:**
- Countdown (based on level: Easy=20min, Inter=65min, Hard=100min)
- Turns amber at 25% time left, red at 10%
- Auto-submit on timeout

**Question Navigator:**
- Small dot grid showing all question numbers
- Color coded: Unanswered (dim), Answered (green), Flagged (amber), Current (bright)
- Clickable to jump to any question

**JS Logic (`quiz.js`):**
- Track: `answers[]`, `timeSpent[]`, `flagged[]`
- On option click: record answer, advance automatically or on Next
- Timer using `setInterval`
- `submitQuiz()`: calculate score → pass to results engine

---

### SCREEN 6: Results + Explanations

**Purpose:** Show score, correct/incorrect breakdown, and AI explanations for every answer.

**Layout Sections:**

**6.1 Score Summary Banner:**
```
╔══════════════════════════════════════╗
║  🎯 Your Score: 58 / 75             ║
║  Percentage: 77.3%  |  Grade: B+    ║
║  Time Taken: 48 min 22 sec          ║
║  Correct: 58  Wrong: 12  Skipped: 5 ║
╚══════════════════════════════════════╝
```
- Large circular progress ring showing percentage
- Animated count-up numbers
- Color coded: Green ≥80%, Amber 60-79%, Red <60%

**6.2 Quick Stats Row:**
- Accuracy % | Fastest answer | Slowest answer | Flagged Q's reviewed

**6.3 Question Review List:**

Each question card:
```
┌─────────────────────────────────────────────┐
│ Q.12  [WRONG] ✗                             │
│                                             │
│ Question text here...                       │
│                                             │
│ Your Answer:   [B] Option text — ✗ WRONG   │
│ Correct Answer:[D] Option text — ✓ CORRECT │
│                                             │
│ 💡 Explanation:                             │
│ "Brief AI-generated explanation of why D   │
│  is correct and why B is wrong. Includes   │
│  the concept being tested..."              │
└─────────────────────────────────────────────┘
```
- Filter tabs: `All` | `Correct ✓` | `Wrong ✗` | `Skipped`
- Each card is collapsible for compact viewing
- Explanations are pre-generated by AI during quiz generation (stored with questions)
- "Save to Notes" button per question (stores in localStorage)

**6.4 CTA Row:**
- `See Full Analysis →` (goes to Screen 7)
- `Retry This Quiz` (re-shuffles same question set)
- `New Quiz` (back to Screen 1)

---

### SCREEN 7: Performance Analytics

**Purpose:** Deep AI-powered analysis of performance to give targeted improvement areas.

**Layout Sections:**

**7.1 Overall Performance Radar Chart (SVG/Canvas):**
- Dimensions: Conceptual Knowledge, Application, Analysis, Memory, Speed
- Current session vs. historical average (if past data exists)

**7.2 Module-wise Breakdown:**
- For each module attempted: Accuracy bar, weak subtopics list
- Color coded performance heatmap

**7.3 AI Improvement Report:**

AI prompt for this section:
```
System: You are an expert academic performance coach and learning strategist.

User: A student just completed a [LEVEL] quiz on [MODULE NAMES].

Results:
- Total Questions: [N]
- Correct: [C], Wrong: [W], Skipped: [S]
- Wrong Questions and their topics: [LIST]
- Time distribution: [slow/fast per section]

Generate a thorough, actionable improvement report with:
1. Key Strengths (2-3 areas)
2. Critical Weak Areas (with specific subtopics)
3. Root cause analysis of mistakes (conceptual gap? application gap? reading comprehension?)
4. Personalized 5-step study plan
5. Recommended question types to practice next
6. Motivational closing note

Format in clear sections. Be specific and constructive, not generic.
```

Display this as a structured card report with section headers, bullet points, and highlighted key phrases.

**7.4 Trend Graph (if history exists):**
- Line graph: past quiz scores over time per module
- Shows improvement trajectory

**7.5 Action Items Checklist:**
- AI generates 5 specific action items user can check off
- Stored in localStorage with completion state

---

### SCREEN 8: History — Past Attempts

**Purpose:** Let users revisit and review all past quiz attempts.

**UI Elements:**
- Header: *"Your Quiz History"*
- Filter + sort bar: By module, by level, by date, by score
- Attempt cards in reverse chronological order:
  ```
  ┌────────────────────────────────────────────┐
  │ 📘 Macroeconomics — Module 3              │
  │ Level: INTERMEDIATE  |  Score: 64/75      │
  │ Date: 18 Apr 2026   |  Duration: 52 min   │
  │ Accuracy: 85.3%  [████████░░]             │
  │                                            │
  │  [Review Answers]  [See Analysis]          │
  └────────────────────────────────────────────┘
  ```
- `Clear History` option (with confirmation dialog)
- Export as PDF option (optional enhancement)

**JS Logic (`storage.js`):**
```javascript
// Save attempt
const attempt = {
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  modules: [...selectedModules],
  level: "intermediate",
  questions: [...questionSet],
  answers: [...userAnswers],
  score: { correct, wrong, skipped, total },
  duration: timeElapsed,
  analytics: { weakTopics, strengths }
};
localStorage.setItem(`attempt_${attempt.id}`, JSON.stringify(attempt));
```

---

## 7. AI PROMPT SPECIFICATIONS

### 7.1 Question Generation Prompts

**EASY Level Prompt:**
```
System:
You are an expert academic quiz designer. Your job is to create high-quality, unique multiple-choice questions that test CONCEPTUAL UNDERSTANDING and FOUNDATIONAL KNOWLEDGE.

Before generating questions, deeply analyze the following topics using your full knowledge base to ensure maximum factual accuracy and pedagogical quality.

Rules:
- Each question must be unique — no two questions should test the same concept.
- Questions must be clear, unambiguous, and appropriately worded for a learner.
- All 4 options (A, B, C, D) must be plausible — avoid obviously wrong distractors.
- Include a brief explanation (2-3 sentences) for WHY the correct answer is right.
- Question types: definition-based, conceptual, true/false variations, fill-blank style.

User:
Generate exactly [20-25] unique easy-level MCQ questions for the following modules:
Modules: {{MODULE_NAMES}}
Subtopics: {{SUBTOPICS}}

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct": "B",
      "explanation": "B is correct because... A is wrong because...",
      "topic": "specific subtopic",
      "difficulty": "easy"
    }
  ]
}
```

**INTERMEDIATE Level Prompt:**
```
System:
You are a senior academic assessment designer specializing in applied and analytical questions. Before creating questions, thoroughly research and analyze the subject matter to maximize educational value.

Rules:
- All questions must be case-based, real-world scenario-based, or require application of concepts.
- Questions must go BEYOND memorization — they must require understanding and reasoning.
- Include scenario setups before the question where appropriate.
- Distractors must be carefully crafted to represent common misconceptions.
- 75 unique questions, NO duplicates or near-duplicates.
- Explanation must identify the reasoning flaw for wrong answers.

User:
Generate exactly 75 unique intermediate-level MCQ questions for:
Modules: {{MODULE_NAMES}}
Subtopics: {{SUBTOPICS}}

Return JSON in the same format as above.
```

**HARD Level Prompt:**
```
System:
You are an official exam paper designer who creates questions at the standard of professional certification bodies and university finals. Questions must mirror the style of actual official examinations.

Rules:
- Include paragraph-based comprehension questions (provide a 3-5 sentence passage, then ask questions about it).
- Include proof-reading type questions (identify errors, correct flawed statements).
- Include complex multi-step case studies (scenario → series of 3-5 questions).
- Include real-world impact analysis questions (policy, implementation, consequences).
- Questions must be examination-grade: precise, technical, rigorous.
- Generate between 75-100 questions, all unique.
- Explanations must be thorough — 4-6 sentences.

User:
Generate 75-100 unique hard-level exam-grade questions for:
Modules: {{MODULE_NAMES}}
Subtopics: {{SUBTOPICS}}

Return JSON in same format, adding:
- "passage": "optional paragraph for reading-based questions"
- "case_study_group": "optional group ID if part of a case study set"
```

---

### 7.2 API Call Structure (`api.js`)

```javascript
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = "YOUR_API_KEY_HERE"; // injected at runtime via settings modal

async function callClaude(systemPrompt, userPrompt, maxTokens = 8000) {
  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API call failed");
  }

  const data = await response.json();
  return data.content[0].text;
}

// For large question sets, use multiple chunked API calls and merge results
async function generateQuestionsChunked(prompt, targetCount) {
  const chunkSize = 25;
  const chunks = Math.ceil(targetCount / chunkSize);
  let allQuestions = [];
  
  for (let i = 0; i < chunks; i++) {
    const chunkPrompt = prompt + `\nGenerate questions ${i * chunkSize + 1} to ${Math.min((i + 1) * chunkSize, targetCount)}. Ensure no overlap with previously generated questions.`;
    const result = await callClaude(SYSTEM_PROMPT, chunkPrompt, 6000);
    const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
    allQuestions.push(...parsed.questions);
  }
  
  // Deduplicate by question text similarity
  return deduplicateQuestions(allQuestions);
}
```

---

## 8. DATA MODELS

### 8.1 Quiz Session Object
```javascript
{
  sessionId: "uuid",
  createdAt: 1714000000000,
  syllabus: "raw text content",
  modules: [
    {
      id: "mod_1",
      name: "String",
      description: "String",
      subtopics: ["String"]
    }
  ],
  selectedModules: ["mod_1", "mod_2"],
  level: "easy" | "intermediate" | "hard",
  questions: [QuestionObject],
  status: "pending" | "active" | "completed"
}
```

### 8.2 Question Object
```javascript
{
  id: "q_12",
  type: "mcq" | "case_study" | "paragraph" | "proofreading",
  passage: "optional paragraph text",
  case_study_group: "optional group id",
  question: "Question text",
  options: { A: "", B: "", C: "", D: "" },
  correct: "A" | "B" | "C" | "D",
  explanation: "Full explanation text",
  topic: "specific subtopic name",
  difficulty: "easy" | "intermediate" | "hard"
}
```

### 8.3 Attempt Result Object
```javascript
{
  attemptId: "uuid",
  sessionId: "uuid",
  completedAt: 1714000000000,
  duration: 2940, // seconds
  level: "intermediate",
  moduleNames: ["Module A", "Module B"],
  answers: [
    {
      questionId: "q_12",
      selected: "B",
      correct: "D",
      isCorrect: false,
      timeSpent: 45, // seconds
      flagged: true
    }
  ],
  score: {
    correct: 58,
    wrong: 12,
    skipped: 5,
    total: 75,
    percentage: 77.3
  },
  weakTopics: ["Topic X", "Topic Y"],
  strongTopics: ["Topic Z"],
  aiAnalysis: "Full AI analysis text"
}
```

---

## 9. KEY JAVASCRIPT MODULES

### 9.1 `storage.js`
```javascript
const Storage = {
  saveAttempt(attempt) {
    const key = `qf_attempt_${attempt.attemptId}`;
    localStorage.setItem(key, JSON.stringify(attempt));
    this._updateIndex(attempt.attemptId);
  },
  getAllAttempts() {
    const index = JSON.parse(localStorage.getItem('qf_index') || '[]');
    return index.map(id => JSON.parse(localStorage.getItem(`qf_attempt_${id}`))).filter(Boolean);
  },
  deleteAttempt(id) { localStorage.removeItem(`qf_attempt_${id}`); },
  saveAPIKey(key) { localStorage.setItem('qf_api_key', key); },
  getAPIKey() { return localStorage.getItem('qf_api_key'); },
  clearAll() { 
    Object.keys(localStorage).filter(k => k.startsWith('qf_')).forEach(k => localStorage.removeItem(k)); 
  }
};
```

### 9.2 `analytics.js`
```javascript
function computeAnalytics(attempt) {
  const byTopic = {};
  attempt.answers.forEach(ans => {
    const q = attempt.questions.find(q => q.id === ans.questionId);
    if (!byTopic[q.topic]) byTopic[q.topic] = { correct: 0, total: 0 };
    byTopic[q.topic].total++;
    if (ans.isCorrect) byTopic[q.topic].correct++;
  });
  
  const weakTopics = Object.entries(byTopic)
    .filter(([_, v]) => v.correct / v.total < 0.6)
    .map(([k]) => k);
  
  const strongTopics = Object.entries(byTopic)
    .filter(([_, v]) => v.correct / v.total >= 0.8)
    .map(([k]) => k);
  
  return { byTopic, weakTopics, strongTopics };
}
```

### 9.3 Router (`app.js`)
```javascript
const Router = {
  screens: ['upload', 'modules', 'level', 'loading', 'quiz', 'results', 'analytics', 'history'],
  current: 'upload',
  navigate(screen, data = {}) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screen}`).classList.add('active');
    this.current = screen;
    window.dispatchEvent(new CustomEvent('route', { detail: { screen, data } }));
  }
};
```

---

## 10. SETTINGS MODAL

Accessible via gear icon in top nav.

**Settings options:**
- **API Key Input:** Text field to enter Claude API key (stored in localStorage, never sent anywhere except Anthropic)
- **Default Level:** Dropdown to set default difficulty
- **Auto-advance:** Toggle to auto-move to next question after answering
- **Show Timer:** Toggle timer visibility
- **Question Shuffle:** Toggle to reshuffle on retry
- **Theme:** Light / Dark / System (Dark is default)
- **Clear History:** Danger zone button with confirmation

---

## 11. RESPONSIVE DESIGN BREAKPOINTS

```css
/* Mobile first */
@media (min-width: 640px)  { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1440px) { /* Wide */ }
```

Key layout changes:
- Module grid: 1col → 2col → 3col
- Level cards: stacked → 3-column row
- Quiz: single column, options full width on mobile
- Analytics: single column charts on mobile, side-by-side on desktop
- Navigation: bottom tab bar on mobile, left sidebar on desktop

---

## 12. ANIMATIONS & MICRO-INTERACTIONS

| Element | Animation |
|---|---|
| Screen transitions | Slide + fade (translateX + opacity) |
| Module cards appear | Staggered fade-up (animation-delay per card) |
| Answer option select | Spring scale (transform: scale(0.97) → 1.02 → 1) |
| Score reveal | Count-up animation + progress ring draw |
| Loading steps | Sequential fade-in with checkmark morph |
| Quiz progress bar | Smooth width transition |
| Wrong answer reveal | Shake animation |
| Correct answer reveal | Pulse + glow animation |
| History cards | Slide in from right on load |

---

## 13. ERROR HANDLING

| Error | User-facing Message | Recovery |
|---|---|---|
| Invalid API key | "Invalid API key. Check Settings → API Key." | Open settings modal |
| API rate limit | "Too many requests. Please wait 30 seconds." | Auto-retry countdown |
| Empty syllabus | "Please add more content (min 100 characters)." | Highlight input |
| JSON parse failure | "Question generation failed. Retrying…" | Auto-retry once |
| Network error | "Connection issue. Check your internet." | Retry button |
| No modules found | "Could not detect modules. Try more detailed content." | Manual input fallback |
| localStorage full | "Storage full. Clear old attempts to continue." | Link to history/clear |

---

## 14. ACCESSIBILITY

- All interactive elements keyboard accessible (`tabIndex`, `Enter`/`Space` handlers)
- ARIA labels on icon buttons
- Sufficient color contrast (WCAG AA minimum)
- Focus ring visible on keyboard navigation
- Screen reader announcements for score reveal and answer validation
- Reduced-motion media query: disable non-essential animations

---

## 15. IMPLEMENTATION ORDER (Recommended)

1. **Phase 1 — Shell:** `index.html` structure, `style.css` design system, router
2. **Phase 2 — Upload:** File upload + paste UI, PDF.js integration, text extraction
3. **Phase 3 — API Layer:** `api.js` with Claude integration, module extraction prompt
4. **Phase 4 — Module + Level Screens:** Dynamic module cards, level selection UI
5. **Phase 5 — Quiz Engine:** Question generation prompts, quiz interface, timer, navigator
6. **Phase 6 — Results:** Score calculation, answer review cards, explanations display
7. **Phase 7 — Analytics:** AI analysis prompt, charts, improvement report
8. **Phase 8 — History:** localStorage CRUD, history browser, filtering
9. **Phase 9 — Polish:** Animations, responsive fixes, error handling, settings modal
10. **Phase 10 — Testing:** Edge cases, large syllabi, API limits, mobile testing

---

## 16. OPTIONAL ENHANCEMENTS (V2)

- **Flashcard mode:** Convert questions to spaced-repetition flashcards
- **Multiplayer:** Shared quiz rooms via simple WebSocket or Supabase
- **Export:** Download quiz results as PDF certificate
- **Voice mode:** Text-to-speech for questions (Web Speech API)
- **Bookmarks:** Save specific questions as "study cards"
- **Custom Timer:** User-defined time limits
- **Progress badges:** Achievement system (10-quiz streak, 90%+ score, etc.)
- **OpenAI fallback:** Support both Claude and GPT-4o with model switcher

---

*This blueprint is complete and implementation-ready. Each screen, data model, API prompt, and interaction is fully specified. Hand this to any developer (or AI coding assistant) to build QuizForge from scratch using only HTML, CSS, and JavaScript.*