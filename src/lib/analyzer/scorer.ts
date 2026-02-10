import { AnalysisResult, CategoryScore, getRatingLabel } from "../types";
import { DomData } from "../types";
import { analyzeDomCss } from "./dom-css";
import { analyzeCopy } from "./copy";
import { analyzeVision } from "./vision";

export async function runFullAnalysis(
  dom: DomData,
  screenshotBase64: string,
  url: string,
  id: string
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Layer 1: DOM/CSS analysis
  const domResults = analyzeDomCss(dom);

  // Layer 2: Copy analysis
  const copyResult = analyzeCopy(dom.textContent);

  // Layer 3: Vision analysis (async)
  const visionResult = await analyzeVision(screenshotBase64);

  // Merge vision results with DOM results
  // Vision provides additional signal; average with DOM/CSS scores
  const layoutScore = mergeScores(
    domResults.layout.score,
    visionResult.layout.score
  );
  const visualScore = mergeScores(
    domResults.visual.score,
    visionResult.visual.score
  );

  const categories = {
    layoutOriginality: {
      score: layoutScore,
      weight: 0.2,
      findings: [
        ...domResults.layout.findings,
        ...(visionResult.layout.findings || []),
      ],
    },
    visualDesign: {
      score: visualScore,
      weight: 0.2,
      findings: [
        ...domResults.visual.findings,
        ...(visionResult.visual.findings || []),
      ],
    },
    copyQuality: copyResult,
    typography: domResults.typography,
    imagery: visionResult.imagery,
    interactivity: domResults.interactivity,
  };

  // Calculate weighted overall score
  const overallScore = Math.round(
    categories.layoutOriginality.score * categories.layoutOriginality.weight +
      categories.visualDesign.score * categories.visualDesign.weight +
      categories.copyQuality.score * categories.copyQuality.weight +
      categories.typography.score * categories.typography.weight +
      categories.imagery.score * categories.imagery.weight +
      categories.interactivity.score * categories.interactivity.weight
  );

  const { label: ratingLabel, emoji: ratingEmoji } = getRatingLabel(overallScore);

  return {
    id,
    url,
    timestamp: Date.now(),
    overallScore: Math.min(overallScore, 100),
    ratingLabel,
    ratingEmoji,
    categories,
    scanDurationMs: Date.now() - startTime,
  };
}

function mergeScores(
  heuristicScore: number,
  visionScore: number | undefined
): number {
  if (visionScore === undefined) {
    return heuristicScore;
  }
  // Weight: 40% heuristic, 60% vision when vision is available
  return Math.round(heuristicScore * 0.4 + visionScore * 0.6);
}
