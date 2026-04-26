import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// #14 — Helmet security headers
app.use(helmet());

// #1 — Allow localhost for dev, and allow any origin for production deployment 
// (Since the API key is secured on the backend and we have rate limiting)
app.use(cors());

app.use(express.json({ limit: '2mb' })); // tightened from 10mb

// #3 — Rate limiting (10 requests per minute per IP)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a minute.' }
});
app.use('/api/', apiLimiter);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("GEMINI_API_KEY missing from environment variables.");
}
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// #4 — Helper: safely parse JSON from AI response with retry
async function safeGenerate(model: any, prompt: string, maxRetries = 2): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            
            if (responseText.includes('```json')) {
                responseText = responseText.replace(/```json|```/g, '').trim();
            }
            
            return JSON.parse(responseText);
        } catch (err: any) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to get valid JSON after ${maxRetries + 1} attempts: ${err.message}`);
            }
            // Wait 1s before retrying
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

// #2 — Input validation helpers
function validateText(text: any): string | null {
    if (typeof text !== 'string') return 'text must be a string';
    if (text.length < 100) return 'text must be at least 100 characters';
    if (text.length > 50000) return 'text must be under 50,000 characters';
    return null;
}

function validateModules(modules: any): string | null {
    if (!Array.isArray(modules)) return 'modules must be an array';
    if (modules.length === 0) return 'at least one module is required';
    if (modules.length > 20) return 'too many modules (max 20)';
    return null;
}

function validateLevel(level: any): string | null {
    if (!['easy', 'intermediate', 'hard'].includes(level)) return 'level must be easy, intermediate, or hard';
    return null;
}

function validateAttempt(attempt: any): string | null {
    if (!attempt || typeof attempt !== 'object') return 'attempt data is required';
    if (!attempt.score || typeof attempt.score !== 'object') return 'score data is required';
    if (typeof attempt.score.total !== 'number') return 'score.total must be a number';
    if (!Array.isArray(attempt.resultsReview)) return 'resultsReview must be an array';
    return null;
}

app.post('/api/modules', async (req, res) => {
    try {
        const { text } = req.body;

        // #2 — Validate input
        const err = validateText(text);
        if (err) return res.status(400).json({ error: err });

        if (!genAI) throw new Error("API key not configured");
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `
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
${text.substring(0, 30000)}`;  // cap input to first 30k chars
        
        const data = await safeGenerate(model, prompt);
        res.json(data);
    } catch (error: any) {
        // #13 — Only log the message, not the full error object
        console.error('Module extraction error:', error.message);
        res.status(500).json({ error: error.message || "Failed to process syllabus" });
    }
});

app.post('/api/generate', async (req, res) => {
    try {
        const { modules, level, chunkIndex, totalChunks } = req.body;
        
        // #2 — Validate inputs
        const modErr = validateModules(modules);
        if (modErr) return res.status(400).json({ error: modErr });
        const lvlErr = validateLevel(level);
        if (lvlErr) return res.status(400).json({ error: lvlErr });

        if (!genAI) throw new Error("API key not configured");
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const safeChunkIndex = parseInt(chunkIndex) || 1;
        const safeTotalChunks = parseInt(totalChunks) || 1;
        
        let systemMsg = "";
        
        if (level === 'easy') {
            systemMsg = `System: You are an expert academic quiz designer. Produce exactly 10 easy-level unique MCQ questions testing conceptual understanding. All 4 options (A,B,C,D) must be plausible. Provide a brief explanation. Return ONLY valid JSON format.`;
        } else if (level === 'intermediate') {
            systemMsg = `System: You are a senior academic assessment designer. Produce exactly 10 applied and analytical intermediate-level unique MCQ questions. Case-based or real-world scenario. Return ONLY valid JSON format.`;
        } else {
            systemMsg = `System: You are an official exam paper designer. Produce exactly 10 hard-level exam-grade unique questions including case studies or paragraph comprehension. Return ONLY valid JSON format.`;
        }

        // Sanitize module names to prevent prompt injection
        const sanitizedModules = modules.map((m: any) => ({
            id: String(m.id || '').substring(0, 50),
            name: String(m.name || '').substring(0, 200),
            description: String(m.description || '').substring(0, 500),
            subtopics: Array.isArray(m.subtopics) ? m.subtopics.map((s: any) => String(s).substring(0, 200)).slice(0, 10) : []
        }));
        
        const prompt = `${systemMsg}
This is BATCH ${safeChunkIndex} of ${safeTotalChunks} for this test.
Generate exactly 10 unique questions covering random parts of the following modules. DO NOT repeat standard questions from previous batches.
${JSON.stringify(sanitizedModules)}

Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Question text",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct": "B",
      "explanation": "...",
      "topic": "specific subtopic",
      "difficulty": "${level}"
    }
  ]
}`;
        
        const data = await safeGenerate(model, prompt);
        res.json(data);
    } catch (error: any) {
        console.error('Quiz generation error:', error.message);
        res.status(500).json({ error: error.message || "Failed to generate quiz" });
    }
});

app.post('/api/analytics', async (req, res) => {
    try {
        const { attempt } = req.body;
        
        // #2 — Validate input
        const err = validateAttempt(attempt);
        if (err) return res.status(400).json({ error: err });

        if (!genAI) throw new Error("API key not configured");
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build topic-wise breakdown — #8 division by zero guard
        const topicStats: Record<string, {correct:number, total:number, wrongQs:string[]}> = {};
        (attempt.resultsReview || []).forEach((q: any) => {
            const topic = String(q.topic || 'General').substring(0, 100);
            if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, wrongQs: [] };
            topicStats[topic].total++;
            if (q.isCorrect) topicStats[topic].correct++;
            else topicStats[topic].wrongQs.push(String(q.question || '').substring(0, 80));
        });

        const topicBreakdown = Object.entries(topicStats).map(([topic, stats]) => {
            const pct = stats.total > 0 ? Math.round(stats.correct/stats.total*100) : 0;
            return `- **${topic}**: ${stats.correct}/${stats.total} correct (${pct}%)${stats.wrongQs.length > 0 ? ' — Missed: ' + stats.wrongQs.map(q => `"${q}"`).join(', ') : ''}`;
        }).join('\n');

        const durationStr = `${Math.floor((attempt.duration || 0) / 60)} min ${(attempt.duration || 0) % 60} sec`;
        const scorePct = attempt.score.total > 0 ? Math.round(attempt.score.correct / attempt.score.total * 100) : 0;
        
        const prompt = `You are an expert academic performance coach and learning strategist. A student just completed a quiz and needs a detailed, actionable, and easy-to-understand performance report.

## Student's Quiz Results

| Metric | Value |
|--------|-------|
| Level | ${String(attempt.level || 'UNKNOWN').toUpperCase()} |
| Total Questions | ${attempt.score.total} |
| Correct Answers | ${attempt.score.correct} |
| Wrong Answers | ${attempt.score.wrong} |
| Skipped | ${attempt.score.skipped} |
| Score Percentage | ${scorePct}% |
| Time Taken | ${durationStr} |

## Topic-wise Breakdown
${topicBreakdown}

---

Generate a comprehensive, well-formatted markdown report with the following EXACT sections. Use headers, bullet points, bold text, and tables to make it visually clear. Write in a friendly, encouraging but honest tone — like a personal tutor talking directly to the student.

## 📊 Score Overview
A brief 2-3 sentence summary of the overall result. Mention the percentage, whether it's good/needs work, and the time taken.

## 💪 Your Strengths
List 2-3 specific areas where the student performed well with the topic names and percentages. Explain WHY these are strengths (e.g., "Your conceptual understanding of X is solid").

## ⚠️ Areas That Need Attention
List ALL weak topics (below 70% accuracy) with:
- The topic name and accuracy percentage
- One specific example question they got wrong (from the data above)
- A brief explanation of the likely knowledge gap

## 🔍 Root Cause Analysis
Analyze the pattern of mistakes. Categorize them into:
- **Conceptual Gaps**: Fundamental misunderstanding of core concepts
- **Application Errors**: Knows theory but can't apply it
- **Careless Mistakes**: Likely knew the answer but selected wrong
- **Time Pressure**: Questions skipped or rushed

## 📝 Your Personalized 5-Step Study Plan
Create a numbered, actionable study plan. Each step should include:
1. What to study
2. How to study it (specific technique)
3. How long to spend on it

## 🎯 Recommended Next Steps
- What difficulty level to attempt next
- Which specific topics to focus on
- What type of questions to practice

## 💬 Final Note
A short motivational closing (2-3 sentences). Be genuine and encouraging.

Return ONLY the raw markdown. Do NOT wrap in code blocks.`;
        
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        res.json({ markdown: responseText });
    } catch (error: any) {
        console.error('Analytics error:', error.message);
        res.status(500).json({ error: error.message || "Failed to generate analysis" });
    }
});

export default app;
