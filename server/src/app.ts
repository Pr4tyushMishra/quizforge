import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';


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

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.warn("OPENROUTER_API_KEY missing from environment variables.");
}

// #4 — Helper: safely fetch from OpenRouter and parse JSON
async function safeGenerate(systemMessage: string, userPrompt: string, maxRetries = 2): Promise<any> {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173", // Optional context
        "X-Title": "QuizForge"
    };
    
    // Using OpenRouter free model
    const body = {
        model: "openai/gpt-oss-120b:free",
        messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userPrompt }
        ]
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter HTTP error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            let responseText = data.choices[0].message.content;
            
            // Remove markdown codeblock wrapper if present
            if (responseText.includes('```json')) {
                responseText = responseText.replace(/```json|```/g, '').trim();
            }
            
            return JSON.parse(responseText);
        } catch (err: any) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to get valid JSON from OpenRouter after ${maxRetries + 1} attempts: ${err.message}`);
            }
            // Wait 1s before retrying
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

// --- Validation Helpers ---
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

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        hasKey: !!process.env.OPENROUTER_API_KEY,
        env: process.env.NODE_ENV
    });
});

app.post('/api/modules', async (req, res) => {
    try {
        const { text } = req.body;
        const err = validateText(text);
        if (err) return res.status(400).json({ error: err });
        if (!process.env.OPENROUTER_API_KEY) throw new Error("API key not configured");
        
        const systemMsg = "You are an expert academic curriculum analyzer.";
        const prompt = `Analyze the following syllabus/topic content and extract all distinct modules or chapters. For each module, provide:
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
${text.substring(0, 30000)}`;

        const data = await safeGenerate(systemMsg, prompt);
        res.json(data);
    } catch (error: any) {
        console.error('Module extraction error:', error.message);
        res.status(500).json({ error: error.message || "Failed to process syllabus" });
    }
});

app.post('/api/generate', async (req, res) => {
    try {
        const { modules, level } = req.body;
        
        const modErr = validateModules(modules);
        if (modErr) return res.status(400).json({ error: modErr });
        const lvlErr = validateLevel(level);
        if (lvlErr) return res.status(400).json({ error: lvlErr });

        if (!process.env.OPENROUTER_API_KEY) throw new Error("API key not configured");
        
        let systemMsg = "";
        let count = 20;
        
        if (level === 'easy') {
            systemMsg = `You are an expert academic quiz designer. Produce exactly 20 easy-level unique MCQ questions testing conceptual understanding. All 4 options (A,B,C,D) must be plausible. Provide a brief explanation. Return ONLY valid JSON format.`;
            count = 20;
        } else if (level === 'intermediate') {
            systemMsg = `You are a senior academic assessment designer. Produce exactly 40 applied and analytical intermediate-level unique MCQ questions. Case-based or real-world scenario. Return ONLY valid JSON format.`;
            count = 40;
        } else {
            systemMsg = `You are an official exam paper designer. Produce exactly 20 hard-level exam-grade unique questions including case studies or paragraph comprehension. Return ONLY valid JSON format.`;
            count = 20;
        }

        const sanitizedModules = modules.map((m: any) => ({
            id: String(m.id || '').substring(0, 50),
            name: String(m.name || '').substring(0, 200),
            description: String(m.description || '').substring(0, 500),
            subtopics: Array.isArray(m.subtopics) ? m.subtopics.map((s: any) => String(s).substring(0, 200)).slice(0, 10) : []
        }));
        
        const prompt = `Generate exactly ${count} unique questions for the following modules:
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
        
        const data = await safeGenerate(systemMsg, prompt);
        res.json(data);
    } catch (error: any) {
        console.error('Quiz generation error:', error.message);
        res.status(500).json({ error: error.message || "Failed to generate quiz" });
    }
});

app.post('/api/analytics', async (req, res) => {
    try {
        const { attempt } = req.body;
        const err = validateAttempt(attempt);
        if (err) return res.status(400).json({ error: err });

        if (!process.env.OPENROUTER_API_KEY) throw new Error("API key not configured");
        
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
        
        const systemMsg = "You are an expert academic performance coach and learning strategist.";
        const prompt = `A student just completed a quiz and needs a detailed, actionable, and easy-to-understand performance report.

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
        
        const url = "https://openrouter.ai/api/v1/chat/completions";
        const headers = {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        };
        const body = {
            model: "openai/gpt-oss-120b:free",
            messages: [
                { role: "system", content: systemMsg },
                { role: "user", content: prompt }
            ]
        };

        const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter HTTP error ${response.status}: ${errText}`);
        }
        const data = await response.json();
        let responseText = data.choices[0].message.content;
        
        res.json({ markdown: responseText });
    } catch (error: any) {
        console.error('Analytics error:', error.message);
        res.status(500).json({ error: error.message || "Failed to generate analysis" });
    }
});

export default app;
