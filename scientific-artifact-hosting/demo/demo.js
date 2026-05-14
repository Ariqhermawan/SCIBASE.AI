import { readFile } from "node:fs/promises";
import { runArtifactHostingWorkflow } from "../src/index.js";

const sample = JSON.parse(
  await readFile(new URL("./sample-project.json", import.meta.url), "utf8"),
);

const report = runArtifactHostingWorkflow(sample, {
  diff: {
    previous: sample.previousDataset,
    next: sample.artifacts.find((artifact) => artifact.path === sample.previousDataset.path),
  },
});

console.log(
  JSON.stringify(
    {
      title: report.manifest.title,
      artifactCount: report.manifest.artifactCount,
      artifactTypes: report.manifest.typeCounts,
      fairScore: report.fair.score,
      fairActions: report.fair.actions,
      datasetDiff: report.datasetDiff,
      environmentReady: report.environment.ready,
      metadataExports: Object.keys(report.metadata),
    },
    null,
    2,
  ),
);
