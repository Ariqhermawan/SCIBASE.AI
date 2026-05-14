const DATASET_EXTENSIONS = new Set(["csv", "tsv", "xlsx", "json", "parquet"]);
const CODE_EXTENSIONS = new Set(["py", "r", "jl", "js", "ts", "sh"]);
const NOTEBOOK_EXTENSIONS = new Set(["ipynb"]);
const MEDIA_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "mp4", "mov"]);
const MODEL_EXTENSIONS = new Set(["onnx", "pt", "pth", "h5", "pkl"]);

export function buildArtifactManifest(input) {
  const project = normalizeProject(input);
  const artifacts = project.artifacts.map((artifact) => normalizeArtifact(artifact, project));
  const folders = summarizeFolders(artifacts);
  const typeCounts = countBy(artifacts, "type");
  const totalBytes = artifacts.reduce((total, artifact) => total + artifact.size, 0);

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    doi: project.doi,
    license: project.license,
    access: project.access,
    creators: project.creators,
    keywords: project.keywords,
    artifactCount: artifacts.length,
    totalBytes,
    typeCounts,
    folders,
    artifacts,
    manifestFingerprint: hashText(
      artifacts.map((artifact) => `${artifact.path}:${artifact.checksum}:${artifact.version}`).join("|"),
    ),
  };
}

export function runFairCompliance(input) {
  const manifest = buildArtifactManifest(input);
  const checks = [
    makeCheck("findable", Boolean(manifest.doi || manifest.id), "Add a DOI or persistent project identifier."),
    makeCheck("findable", manifest.keywords.length >= 3, "Add at least three scientific keywords."),
    makeCheck("accessible", manifest.access !== "unknown", "Declare artifact access level."),
    makeCheck(
      "interoperable",
      manifest.artifacts.some((artifact) => artifact.type === "dataset" && artifact.columns.length > 0),
      "Provide machine-readable dataset schema or column metadata.",
    ),
    makeCheck("reusable", Boolean(manifest.license), "Declare project-level license."),
    makeCheck(
      "reusable",
      manifest.artifacts.every((artifact) => Boolean(artifact.license)),
      "Add license metadata to every artifact.",
    ),
    makeCheck(
      "versioned",
      manifest.artifacts.every((artifact) => Boolean(artifact.version && artifact.checksum)),
      "Add version and checksum for every artifact.",
    ),
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    score: Math.round((passed / checks.length) * 100),
    checks,
    actions: checks.filter((check) => !check.passed).map((check) => check.recommendation),
  };
}

export function summarizeDatasetDiff(previous, next) {
  const before = normalizeDatasetVersion(previous);
  const after = normalizeDatasetVersion(next);
  const previousColumns = new Set(before.columns);
  const nextColumns = new Set(after.columns);
  const addedColumns = after.columns.filter((column) => !previousColumns.has(column));
  const removedColumns = before.columns.filter((column) => !nextColumns.has(column));

  return {
    path: after.path || before.path,
    checksumChanged: Boolean(before.checksum && after.checksum && before.checksum !== after.checksum),
    rowDelta: typeof before.rows === "number" && typeof after.rows === "number" ? after.rows - before.rows : null,
    addedColumns,
    removedColumns,
    schemaChanged: addedColumns.length > 0 || removedColumns.length > 0,
    summary: renderDiffSummary(before, after, addedColumns, removedColumns),
  };
}

export function exportJsonLd(input) {
  const manifest = buildArtifactManifest(input);
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": manifest.doi ? `https://doi.org/${manifest.doi}` : `urn:scibase:${manifest.id}`,
    name: manifest.title,
    description: manifest.description,
    license: manifest.license,
    keywords: manifest.keywords,
    creator: manifest.creators.map((creator) => ({
      "@type": "Person",
      name: creator.name,
      affiliation: creator.affiliation,
      identifier: creator.orcid,
    })),
    distribution: manifest.artifacts.map((artifact) => ({
      "@type": "DataDownload",
      name: artifact.path,
      encodingFormat: artifact.mimeType,
      contentSize: artifact.size,
      sha256: artifact.checksum,
    })),
  };
}

export function exportDataCite(input) {
  const manifest = buildArtifactManifest(input);
  return {
    doi: manifest.doi || null,
    titles: [{ title: manifest.title }],
    creators: manifest.creators.map((creator) => ({
      name: creator.name,
      affiliation: creator.affiliation ? [{ name: creator.affiliation }] : [],
      nameIdentifiers: creator.orcid
        ? [{ nameIdentifier: creator.orcid, nameIdentifierScheme: "ORCID" }]
        : [],
    })),
    publisher: "SCIBASE.AI",
    publicationYear: new Date().getUTCFullYear(),
    resourceType: { resourceTypeGeneral: "Dataset", resourceType: "Scientific artifact package" },
    subjects: manifest.keywords.map((keyword) => ({ subject: keyword })),
    rightsList: manifest.license ? [{ rights: manifest.license }] : [],
    sizes: [`${manifest.totalBytes} bytes`, `${manifest.artifactCount} artifacts`],
  };
}

export function exportSchemaOrgDataset(input) {
  const jsonLd = exportJsonLd(input);
  return {
    ...jsonLd,
    isAccessibleForFree: buildArtifactManifest(input).access === "public",
    includedInDataCatalog: {
      "@type": "DataCatalog",
      name: "SCIBASE Scientific Artifact Catalog",
    },
  };
}

export function exportMetadata(input) {
  return {
    jsonLd: exportJsonLd(input),
    dataCite: exportDataCite(input),
    schemaOrg: exportSchemaOrgDataset(input),
  };
}

export function assessExecutableEnvironment(input) {
  const manifest = buildArtifactManifest(input);
  const artifactPaths = new Set(manifest.artifacts.map((artifact) => artifact.path.toLowerCase()));
  const hasDockerfile = artifactPaths.has("dockerfile") || [...artifactPaths].some((path) => path.endsWith("/dockerfile"));
  const hasConda = [...artifactPaths].some((path) => path.endsWith("environment.yml") || path.endsWith("environment.yaml"));
  const notebooks = manifest.artifacts.filter((artifact) => artifact.type === "notebook");
  const scripts = manifest.artifacts.filter((artifact) => artifact.type === "code");
  const triggers = Array.isArray(input.computeTriggers) ? input.computeTriggers : [];
  const actions = [];

  if (!hasDockerfile && !hasConda) actions.push("Add Dockerfile or environment.yml for reproducible execution.");
  if (notebooks.length === 0 && scripts.length === 0) actions.push("Add a notebook or analysis script entrypoint.");
  if (triggers.length === 0) actions.push("Declare at least one manual or scheduled compute trigger.");

  return {
    ready: actions.length === 0,
    hasDockerfile,
    hasConda,
    notebookCount: notebooks.length,
    scriptCount: scripts.length,
    triggers: triggers.map((trigger) => ({
      name: normalizeText(trigger.name || "Unnamed trigger"),
      command: normalizeText(trigger.command || ""),
      schedule: normalizeText(trigger.schedule || "manual"),
    })),
    actions,
  };
}

export function runArtifactHostingWorkflow(input, options = {}) {
  const manifest = buildArtifactManifest(input);
  return {
    manifest,
    fair: runFairCompliance(input),
    datasetDiff: options.diff ? summarizeDatasetDiff(options.diff.previous, options.diff.next) : null,
    metadata: exportMetadata(input),
    environment: assessExecutableEnvironment(input),
  };
}

function normalizeProject(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Expected a scientific project object");
  }
  const title = normalizeText(input.title || "Untitled scientific project");
  return {
    id: normalizeSlug(input.id || title),
    title,
    description: normalizeText(input.description || ""),
    doi: normalizeText(input.doi || ""),
    license: normalizeText(input.license || ""),
    access: normalizeText(input.access || "unknown"),
    creators: normalizeCreators(input.creators),
    keywords: normalizeKeywords(input.keywords),
    artifacts: Array.isArray(input.artifacts) ? input.artifacts : [],
  };
}

function normalizeArtifact(artifact, project) {
  const path = normalizePath(artifact.path || "artifact");
  const extension = getExtension(path);
  const type = inferArtifactType(path, extension);
  const size = Number.isFinite(Number(artifact.size)) ? Number(artifact.size) : 0;
  const checksum = normalizeText(artifact.checksum || hashText(`${path}:${size}`));

  return {
    path,
    folder: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "",
    name: path.split("/").at(-1),
    extension,
    type,
    mimeType: inferMimeType(type, extension),
    size,
    checksum,
    rows: Number.isFinite(Number(artifact.rows)) ? Number(artifact.rows) : null,
    columns: Array.isArray(artifact.columns) ? artifact.columns.map(normalizeText).filter(Boolean) : [],
    version: normalizeText(artifact.version || "v0.0.0"),
    license: normalizeText(artifact.license || project.license),
    access: normalizeText(artifact.access || project.access || "unknown"),
    tags: normalizeKeywords(artifact.tags || [type, extension]),
    fingerprint: hashText(`${path}:${checksum}:${artifact.version || "v0.0.0"}`),
  };
}

function inferArtifactType(path, extension) {
  const lowerPath = path.toLowerCase();
  if (DATASET_EXTENSIONS.has(extension)) return "dataset";
  if (CODE_EXTENSIONS.has(extension)) return "code";
  if (NOTEBOOK_EXTENSIONS.has(extension)) return "notebook";
  if (MEDIA_EXTENSIONS.has(extension)) return lowerPath.includes("figure") ? "figure" : "media";
  if (MODEL_EXTENSIONS.has(extension)) return "model";
  if (lowerPath.endsWith("dockerfile") || lowerPath.endsWith("environment.yml")) return "environment";
  return "supplementary";
}

function inferMimeType(type, extension) {
  const mimeByExtension = {
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    json: "application/json",
    parquet: "application/vnd.apache.parquet",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ipynb: "application/x-ipynb+json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    mp4: "video/mp4",
  };
  return mimeByExtension[extension] || (type === "code" ? "text/plain" : "application/octet-stream");
}

function summarizeFolders(artifacts) {
  return Object.values(
    artifacts.reduce((folders, artifact) => {
      const key = artifact.folder || ".";
      folders[key] ||= { path: key, artifactCount: 0, totalBytes: 0, types: {} };
      folders[key].artifactCount += 1;
      folders[key].totalBytes += artifact.size;
      folders[key].types[artifact.type] = (folders[key].types[artifact.type] || 0) + 1;
      return folders;
    }, {}),
  );
}

function normalizeDatasetVersion(value) {
  const artifact = value || {};
  return {
    path: normalizePath(artifact.path || ""),
    checksum: normalizeText(artifact.checksum || ""),
    rows: Number.isFinite(Number(artifact.rows)) ? Number(artifact.rows) : null,
    columns: Array.isArray(artifact.columns) ? artifact.columns.map(normalizeText).filter(Boolean) : [],
  };
}

function renderDiffSummary(before, after, addedColumns, removedColumns) {
  const parts = [];
  if (typeof before.rows === "number" && typeof after.rows === "number") {
    parts.push(`row delta ${after.rows - before.rows}`);
  }
  if (addedColumns.length > 0) parts.push(`added columns: ${addedColumns.join(", ")}`);
  if (removedColumns.length > 0) parts.push(`removed columns: ${removedColumns.join(", ")}`);
  if (before.checksum && after.checksum && before.checksum !== after.checksum) {
    parts.push("checksum changed");
  }
  return parts.length > 0 ? parts.join("; ") : "No dataset-level changes detected.";
}

function normalizeCreators(creators) {
  if (!Array.isArray(creators) || creators.length === 0) {
    return [{ name: "Unknown creator", affiliation: "", orcid: "" }];
  }
  return creators.map((creator) => ({
    name: normalizeText(creator.name || "Unknown creator"),
    affiliation: normalizeText(creator.affiliation || ""),
    orcid: normalizeText(creator.orcid || ""),
  }));
}

function normalizeKeywords(value) {
  const items = Array.isArray(value) ? value : [value || ""];
  return [
    ...new Set(
      items
        .flatMap((item) => String(item).split(/[^a-zA-Z0-9-]+/))
        .map((item) => item.toLowerCase().trim())
        .filter((item) => item.length > 1),
    ),
  ];
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizePath(value) {
  return normalizeText(value).replace(/\\/g, "/").replace(/^\/+/, "");
}

function normalizeSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(path) {
  const name = path.toLowerCase().split("/").at(-1) || "";
  if (name === "dockerfile") return "";
  return name.includes(".") ? name.split(".").at(-1) : "";
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
    return counts;
  }, {});
}

function makeCheck(category, passed, recommendation) {
  return { category, passed, recommendation };
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `sha256:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
