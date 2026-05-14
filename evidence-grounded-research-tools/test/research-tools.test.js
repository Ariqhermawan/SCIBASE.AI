import assert from "node:assert/strict";
import test from "node:test";
import {
  recommendCitations,
  runPeerReview,
  runResearchToolsWorkflow,
  sampleCitationCorpus,
  summarizePaper,
} from "../src/index.js";

const sampleDocument = {
  title: "Evidence-linked notebooks improve reproducibility triage",
  abstract:
    "We evaluate a notebook-centered workflow for auditing computational research artifacts. The workflow links outputs, parameters, and claims so reviewers can inspect evidence behind reported findings.",
  keywords: ["reproducibility", "notebook", "evidence", "workflow"],
  sections: [
    {
      heading: "Methods",
      text:
        "We analyzed three datasets with pinned dependencies, checksums, and executable notebooks. Each claim was linked to a notebook cell.",
    },
    {
      heading: "Results",
      text:
        "The workflow reduced missing-artifact review notes by 31% and improved reviewer agreement, with p < 0.05.",
    },
  ],
  references: [{ title: "Improving reproducibility", doi: "10.1126/science.abd1705" }],
};

test("summarizePaper returns mode-specific evidence-backed output", () => {
  const summary = summarizePaper(sampleDocument, { mode: "executive" });

  assert.equal(summary.mode, "executive");
  assert.ok(summary.summary.includes(sampleDocument.title));
  assert.ok(summary.keyFindings.length > 0);
  assert.ok(summary.evidenceSpans.every((span) => span.quote && span.fingerprint));
});

test("runPeerReview returns diagnostics and checklist", () => {
  const review = runPeerReview(sampleDocument);

  assert.equal(review.title, sampleDocument.title);
  assert.ok(review.readinessScore >= 0);
  assert.ok(review.readinessScore <= 100);
  assert.ok(review.checklist.length >= 5);
  assert.ok(review.findings.some((finding) => finding.category === "statistics"));
});

test("recommendCitations ranks corpus entries with formatted citation text", () => {
  const recommendations = recommendCitations(sampleDocument, sampleCitationCorpus, {
    style: "nature",
    limit: 3,
  });

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations[0].confidence >= recommendations.at(-1).confidence);
  assert.ok(recommendations[0].citation.includes("doi:"));
});

test("runResearchToolsWorkflow composes the MVP toolchain", () => {
  const workflow = runResearchToolsWorkflow(sampleDocument, {
    citationStyle: "apa",
    citationLimit: 2,
  });

  assert.deepEqual(
    workflow.summaries.map((summary) => summary.mode),
    ["abstract", "executive", "layperson"],
  );
  assert.equal(workflow.citations.length, 2);
  assert.equal(workflow.peerReview.title, sampleDocument.title);
  assert.ok(workflow.intake.keywords.length > 0);
  assert.ok(workflow.intake.sentenceCount > 0);
});
