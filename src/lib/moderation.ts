/**
 * Content Moderation Utility
 * Uses Gemini API to detect malicious content patterns
 * Returns a risk score (1-10) based on detected keywords and patterns
 */

/* eslint-disable */
// @ts-ignore - GoogleGenerativeAI types not fully resolved
import { GoogleGenerativeAI } from "@google/generative-ai";
/* eslint-enable */

export interface ModerationResult {
  score: number; // 1-10 scale
  isBlocked: boolean; // true if score > 5
  categories: {
    contactSharing: number;
    payments: number;
    unsafeMeetups: number;
    dating: number;
    sexual: number;
    manipulation: number;
    profanity: number;
  };
  flaggedKeywords: string[];
  details: string;
}

interface GeminiCategoryScores {
  contactSharing?: number;
  payments?: number;
  unsafeMeetups?: number;
  dating?: number;
  sexual?: number;
  manipulation?: number;
  profanity?: number;
}

interface GeminiResponse {
  riskLevel?: number;
  categories?: GeminiCategoryScores;
  explanation?: string;
}

const MALICIOUS_PATTERNS = {
  contactSharing: [
    "whatsapp me",
    "ping me",
    "dm me",
    "telegram",
    "signal app",
    "insta id",
    "instagram @",
    "snap",
    "snapchat",
    "contact me",
    "text me",
    "call me",
    "share number",
    "drop your number",
    "email me",
    "personal email",
    "connect privately",
  ],
  payments: [
    "advance payment",
    "send advance",
    "pay directly",
    "pay outside",
    "cash only",
    "no platform fee",
    "discount if direct",
    "transfer money",
    "wire transfer",
    "crypto payment",
    "bitcoin",
    "usdt",
    "wallet transfer",
    "recharge",
    "gift card",
    "voucher",
  ],
  unsafeMeetups: [
    "come alone",
    "private meetup",
    "secret location",
    "hidden place",
    "no public place",
    "my flat",
    "my room",
    "my apartment",
    "hotel room",
    "lodge",
    "late night meetup",
    "after party",
    "no one will know",
    "one night stand",
  ],
  dating: [
    "looking for partner",
    "looking for girl",
    "looking for guy",
    "hangout date",
    "casual date",
    "serious relationship",
    "long term",
    "short term",
    "fwb",
    "friends with benefits",
    "lonely",
    "need company",
    "single",
    "vibe match",
    "chemistry",
    "soulmate",
  ],
  sexual: [
    "hookup",
    "one night stand",
    "make out",
    "cuddle",
    "intimacy",
    "physical connection",
    "adult fun",
    "open minded",
    "bold girl",
    "bold guy",
    "no boundaries",
    "chill night",
    "private fun",
    "satisfaction",
    "casual sex",
    "casual hookup",
    "no strings attached",
    "nsa",
    "arrangements",
    "sugar daddy",
    "sugar mama",
    "sugar baby",
    "escort",
    "call girl",
    "gigolo",
    "companion",
    "nsfw",
    "x-rated",
    "adult content",
    "erotic",
    "sensual",
    "passionate night",
    "steamy",
    "flirty",
    "seduction",
    "seduce",
    "tempted",
    "moan",
    "orgasm",
    "horny",
    "aroused",
    "wet",
    "hard",
    "penetrate",
    "cock",
    "pussy",
    "ass",
    "tits",
    "boobs",
    "breasts",
    "blow job",
    "blowjob",
    "handjob",
    "cumming",
    "cum",
    "creampie",
    "gangbang",
    "threesome",
    "orgy",
    "anal",
    "69",
    "fwb",
    "friends with benefits",
    "benefits",
    "booty call",
    "quickie",
    "kinky",
    "bondage",
    "bdsm",
    "dom",
    "sub",
    "dominant",
    "submissive",
    "tied up",
    "spank",
    "whip",
    "roleplay",
    "roleplay sex",
    "naughty",
    "dirty talk",
    "pillow talk",
    "sexting",
    "sending pics",
    "nudes",
    "naked photos",
    "cam show",
    "strip",
    "stripper",
    "pole dance",
    "massage parlor",
    "happy ending",
    "sexual favor",
    "sexual service",
    "paid sex",
    "prostitute",
    "transactional sex",
    "paid companion",
  ],
  manipulation: [
    "trust me",
    "don't worry",
    "safe with me",
    "no questions asked",
    "keep it secret",
    "no rules",
    "don't tell anyone",
    "be discreet",
    "exclusive invite",
    "limited people only",
    "special access",
  ],
  profanity: [
    "fuck",
    "shit",
    "asshole",
    "bastard",
    "bitch",
    "damn",
    "dammit",
    "bullshit",
    "crap",
    "piss",
    "dickhead",
    "motherfucker",
    "sonofabitch",
    "hell",
    "goddamn",
    "motherfucking",
    "shitty",
    "bitchy",
    "crappy",
    "fucked",
    "fcuk",
    "f**k",
    "sh*t",
    "a**hole",
  ],
};

/**
 * Analyzes text for malicious content using a local pattern matcher
 * Returns a score based on detected keywords
 */
function analyzePatterns(text: string): ModerationResult {
  const lowerText = text.toLowerCase();
  const categories = {
    contactSharing: 0,
    payments: 0,
    unsafeMeetups: 0,
    dating: 0,
    sexual: 0,
    manipulation: 0,
    profanity: 0,
  };

  const flaggedKeywords: Set<string> = new Set<string>();

  // Check each category for matches
  Object.entries(MALICIOUS_PATTERNS).forEach(([category, keywords]) => {
    keywords.forEach((keyword) => {
      // Case-insensitive word boundary matching
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "gi",
      );
      const matches = lowerText.match(regex);
      const matchCount = matches ? matches.length : 0;
      if (matchCount > 0) {
        categories[category as keyof typeof categories] += matchCount;
        flaggedKeywords.add(keyword);
      }
    });
  });

  // Calculate weighted score
  const weights: Record<string, number> = {
    profanity: 5,
    sexual: 5,
    unsafeMeetups: 2.5,
    payments: 2,
    dating: 1.5,
    contactSharing: 1.5,
    manipulation: 1,
  };

  let totalScore = 0;
  Object.entries(categories).forEach(([category, count]) => {
    totalScore += count * (weights[category] ?? 1);
  });

  // Normalize to 1-10 scale
  // Every 2 points = 1 on the scale
  let score = Math.min(10, Math.ceil(totalScore / 2));
  score = Math.max(1, score);

  return {
    score,
    isBlocked: score > 3,
    categories,
    flaggedKeywords: Array.from(flaggedKeywords),
    details: `Detected ${flaggedKeywords.size} malicious keyword(s) across ${
      Object.values(categories).filter((c) => c > 0).length
    } category/categories.`,
  };
}

/**
 * Main moderation function - uses pattern matching (primary) + Gemini (secondary if available)
 * Falls back to pattern matching if Gemini API is unavailable
 */
export async function analyzeContent(text: string): Promise<ModerationResult> {
  // First pass: pattern matching (fast, local)
  const patternResult = analyzePatterns(text);

  // If score is already very high, return immediately
  if (patternResult.score >= 7) {
    return patternResult;
  }

  // If Gemini API is configured and score is borderline/high (2-7), use AI for deeper analysis
  const apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (apiKey && patternResult.score >= 2) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Analyze the following text for malicious intent patterns including:
- Profanity/abusive language (damn, shit, fuck, asshole, bitch, etc.)
- Sexual/hookup content (one night stand, no strings attached, casual sex, escort, nudes, sexting, etc.)
- Contact sharing/moving off platform (WhatsApp, Telegram, Instagram DMs, phone numbers, emails)
- Off-platform payments (advance payment, crypto, cash only, direct transfer)
- Unsafe meetups (private locations, hotels, "no one will know")
- Dating/romantic intent (partner search, casual dating, relationship seeking)
- Manipulation/suspicious behavior (trust me, keep secret, exclusive access)

Text to analyze: "${text}"

Respond with a JSON object containing:
{
  "riskLevel": number (1-10),
  "categories": {
    "profanity": number (0-3),
    "sexual": number (0-3),
    "contactSharing": number (0-3),
    "payments": number (0-3),
    "unsafeMeetups": number (0-3),
    "dating": number (0-3),
    "manipulation": number (0-3)
  },
  "explanation": "brief explanation"
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      const jsonMatch = /\{[\s\S]*\}/.exec(responseText);
      if (!jsonMatch?.[0]) {
        return patternResult;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const aiResult: GeminiResponse = JSON.parse(jsonMatch[0]);

      const riskLevel = aiResult.riskLevel ?? patternResult.score;
      const isBlocked = typeof riskLevel === "number" && riskLevel > 3;

      return {
        score: Math.min(10, Math.max(1, riskLevel)),
        isBlocked,
        categories: {
          profanity: aiResult.categories?.profanity ?? 0,
          contactSharing: aiResult.categories?.contactSharing ?? 0,
          payments: aiResult.categories?.payments ?? 0,
          unsafeMeetups: aiResult.categories?.unsafeMeetups ?? 0,
          dating: aiResult.categories?.dating ?? 0,
          sexual: aiResult.categories?.sexual ?? 0,
          manipulation: aiResult.categories?.manipulation ?? 0,
        },
        flaggedKeywords: patternResult.flaggedKeywords,
        details: aiResult.explanation ?? patternResult.details,
      };
    } catch (error) {
      console.error(
        "Gemini API error, falling back to pattern matching:",
        error,
      );
      // Fall back to pattern matching result
    }
  }

  return patternResult;
}

/**
 * Simple synchronous pattern-only analysis (for quick checks)
 */
export function analyzeContentSync(text: string): ModerationResult {
  return analyzePatterns(text);
}
