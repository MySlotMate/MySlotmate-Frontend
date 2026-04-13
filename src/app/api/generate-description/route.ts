import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerateContentResult,
  type GenerativeModel,
} from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const generateDescriptionSchema = z.object({
  title: z.string().trim().max(120).optional().default(""),
  hookLine: z.string().trim().max(240).optional().default(""),
  mood: z.string().trim().max(80).optional().default(""),
  location: z.string().trim().max(240).optional().default(""),
  durationMinutes: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().positive().max(24 * 60).optional(),
  ),
  additional: z.string().trim().max(2000).optional().default(""),
});

type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>;

export async function POST(req: Request) {
  const rawBody: unknown = await req.json();
  const parsedBody = generateDescriptionSchema.safeParse(rawBody);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const descriptionInput = parsedBody.data;
  const {
    title,
    hookLine,
    mood,
    location,
    durationMinutes,
    additional,
  } = descriptionInput;

  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    const fallback = generateFallbackDescription(descriptionInput);
    return NextResponse.json({ description: fallback, fallback: true });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an assistant that writes clear, engaging listings for local experiences.

Title: "${title}"
Hook line: "${hookLine}"
Mood: "${mood}"
Location: "${location}"
Duration (minutes): "${durationMinutes ?? ""}"
Additional info: "${additional}"

Write a friendly, descriptive paragraph (40-120 words) describing what guests will experience, what they'll learn or do, and what makes it special. Avoid sharing contact details or asking for off-platform payments. Output only the description text without any surrounding quotes or JSON.`;

    const result = await callModelWithRetry(model, prompt, 3);
    const description = result.response.text().trim();

    return NextResponse.json({ description });
  } catch (error) {
    console.error("generate-description error (final)", error);

    const fallback = generateFallbackDescription(descriptionInput);
    return NextResponse.json({ description: fallback, fallback: true });
  }
}

async function callModelWithRetry(
  model: GenerativeModel,
  prompt: string,
  maxAttempts = 3,
): Promise<GenerateContentResult> {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      const retryAfterMs = getRetryAfterMs(error);

      if (attempt < maxAttempts && (status === 429 || status === "429")) {
        const baseDelay = 1000;
        const backoff = baseDelay * Math.pow(2, attempt - 1);
        const waitMs = retryAfterMs ?? backoff;

        console.warn(
          `Model call rate-limited (status=${status}), attempt ${attempt}/${maxAttempts}. Waiting ${waitMs}ms before retry.`,
        );

        await sleep(waitMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Model generation failed after retrying.");
}

function getErrorStatus(error: unknown): number | string | null {
  if (error instanceof GoogleGenerativeAIFetchError && error.status != null) {
    return error.status;
  }

  if (!isRecord(error)) {
    return null;
  }

  const directStatus = error.status;
  if (typeof directStatus === "number" || typeof directStatus === "string") {
    return directStatus;
  }

  const response = error.response;
  if (isRecord(response)) {
    const responseStatus = response.status;
    if (
      typeof responseStatus === "number" ||
      typeof responseStatus === "string"
    ) {
      return responseStatus;
    }

    const responseCode = response.code;
    if (typeof responseCode === "number" || typeof responseCode === "string") {
      return responseCode;
    }
  }

  const directCode = error.code;
  if (typeof directCode === "number" || typeof directCode === "string") {
    return directCode;
  }

  return null;
}

function getRetryAfterMs(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  const response = error.response;
  const headers = isRecord(response) ? response.headers : error.headers;
  const retryAfter = getHeaderValue(headers, "retry-after");

  if (retryAfter == null) {
    return null;
  }

  const retryAfterSeconds = Number.parseInt(retryAfter, 10);
  return Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds * 1000;
}

function getHeaderValue(headers: unknown, name: string): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }

  if (!isRecord(headers)) {
    return null;
  }

  const directValue = headers[name] ?? headers[name.toLowerCase()];

  if (typeof directValue === "string") {
    return directValue;
  }

  if (typeof directValue === "number") {
    return String(directValue);
  }

  if (isUnknownArray(directValue)) {
    const firstValue = directValue[0];
    return typeof firstValue === "string" ? firstValue : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function generateFallbackDescription({
  title,
  hookLine,
  mood,
  location,
  durationMinutes,
  additional,
}: GenerateDescriptionInput) {
  const parts: string[] = [];

  if (title) {
    parts.push(`${title.trim()}.`);
  }

  if (hookLine) {
    parts.push(hookLine.trim());
  }

  if (mood) {
    parts.push(`This is a ${mood} experience.`);
  }

  if (location) {
    parts.push(`Meet at ${location}.`);
  }

  if (durationMinutes) {
    const roundedHours = Math.round(durationMinutes / 60);
    const durationLabel =
      roundedHours >= 1 ? `${roundedHours}h` : `${durationMinutes}m`;
    parts.push(`About ${durationLabel} long.`);
  }

  if (additional) {
    parts.push(additional.trim());
  }

  const lead = parts.length
    ? parts.join(" ")
    : "Join us for a memorable local experience.";
  const body =
    "You'll explore what makes this activity special, learn practical skills, and connect with like-minded guests in a relaxed, well-organized setting.";

  return `${lead} ${body}`;
}
