import assert from "node:assert/strict";
import test from "node:test";
import {
  assessExecutableEnvironment,
  buildArtifactManifest,
  exportMetadata,
  runArtifactHostingWorkflow,
  runFairCompliance,
  summarizeDatasetDiff,
} from "../src/index.js";

const sampleProject = {
  id: "demo-project",
  title: "Demo reproducibility package",
  description: "A compact package for deterministic artifact-hosting tests.",
  doi: "10.5555/demo.2026.001",
  license: "CC-BY-4.0",
  access: "public",
  creators: [{ name: "Ada Lovelace", affiliation: "Analytical Lab", orcid: "0000-0001-2345-6789" }],
  keywords: ["reproducibility", "data", "notebook", "climate"],
  artifacts: [
    { path: "data/raw.csv", size: 1000, checksum: "sha256:data1", rows: 10, columns: ["id", "value"], version: "v1.0.0", license: "CC-BY-4.0" },
    { path: "notebooks/run.ipynb", size: 2000, checksum: "sha256:notebook1", version: "v1.0.0", license: "MIT" },
    { path: "code/analyze.py", size: 800, checksum: "sha256:code1", version: "v1.0.0", license: "MIT" },
    { path: "Dockerfile", size: 200, checksum: "sha256:docker1", version: "v1.0.0", license: "MIT" },
  ],
  computeTriggers: [{ name: "Run analysis", command: "python code/analyze.py", schedule: "manual" }],
};

test("buildArtifactManifest classifies artifacts and summarizes folders", () => {
  const manifest = buildArtifactManifest(sampleProject);

  assert.equal(manifest.artifactCount, 4);
  assert.equal(manifest.typeCounts.dataset, 1);
  assert.equal(manifest.typeCounts.notebook, 1);
  assert.ok(manifest.folders.some((folder) => folder.path === "data"));
  assert.ok(manifest.artifacts.every((artifact) => artifact.fingerprint.startsWith("sha256:")));
});

test("runFairCompliance returns explainable FAIR score and actions", () => {
  const fair = runFairCompliance(sampleProject);

  assert.equal(fair.score, 100);
  assert.equal(fair.actions.length, 0);

  const incomplete = runFairCompliance({ title: "Missing metadata", artifacts: [{ path: "data.csv" }] });
  assert.ok(incomplete.score < 100);
  assert.ok(incomplete.actions.length > 0);
});

test("summarizeDatasetDiff reports row, schema, and checksum changes", () => {
  const diff = summarizeDatasetDiff(
    { path: "data/raw.csv", checksum: "sha256:a", rows: 10, columns: ["id", "value"] },
    { path: "data/raw.csv", checksum: "sha256:b", rows: 12, columns: ["id", "value", "quality"] },
  );

  assert.equal(diff.checksumChanged, true);
  assert.equal(diff.rowDelta, 2);
  assert.deepEqual(diff.addedColumns, ["quality"]);
  assert.equal(diff.schemaChanged, true);
});

test("exportMetadata includes JSON-LD, DataCite, and schema.org payloads", () => {
  const metadata = exportMetadata(sampleProject);

  assert.equal(metadata.jsonLd["@type"], "Dataset");
  assert.equal(metadata.dataCite.doi, sampleProject.doi);
  assert.equal(metadata.schemaOrg.isAccessibleForFree, true);
});

test("assessExecutableEnvironment detects runnable project readiness", () => {
  const environment = assessExecutableEnvironment(sampleProject);

  assert.equal(environment.ready, true);
  assert.equal(environment.hasDockerfile, true);
  assert.equal(environment.scriptCount, 1);
  assert.equal(environment.triggers.length, 1);
});

test("runArtifactHostingWorkflow composes the MVP toolchain", () => {
  const workflow = runArtifactHostingWorkflow(sampleProject, {
    diff: {
      previous: { path: "data/raw.csv", checksum: "sha256:old", rows: 8, columns: ["id"] },
      next: sampleProject.artifacts[0],
    },
  });

  assert.equal(workflow.manifest.title, sampleProject.title);
  assert.equal(workflow.fair.score, 100);
  assert.equal(workflow.datasetDiff.rowDelta, 2);
  assert.equal(workflow.environment.ready, true);
});
