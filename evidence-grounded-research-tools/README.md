# Evidence-Grounded AI Research Tools MVP

This module implements a credential-free MVP for issue #13, "AI-Assisted Research Tools (MVP Level)".

It provides deterministic building blocks for:

- AI paper summarization in abstract, executive, and layperson modes
- Peer-review diagnostics for clarity, methods, statistics, ethics, data availability, and citation coverage
- Citation recommendations with confidence signals and APA, MLA, and Nature-style formatting
- A small local API and CLI demo for reviewer-friendly validation

The implementation intentionally avoids external model calls and API keys. It is designed as a reviewable first milestone that can later be connected to real LLM, retrieval, and corpus services.

## Run

```bash
npm test
npm run demo
npm run start
```

The local API listens on `http://localhost:4177` and exposes:

- `GET /health`
- `POST /summarize`
- `POST /review`
- `POST /citations`
- `POST /workflow`

## Example

```bash
npm run demo
```

The demo loads `demo/sample-paper.json`, runs the full workflow, and prints a compact report with the generated summaries, review diagnostics, and citation recommendations.

Short video demo: [`demo/research-tools-demo.mp4`](demo/research-tools-demo.mp4).

## Design Notes

- Evidence spans keep generated outputs auditable by pointing back to source text.
- Confidence scores are deterministic and inspectable, not opaque model scores.
- Citation recommendations use explicit keyword, DOI, and domain overlap signals.
- The peer-review aid surfaces issues rather than silently rewriting the manuscript.
- The API is a thin wrapper around the same core functions used by the tests.

## Transparency

This contribution was prepared with AI assistance and reviewed locally. It is self-contained, credential-free, and includes runnable tests.
