import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runResearchToolsWorkflow } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = join(__dirname, "sample-paper.json");
const sample = JSON.parse(await readFile(samplePath, "utf8"));

const report = runResearchToolsWorkflow(sample, {
  citationStyle: "apa",
  citationLimit: 3,
});

console.log(JSON.stringify({
  title: report.title,
  keywords: report.intake.keywords,
  abstractSummary: report.summaries.find((summary) => summary.mode === "abstract")?.summary,
  reviewScore: report.peerReview.readinessScore,
  reviewItems: report.peerReview.findings.map((finding) => ({
    severity: finding.severity,
    category: finding.category,
    message: finding.message,
  })),
  citationRecommendations: report.citations.map((citation) => ({
    title: citation.title,
    confidence: citation.confidence,
    reason: citation.reason,
  })),
}, null, 2));
