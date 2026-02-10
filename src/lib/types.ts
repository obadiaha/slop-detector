export interface CategoryScore {
  score: number; // 0-100
  weight: number;
  findings: Finding[];
}

export interface Finding {
  what: string;
  why: string;
  fix: string;
  severity: "low" | "medium" | "high";
}

export interface AnalysisResult {
  id: string;
  url: string;
  timestamp: number;
  overallScore: number;
  ratingLabel: string;
  ratingEmoji: string;
  categories: {
    layoutOriginality: CategoryScore;
    visualDesign: CategoryScore;
    copyQuality: CategoryScore;
    typography: CategoryScore;
    imagery: CategoryScore;
    interactivity: CategoryScore;
  };
  screenshotUrl?: string;
  scanDurationMs: number;
}

export interface DomData {
  html: string;
  classes: string[];
  textContent: string;
  fonts: string[];
  sections: string[];
  metaGenerator?: string;
  hasFavicon: boolean;
  links: string[];
  headingTexts: string[];
  buttonTexts: string[];
  imageCount: number;
  sectionCount: number;
  hasGradient: boolean;
  computedColors: string[];
}

export function getRatingLabel(score: number): { label: string; emoji: string } {
  if (score <= 20) return { label: "Artisanally Crafted", emoji: "🏆" };
  if (score <= 40) return { label: "Suspiciously Human", emoji: "👀" };
  if (score <= 60) return { label: "Template-Curious", emoji: "🤷" };
  if (score <= 80) return { label: "Peak AI Energy", emoji: "🤖" };
  return { label: "ChatGPT Sneezed On This", emoji: "💀" };
}

export function getScoreColor(score: number): string {
  if (score <= 20) return "#10b981"; // emerald
  if (score <= 40) return "#22d3ee"; // cyan
  if (score <= 60) return "#f59e0b"; // amber
  if (score <= 80) return "#f97316"; // orange
  return "#ef4444"; // red
}
