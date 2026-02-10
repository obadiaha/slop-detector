import { AnalysisResult } from "./types";

// Simple in-memory store for MVP - replace with DB later
const results = new Map<string, AnalysisResult>();

export function saveResult(result: AnalysisResult): void {
  results.set(result.id, result);
}

export function getResult(id: string): AnalysisResult | undefined {
  return results.get(id);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
