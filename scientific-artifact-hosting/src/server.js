import http from "node:http";
import {
  assessExecutableEnvironment,
  buildArtifactManifest,
  exportMetadata,
  runArtifactHostingWorkflow,
  runFairCompliance,
  summarizeDatasetDiff,
} from "./index.js";

const PORT = Number(process.env.PORT || 4184);

const routes = {
  "/manifest": async (payload) => buildArtifactManifest(payload.project || payload),
  "/fair": async (payload) => runFairCompliance(payload.project || payload),
  "/diff": async (payload) => summarizeDatasetDiff(payload.previous, payload.next),
  "/metadata": async (payload) => exportMetadata(payload.project || payload),
  "/environment": async (payload) => assessExecutableEnvironment(payload.project || payload),
  "/workflow": async (payload) => runArtifactHostingWorkflow(payload.project || payload, payload.options || {}),
};

const server = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200);
    response.end(JSON.stringify({ ok: true, service: "scientific-artifact-hosting" }));
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
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }));
  }
});

server.listen(PORT, () => {
  console.log(`Scientific artifact hosting API listening on http://localhost:${PORT}`);
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
