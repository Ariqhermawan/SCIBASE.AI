const DEFAULT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "using",
  "was",
  "we",
  "with",
]);

const SCIENTIFIC_TERMS = new Set([
  "analysis",
  "assay",
  "cohort",
  "dataset",
  "experiment",
  "model",
  "protocol",
  "regression",
  "replication",
  "sample",
  "simulation",
  "statistical",
  "trial",
  "validation",
]);

export const sampleCitationCorpus = [
  {
    id: "doi:10.1038/s41586-020-2649-2",
    title: "FAIR principles for scientific data stewardship",
    authors: ["Wilkinson", "Dumontier", "Aalbersberg"],
    year: 2020,
    venue: "Nature",
    doi: "10.1038/s41586-020-2649-2",
    keywords: ["fair", "metadata", "data", "reproducibility", "stewardship"],
  },
  {
    id: "doi:10.1126/science.abd1705",
    title: "Improving reproducibility in computational research",
    authors: ["Nosek", "Errington"],
    year: 2021,
    venue: "Science",
    doi: "10.1126/science.abd1705",
    keywords: ["reproducibility", "code", "workflow", "validation"],
  },
  {
    id: "doi:10.1145/3510003",
    title: "Evidence-centered design for AI research assistants",
    authors: ["Patel", "Nguyen", "Santos"],
    year: 2024,
    venue: "ACM Computing Surveys",
    doi: "10.1145/3510003",
    keywords: ["ai", "assistant", "evidence", "research", "human-in-the-loop"],
  },
  {
    id: "doi:10.1016/j.patter.2023.100789",
    title: "Citation recommendation with semantic context",
    authors: ["Ibrahim", "Chen"],
    year: 2023,
    venue: "Patterns",
    doi: "10.1016/j.patter.2023.100789",
    keywords: ["citation", "semantic", "retrieval", "recommendation"],
  },
];

export function parseResearchInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Expected a research document object");
  }

  const title = normalizeWhitespace(input.title || "Untitled research note");
  const abstract = normalizeWhitespace(input.abstract || "");
  const sections = normalizeSections(input.sections);
  const references = Array.isArray(input.references) ? input.references : [];
  const keywords = normalizeKeywords(input.keywords);
  const text = buildDocumentText(title, abstract, sections);

  return {
    title,
    abstract,
    sections,
    references,
    keywords: keywords.length > 0 ? keywords : extractKeywords(text, 12),
    text,
    sentences: splitSentences(text),
  };
}

export function summarizePaper(input, options = {}) {
  const document = parseResearchInput(input);
  const mode = options.mode || "abstract";
  const ranked = rankSentences(document.sentences, document.keywords);
  const topSentences = ranked.slice(0, mode === "executive" ? 4 : 3);

  const keyFindings = extractKeyFindings(document, ranked);
  const implications = extractImplications(document, keyFindings);
  const nextSteps = inferNextSteps(document);
  const summaryText = renderSummary(mode, document, topSentences, keyFindings);

  return {
    mode,
    title: document.title,
    summary: summaryText,
    keyFindings,
    implications,
    nextSteps,
    evidenceSpans: topSentences.map((item) => toEvidenceSpan(item.sentence)),
  };
}

export function runPeerReview(input) {
  const document = parseResearchInput(input);
  const findings = [
    ...reviewClarity(document),
    ...reviewMethods(document),
    ...reviewStatistics(document),
    ...reviewCompliance(document),
    ...reviewCitations(document),
  ];

  const severityPenalty = findings.reduce((total, finding) => {
    if (finding.severity === "high") return total + 18;
    if (finding.severity === "medium") return total + 10;
    return total + 4;
  }, 0);
  const readinessScore = clamp(100 - severityPenalty, 0, 100);

  return {
    title: document.title,
    readinessScore,
    summary: summarizeReview(findings, readinessScore),
    findings,
    checklist: buildReviewChecklist(document, findings),
  };
}

export function recommendCitations(input, corpus = sampleCitationCorpus, options = {}) {
  const document = parseResearchInput(input);
  const style = options.style || "apa";
  const documentTerms = new Set([
    ...document.keywords,
    ...extractKeywords(document.text, 20),
  ]);

  return corpus
    .map((entry) => {
      const entryTerms = normalizeKeywords([
        entry.title,
        ...(entry.keywords || []),
        entry.venue || "",
      ]);
      const matchedTerms = [...new Set(entryTerms.filter((term) => documentTerms.has(term)))];
      const confidence = calculateCitationConfidence(entry, matchedTerms, document);
      return {
        id: entry.id || entry.doi || entry.title,
        title: entry.title,
        confidence,
        matchedTerms,
        reason: buildCitationReason(matchedTerms, entry),
        citation: formatCitation(entry, style),
      };
    })
    .filter((entry) => entry.confidence >= 0.18)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, options.limit || 5);
}

export function runResearchToolsWorkflow(input, options = {}) {
  const document = parseResearchInput(input);
  const summaryModes = options.summaryModes || [
    "abstract",
    "executive",
    "layperson",
  ];

  return {
    title: document.title,
    intake: {
      keywords: document.keywords,
      sentenceCount: document.sentences.length,
      referenceCount: document.references.length,
    },
    summaries: summaryModes.map((mode) => summarizePaper(document, { mode })),
    peerReview: runPeerReview(document),
    citations: recommendCitations(
      document,
      options.corpus || sampleCitationCorpus,
      {
        style: options.citationStyle || "apa",
        limit: options.citationLimit || 5,
      },
    ),
  };
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => ({
      heading: normalizeWhitespace(section.heading || "Section"),
      text: normalizeWhitespace(section.text || ""),
    }))
    .filter((section) => section.text.length > 0);
}

function normalizeKeywords(value) {
  const values = Array.isArray(value) ? value : [value || ""];
  return values
    .flatMap((item) => String(item).split(/[^a-zA-Z0-9-]+/))
    .map((item) => item.toLowerCase().trim())
    .filter((item) => item.length > 2 && !DEFAULT_STOP_WORDS.has(item));
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function buildDocumentText(title, abstract, sections) {
  return [title, abstract, ...sections.map((section) => `${section.heading}. ${section.text}`)]
    .filter(Boolean)
    .join(" ");
}

function splitSentences(text) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function extractKeywords(text, limit = 10) {
  const counts = new Map();
  for (const token of normalizeKeywords(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function rankSentences(sentences, keywords) {
  const keywordSet = new Set(keywords);
  return sentences
    .map((sentence, index) => {
      const terms = normalizeKeywords(sentence);
      const keywordHits = terms.filter((term) => keywordSet.has(term)).length;
      const scientificHits = terms.filter((term) => SCIENTIFIC_TERMS.has(term)).length;
      const positionBoost = index < 3 ? 1.2 : 1;
      const score = (keywordHits * 2 + scientificHits + Math.min(sentence.length / 160, 1)) * positionBoost;
      return { sentence, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

function extractKeyFindings(document, ranked) {
  const findingCandidates = ranked
    .filter((item) => /\b(result|find|show|demonstrat|improv|reduce|increase|suggest|indicat|reveal|validate)/i.test(item.sentence))
    .slice(0, 4);

  const source = findingCandidates.length > 0 ? findingCandidates : ranked.slice(0, 3);
  return source.map((item) => ({
    text: item.sentence,
    evidence: toEvidenceSpan(item.sentence),
  }));
}

function extractImplications(document, keyFindings) {
  const implications = [];
  if (document.keywords.includes("reproducibility") || document.text.match(/reproduc/i)) {
    implications.push("The work is positioned as useful for reproducibility-focused research review.");
  }
  if (document.keywords.includes("citation") || document.text.match(/citation|reference/i)) {
    implications.push("Citation coverage can be improved through context-aware recommendation workflows.");
  }
  if (document.text.match(/dataset|code|notebook|workflow/i)) {
    implications.push("Data and code artifacts should be connected to the manuscript to support verification.");
  }
  if (implications.length === 0 && keyFindings.length > 0) {
    implications.push("The reported findings should be validated against the stated methods and source evidence.");
  }
  return implications;
}

function inferNextSteps(document) {
  const nextSteps = [];
  if (!/data availability|available at|repository|github|doi/i.test(document.text)) {
    nextSteps.push("Add a data and code availability statement with persistent links.");
  }
  if (!/ethic|irb|consent|approval/i.test(document.text)) {
    nextSteps.push("Clarify whether ethics approval or participant consent was required.");
  }
  if (!/confidence interval|ci\b|effect size|power analysis/i.test(document.text)) {
    nextSteps.push("Report uncertainty metrics such as confidence intervals or effect sizes.");
  }
  nextSteps.push("Run citation recommendations against the target domain corpus before submission.");
  return [...new Set(nextSteps)].slice(0, 4);
}

function renderSummary(mode, document, topSentences, keyFindings) {
  const core = topSentences.map((item) => item.sentence).join(" ");
  if (mode === "executive") {
    return `${document.title}: ${core} Primary review focus: ${keyFindings[0]?.text || "validate the evidence chain."}`;
  }
  if (mode === "layperson") {
    return `This work studies ${document.keywords.slice(0, 3).join(", ") || "a scientific question"} and explains why the results may matter. ${core}`;
  }
  return core;
}

function toEvidenceSpan(sentence) {
  return {
    quote: sentence,
    fingerprint: hashText(sentence).slice(0, 12),
  };
}

function reviewClarity(document) {
  const findings = [];
  const longSentences = document.sentences.filter((sentence) => sentence.split(/\s+/).length > 36);
  if (longSentences.length > 0) {
    findings.push(makeFinding("medium", "clarity", "Several sentences are long enough to slow peer review.", "Split long sentences and move caveats into methods or limitations.", longSentences[0]));
  }
  if (!document.abstract || document.abstract.length < 120) {
    findings.push(makeFinding("medium", "clarity", "The abstract is short or missing.", "Add objective, methods, key result, and implication in the abstract.", document.abstract || document.title));
  }
  return findings;
}

function reviewMethods(document) {
  const findings = [];
  if (!/method|protocol|procedure|experiment|dataset|sample|analysis/i.test(document.text)) {
    findings.push(makeFinding("high", "methods", "Methods are not described with enough procedural detail.", "Add dataset, sample, protocol, and analysis details so reviewers can reproduce the work.", document.text.slice(0, 180)));
  }
  if (!/limitation|threat|bias|confound/i.test(document.text)) {
    findings.push(makeFinding("low", "methods", "Limitations or bias discussion is not explicit.", "Add a limitations paragraph describing threats to validity.", document.title));
  }
  return findings;
}

function reviewStatistics(document) {
  const findings = [];
  const hasPValue = /p\s*[<=>]\s*0?\.\d+/i.test(document.text);
  const hasUncertainty = /confidence interval|ci\b|effect size|standard deviation|standard error|power analysis/i.test(document.text);
  if (hasPValue && !hasUncertainty) {
    findings.push(makeFinding("medium", "statistics", "P-values appear without uncertainty or effect-size context.", "Add confidence intervals, effect sizes, or a power analysis.", findSentence(document.sentences, /p\s*[<=>]\s*0?\.\d+/i)));
  }
  if (/increase|decrease|improve|reduce/i.test(document.text) && !/\d+%|\b\d+(\.\d+)?\b/.test(document.text)) {
    findings.push(makeFinding("low", "statistics", "Directional claims are present without numeric magnitude.", "Quantify the size of reported changes.", findSentence(document.sentences, /increase|decrease|improve|reduce/i)));
  }
  return findings;
}

function reviewCompliance(document) {
  const findings = [];
  if (!/data availability|available at|repository|github|zenodo|figshare|osf/i.test(document.text)) {
    findings.push(makeFinding("medium", "compliance", "A data or code availability statement was not found.", "Include where data, code, or notebooks can be accessed.", document.title));
  }
  if (hasHumanSubjectSignal(document.text) && !/ethic|irb|consent|approval/i.test(document.text)) {
    findings.push(makeFinding("high", "compliance", "Human-subject language appears without ethics or consent details.", "Add ethics approval, consent, or exemption information.", findSentence(document.sentences, /human|patient|participant|survey|clinical/i)));
  }
  return findings;
}

function hasHumanSubjectSignal(text) {
  const lowerText = text.toLowerCase();
  if (
    /no human participants|did not include human participants|without human participants|not include human subjects/.test(
      lowerText,
    )
  ) {
    return false;
  }
  return /human|patient|participant|survey|clinical/.test(lowerText);
}

function reviewCitations(document) {
  if (document.references.length >= 3 || /doi:|arxiv|pubmed|reference/i.test(document.text)) {
    return [];
  }
  return [
    makeFinding("medium", "citations", "Citation coverage appears thin for a scientific manuscript.", "Add domain-specific references and make citation context explicit.", document.title),
  ];
}

function makeFinding(severity, category, message, recommendation, evidenceText) {
  return {
    severity,
    category,
    message,
    recommendation,
    evidence: toEvidenceSpan(normalizeWhitespace(evidenceText || message)),
  };
}

function findSentence(sentences, pattern) {
  return sentences.find((sentence) => pattern.test(sentence)) || sentences[0] || "";
}

function summarizeReview(findings, score) {
  if (findings.length === 0) {
    return "No major review blockers were detected in the deterministic checklist.";
  }
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  return `${findings.length} review items detected (${highCount} high severity). Readiness score: ${score}.`;
}

function buildReviewChecklist(document, findings) {
  const categories = new Set(findings.map((finding) => finding.category));
  return [
    { item: "Abstract includes objective, method, result, and implication", passed: document.abstract.length >= 120 },
    { item: "Methods and dataset are described", passed: !categories.has("methods") },
    { item: "Statistics include uncertainty context when needed", passed: !categories.has("statistics") },
    { item: "Data/code availability is stated", passed: !categories.has("compliance") },
    { item: "Citation coverage is sufficient for MVP review", passed: !categories.has("citations") },
  ];
}

function calculateCitationConfidence(entry, matchedTerms, document) {
  let confidence = matchedTerms.length * 0.12;
  if (entry.doi && document.text.toLowerCase().includes("doi")) confidence += 0.08;
  if ((entry.keywords || []).some((keyword) => document.keywords.includes(String(keyword).toLowerCase()))) {
    confidence += 0.18;
  }
  if (entry.year >= 2020) confidence += 0.08;
  return Number(clamp(confidence, 0, 0.98).toFixed(2));
}

function buildCitationReason(matchedTerms, entry) {
  if (matchedTerms.length === 0) {
    return `Recent ${entry.venue || "source"} entry with general relevance.`;
  }
  return `Matches ${matchedTerms.slice(0, 5).join(", ")} in the manuscript context.`;
}

function formatCitation(entry, style) {
  const authors = (entry.authors || ["Unknown"]).join(", ");
  if (style === "mla") {
    return `${authors}. "${entry.title}." ${entry.venue || "Unknown Venue"}, ${entry.year}. DOI:${entry.doi || "n/a"}.`;
  }
  if (style === "nature") {
    return `${authors}. ${entry.title}. ${entry.venue || "Unknown Venue"} (${entry.year}). ${entry.doi ? `doi:${entry.doi}` : ""}`.trim();
  }
  return `${authors} (${entry.year}). ${entry.title}. ${entry.venue || "Unknown Venue"}. ${entry.doi ? `https://doi.org/${entry.doi}` : ""}`.trim();
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
