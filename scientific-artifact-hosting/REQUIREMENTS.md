# Requirement Map

Issue #14 asks for an MVP covering scientific data and code hosting. This implementation maps those requirements as follows.

## Scalable Storage Engine

- `buildArtifactManifest(project)` classifies datasets, code, notebooks, media, models, figures, and supplementary files.
- Each artifact includes path, type, size, checksum, MIME hint, version, tags, access level, license, and a stable fingerprint.
- Folder organization is summarized through manifest `folders`.
- `summarizeDatasetDiff(previous, next)` reports row, column, schema, and checksum changes between dataset versions.

## Structured Metadata & Standards

- `exportJsonLd(project)` emits schema.org-style linked data.
- `exportDataCite(project)` emits a DataCite-oriented DOI registration payload.
- `exportSchemaOrgDataset(project)` emits machine-discoverable dataset metadata.
- `runFairCompliance(project)` checks findability, accessibility, interoperability, reusability, licensing, identifiers, and versioning.

## Executable Environments

- `assessExecutableEnvironment(project)` detects Dockerfile, Conda environment files, notebooks, scripts, and compute triggers.
- Readiness includes missing setup files, runnable entrypoints, and reproducibility actions.
- The local API exposes workflow endpoints for smoke testing.

## Verification

- `test/artifact-hosting.test.js` covers manifest building, FAIR checks, metadata exports, dataset diffs, environment readiness, and full workflow output.
- `npm test` runs the test suite using the built-in Node test runner.
