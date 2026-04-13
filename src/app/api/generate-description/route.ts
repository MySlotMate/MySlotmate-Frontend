import { NextResponse } from 'next/server';

/* eslint-disable */
// @ts-ignore - types for GoogleGenerativeAI may not be available
import { GoogleGenerativeAI } from "@google/generative-ai";
/* eslint-enable */

export async function POST(req: Request) {
  const body = await req.json();
  const { title = '', hookLine = '', mood = '', location = '', durationMinutes, additional = '' } = body;

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback: return a template-based description if no API key configured
    const fallback = generateFallbackDescription({ title, hookLine, mood, location, durationMinutes, additional });
    return NextResponse.json({ description: fallback, fallback: true });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey as string);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an assistant that writes clear, engaging listings for local experiences.

Title: "${title}"
Hook line: "${hookLine}"
Mood: "${mood}"
Location: "${location}"
Duration (minutes): "${durationMinutes ?? ''}"
Additional info: "${additional}"

Write a friendly, descriptive paragraph (40-120 words) describing what guests will experience, what they'll learn or do, and what makes it special. Avoid sharing contact details or asking for off-platform payments. Output only the description text without any surrounding quotes or JSON.`;

    // Try the model with retries/backoff for transient errors (e.g., 429)
    const result = await callModelWithRetry(model, prompt, 3);
    const text = result?.response?.text?.() ?? '';

    // Trim and return the text
    const description = text.trim();

    return NextResponse.json({ description });
  } catch (err) {
    console.error('generate-description error (final)',  err);

    // If the AI call fails (quota, rate-limit after retries, etc.), return a safe template fallback so the user still gets value.
    const fallback = generateFallbackDescription({ title, hookLine, mood, location, durationMinutes, additional });
    return NextResponse.json({ description: fallback, fallback: true });
  }
}

async function callModelWithRetry(model: any, prompt: string, maxAttempts = 3) {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      // If it's a 429/rate-limit, respect Retry-After if present, else exponential backoff
      const status = err?.status ?? err?.response?.status ?? err?.code;

      // Attempt to get Retry-After header if available
      let retryAfterSec: number | null = null;
      try {
        const rawHeaders = err?.response?.headers || err?.headers;
        if (rawHeaders) {
          // rawHeaders might be a Headers-like object or plain object
          const getHeader = (h: any, name: string) => (typeof h.get === 'function' ? h.get(name) : h[name] || h[name.toLowerCase()]);
          const ra = getHeader(rawHeaders, 'retry-after');
          if (ra) retryAfterSec = parseInt(String(ra), 10) || null;
        }
      } catch (e) {
        // ignore header parse errors
      }

      if (attempt < maxAttempts && (status === 429 || status === '429')) {
        const baseDelay = 1000; // 1s
        const backoff = baseDelay * Math.pow(2, attempt - 1);
        const waitMs = (retryAfterSec ? retryAfterSec * 1000 : backoff);
        console.warn(`Model call rate-limited (status=${status}), attempt ${attempt}/${maxAttempts}. Waiting ${waitMs}ms before retry.`);
        await sleep(waitMs);
        continue; // retry
      }

      // For non-retryable or final attempt, rethrow so upper-level catches and returns fallback
      throw err;
    }
  }
}

function generateFallbackDescription({ title, hookLine, mood, location, durationMinutes, additional }: { title?: string; hookLine?: string; mood?: string; location?: string; durationMinutes?: number; additional?: string; }) {
  const parts: string[] = [];
  if (title) parts.push(`${title.trim()}.`);
  if (hookLine) parts.push(hookLine.trim());
  if (mood) parts.push(`This is a ${mood} experience.`);
  if (location) parts.push(`Meet at ${location}.`);
  if (durationMinutes) parts.push(`About ${Math.round(durationMinutes / 60) >= 1 ? `${Math.round(durationMinutes / 60)}h` : `${durationMinutes}m`} long.`);
  if (additional) parts.push(additional.trim());

  // Build a friendly paragraph
  const lead = parts.length ? parts.join(' ') : 'Join us for a memorable local experience.';
  const body = `You’ll explore what makes this activity special, learn practical skills, and connect with like-minded guests in a relaxed, well-organized setting.`;

  return `${lead} ${body}`;
}
