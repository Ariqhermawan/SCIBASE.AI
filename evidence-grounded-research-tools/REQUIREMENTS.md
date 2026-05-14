# Requirement Map

Issue #13 asks for an MVP covering an AI paper summarizer, AI peer-review aid, and AI citation tool. This implementation maps those requirements as follows.

## AI Paper Summarizer

- `summarizePaper(document, { mode: "abstract" })` generates compact scientific summaries.
- `summarizePaper(document, { mode: "executive" })` produces decision-oriented summaries.
- `summarizePaper(document, { mode: "layperson" })` produces plain-language summaries.
- Each summary includes key findings, implications, next steps, and evidence spans.

## AI Peer Review Aid

- `runPeerReview(document)` returns structured diagnostics across:
  - clarity
  - methods
  - statistics
  - ethics
  - data availability
  - citation coverage
- Findings include severity, category, message, recommendation, and evidence spans.
- The review output includes an aggregate readiness score and checklist.

## AI Citation Tool

- `recommendCitations(document, corpus, { style })` ranks corpus entries by explicit overlap signals.
- Supported output styles: `apa`, `mla`, and `nature`.
- Recommendations include confidence, matched terms, reason, and formatted citation text.

## Workflow Orchestration

- `runResearchToolsWorkflow(input)` combines intake parsing, all summary modes, peer review, and citation recommendations.
- `src/server.js` exposes a small HTTP API for reviewer smoke tests.
- `demo/demo.js` runs a local CLI demo without credentials or external services.

## Verification

- `test/research-tools.test.js` covers summarization, review diagnostics, citation recommendations, and full workflow output.
- `npm test` runs the test suite using the built-in Node test runner.
