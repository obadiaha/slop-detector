import { CategoryScore, Finding } from "../types";

// AI-generated copy patterns
const AI_PHRASES = [
  "revolutionize your workflow",
  "unlock the power of",
  "seamless integration",
  "in today's fast-paced world",
  "cutting-edge technology",
  "take your .* to the next level",
  "streamline your",
  "harness the power",
  "elevate your",
  "supercharge your",
  "transform the way you",
  "effortlessly manage",
  "designed for modern",
  "built for the future",
  "next-generation",
  "game-changing",
  "one platform for all your",
  "everything you need",
  "all-in-one solution",
  "powerful yet simple",
  "intuitive and powerful",
  "from zero to hero",
  "say goodbye to",
  "reimagine the way",
  "experience the future of",
  "join thousands of",
  "trusted by leading",
  "scale with confidence",
  "enterprise-grade",
  "world-class",
  "battle-tested",
  "production-ready",
  "blazingly fast",
  "lightning-fast",
  "pixel-perfect",
  "thoughtfully crafted",
  "beautifully designed",
  "delightfully simple",
  "we believe that",
  "our mission is to",
  "we're passionate about",
  "at .*, we understand",
  "whether you're a .* or a",
];

// Generic filler metrics
const FILLER_METRICS = [
  /\d{1,3}(?:,\d{3})*\+?\s*(?:users|customers|teams|companies|businesses)/i,
  /99\.9+%\s*(?:uptime|reliability|accuracy)/i,
  /\d+x\s*(?:faster|better|more efficient|improvement)/i,
  /\d+%\s*(?:increase|decrease|reduction|improvement|faster|more)/i,
  /\d+\+\s*(?:integrations|features|templates|tools)/i,
  /save\s+\d+\+?\s*(?:hours|minutes|days)/i,
];

// Generic testimonial name patterns
const GENERIC_TESTIMONIAL_NAMES = [
  "sarah chen", "sarah johnson", "sarah williams",
  "alex rodriguez", "alex chen", "alex johnson",
  "jamie park", "jamie chen", "jamie lee",
  "michael chen", "michael johnson",
  "emily zhang", "emily chen",
  "david kim", "david chen",
  "jessica wu", "jessica lee",
  "john smith", "john doe",
  "jane doe", "jane smith",
  "mark johnson", "mark williams",
  "lisa wang", "lisa chen",
  "tom anderson", "tom wilson",
  "chris taylor", "chris johnson",
  "rachel green", "rachel kim",
];

// Buzzwords
const BUZZWORDS = [
  "synergy", "leverage", "paradigm", "disrupt", "innovative",
  "robust", "scalable", "agile", "holistic", "ecosystem",
  "empower", "optimize", "seamless", "frictionless", "turnkey",
  "democratize", "hyperscale", "best-in-class", "state-of-the-art",
  "mission-critical", "end-to-end", "full-stack", "cloud-native",
];

export function analyzeCopy(textContent: string): CategoryScore {
  const findings: Finding[] = [];
  let score = 0;
  const text = textContent.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 50) {
    // Not enough text to analyze meaningfully
    return { score: 0, weight: 0.2, findings: [{ what: "Very little text content found", why: "Not enough copy to analyze for AI patterns", fix: "N/A", severity: "low" }] };
  }

  // --- AI phrase detection ---
  const detectedPhrases: string[] = [];
  for (const phrase of AI_PHRASES) {
    const regex = new RegExp(phrase, "gi");
    if (regex.test(text)) {
      detectedPhrases.push(phrase.replace(/\.\*/g, "..."));
    }
  }

  if (detectedPhrases.length >= 5) {
    score += 35;
    findings.push({
      what: `${detectedPhrases.length} AI-generated phrases detected`,
      why: `Found: "${detectedPhrases.slice(0, 4).join('", "')}"... These are the most common phrases AI writes when generating marketing copy`,
      fix: "Rewrite your copy with specific, concrete language about what YOUR product actually does",
      severity: "high",
    });
  } else if (detectedPhrases.length >= 2) {
    score += 18;
    findings.push({
      what: `${detectedPhrases.length} common AI phrases detected`,
      why: `Found: "${detectedPhrases.join('", "')}"`,
      fix: "Replace generic phrases with specific claims backed by real data",
      severity: "medium",
    });
  } else if (detectedPhrases.length === 1) {
    score += 5;
  }

  // --- Em-dash density ---
  const emDashes = (textContent.match(/—/g) || []).length;
  const emDashPer100Words = (emDashes / wordCount) * 100;

  if (emDashPer100Words > 2) {
    score += 15;
    findings.push({
      what: `High em-dash density: ${emDashes} em-dashes (${emDashPer100Words.toFixed(1)} per 100 words)`,
      why: "AI-generated text uses 3-5x more em-dashes than human writing. It's one of the most reliable AI-copy tells",
      fix: "Replace em-dashes with periods, commas, or restructure sentences",
      severity: "medium",
    });
  } else if (emDashPer100Words > 1) {
    score += 8;
    findings.push({
      what: `Moderate em-dash usage: ${emDashes} em-dashes`,
      why: "Slightly elevated em-dash usage — could be AI-generated copy",
      fix: "Vary your punctuation. Humans use more periods and semicolons",
      severity: "low",
    });
  }

  // --- Filler metrics detection ---
  const detectedMetrics: string[] = [];
  for (const pattern of FILLER_METRICS) {
    const match = textContent.match(pattern);
    if (match) {
      detectedMetrics.push(match[0]);
    }
  }

  if (detectedMetrics.length >= 3) {
    score += 20;
    findings.push({
      what: `${detectedMetrics.length} unverifiable metrics found`,
      why: `Found: "${detectedMetrics.slice(0, 3).join('", "')}" — AI loves generating round, impressive-sounding numbers with no source`,
      fix: "Use real, specific metrics. Link to sources. '10,000+ users' means nothing without verification",
      severity: "high",
    });
  } else if (detectedMetrics.length >= 1) {
    score += 8;
    findings.push({
      what: `${detectedMetrics.length} potentially generic metric(s) found`,
      why: `Found: "${detectedMetrics.join('", "')}"`,
      fix: "Make sure metrics are real and verifiable",
      severity: "low",
    });
  }

  // --- Generic testimonial names ---
  const detectedNames: string[] = [];
  for (const name of GENERIC_TESTIMONIAL_NAMES) {
    if (text.includes(name)) {
      detectedNames.push(name);
    }
  }

  if (detectedNames.length >= 2) {
    score += 20;
    findings.push({
      what: `Suspiciously generic testimonial names: "${detectedNames.join('", "')}"`,
      why: "AI generates the same handful of diverse-sounding names for fake testimonials. Sarah Chen and Alex Rodriguez are the AI's favorite people",
      fix: "Use real testimonials from real customers with their permission, or don't use testimonials at all",
      severity: "high",
    });
  } else if (detectedNames.length === 1) {
    score += 8;
    findings.push({
      what: `Possibly generic testimonial name: "${detectedNames[0]}"`,
      why: "This name appears frequently in AI-generated testimonials",
      fix: "Verify this is a real person's testimonial",
      severity: "low",
    });
  }

  // --- Buzzword density ---
  const buzzwordCount = BUZZWORDS.filter((bw) => text.includes(bw)).length;
  const buzzwordDensity = buzzwordCount / Math.max(wordCount / 100, 1);

  if (buzzwordDensity > 3) {
    score += 15;
    findings.push({
      what: `High buzzword density: ${buzzwordCount} buzzwords detected`,
      why: "Heavy buzzword usage is a hallmark of AI-generated marketing copy",
      fix: "Replace buzzwords with plain language that describes what you actually do",
      severity: "medium",
    });
  } else if (buzzwordDensity > 1.5) {
    score += 7;
  }

  // --- Parallel structure in lists ---
  // Check if multiple headings start with the same word pattern
  const headingStarts = textContent
    .split("\n")
    .filter((line) => line.length > 10 && line.length < 80)
    .map((line) => line.trim().split(" ")[0]?.toLowerCase())
    .filter(Boolean);

  const startCounts = new Map<string, number>();
  for (const start of headingStarts) {
    startCounts.set(start, (startCounts.get(start) || 0) + 1);
  }
  const repetitiveStarts = [...startCounts.entries()].filter(
    ([, count]) => count >= 4
  );

  if (repetitiveStarts.length > 0) {
    score += 8;
    findings.push({
      what: "Highly parallel sentence structure detected",
      why: "AI loves generating lists where every item starts the same way",
      fix: "Vary your sentence openings for more natural, engaging copy",
      severity: "low",
    });
  }

  // --- Check for placeholder/lorem content ---
  if (text.includes("lorem ipsum") || text.includes("dolor sit amet")) {
    score += 25;
    findings.push({
      what: "Lorem ipsum placeholder text detected",
      why: "The site has unfinished placeholder content",
      fix: "Replace all placeholder text with real content",
      severity: "high",
    });
  }

  return {
    score: Math.min(score, 100),
    weight: 0.2,
    findings,
  };
}
