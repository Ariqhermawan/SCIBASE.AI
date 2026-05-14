# Scientific Artifact Hosting MVP

This module implements a credential-free MVP for issue #14, "Scientific/Engineering Data & Code Hosting".

It provides deterministic building blocks for:

- Artifact intake manifests for datasets, code, notebooks, media, models, and supplementary files
- Version-aware upload records with content fingerprints and dataset diff summaries
- Metadata exports for JSON-LD, DataCite-style DOI registration, and schema.org discovery
- FAIR compliance checks covering identifiers, access, interoperability, reuse, licensing, and versioning
- Executable environment readiness checks for Dockerfile, `environment.yml`, notebooks, scripts, and compute triggers
- A small local API and CLI demo for reviewer-friendly validation

The implementation intentionally avoids external storage, DOI, container, and cloud APIs. It is a reviewable first milestone that can later be wired to Supabase Storage, object storage, Kubernetes jobs, and DOI providers.

## Run

```bash
npm test
npm run demo
npm run start
```

The local API listens on `http://localhost:4184` and exposes:

- `GET /health`
- `POST /manifest`
- `POST /fair`
- `POST /diff`
- `POST /metadata`
- `POST /workflow`

## Example

```bash
npm run demo
```

The demo loads `demo/sample-project.json`, builds an artifact manifest, runs FAIR checks, compares dataset versions, exports metadata, and reports executable-environment readiness.

Short video demo: [`demo/artifact-hosting-demo.mp4`](demo/artifact-hosting-demo.mp4).

## Design Notes

- Fingerprints are deterministic hashes of artifact paths, sizes, and checksums.
- Dataset diffs summarize row/column deltas without requiring heavy dataframe dependencies.
- Metadata exports use explicit fields so reviewers can inspect DOI, license, creator, and distribution data.
- FAIR checks are explainable and return concrete remediation actions.
- The API is a thin wrapper around the same core functions used by the tests.

## Transparency

This contribution was prepared with AI assistance and reviewed locally. It is self-contained, credential-free, and includes runnable tests.
