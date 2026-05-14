import http from "node:http";
import {
  recommendCitations,
  runPeerReview,
  runResearchToolsWorkflow,
  sampleCitationCorpus,
  summarizePaper,
} from "./index.js";

const PORT = Number(process.env.PORT || 4177);

const routes = {
  "/summarize": async (payload) =>
    summarizePaper(payload.document || payload, { mode: payload.mode || "abstract" }),
  "/review": async (payload) => runPeerReview(payload.document || payload),
  "/citations": async (payload) =>
    recommendCitations(payload.document || payload, payload.corpus || sampleCitationCorpus, {
      style: payload.style || "apa",
      limit: payload.limit || 5,
    }),
  "/workflow": async (payload) => runResearchToolsWorkflow(payload.document || payload, payload.options || {}),
};

const server = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200);
    response.end(JSON.stringify({ ok: true, service: "evidence-grounded-research-tools" }));
    return;
  }

  if (request.method !== "POST" || !routes[request.url]) {
    response.writeHead(404);
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const payload = await readJson(request);
    const result = await routes[request.url](payload);
    response.writeHead(200);
    response.end(JSON.stringify(result, null, 2));
  } catch (error) {
    response.writeHead(400);
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Invalid request",
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`Evidence-grounded research tools API listening on http://localhost:${PORT}`);
});

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
