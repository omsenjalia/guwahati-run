import "server-only";

/**
 * The private GitHub repo that keeps every bill, ticket, certificate and
 * report (in its documents/ folder). Server only: the token never reaches a
 * phone and is never logged.
 *
 *   GITHUB_RECEIPTS_TOKEN   fine-grained token, Contents read/write, this repo only
 *   GITHUB_RECEIPTS_REPO    owner/repo, e.g. omsenjalia/guwahati-run
 *   GITHUB_RECEIPTS_BRANCH  optional, defaults to main
 */

export const DOCS_ROOT = "documents";
const API = "https://api.github.com";

function config() {
  const token = process.env.GITHUB_RECEIPTS_TOKEN;
  const repo = process.env.GITHUB_RECEIPTS_REPO;
  if (!token || !repo) throw new Error("GitHub storage isn't set up (GITHUB_RECEIPTS_TOKEN, GITHUB_RECEIPTS_REPO).");
  return { token, repo, branch: process.env.GITHUB_RECEIPTS_BRANCH || "main" };
}

export const githubConfigured = () => !!process.env.GITHUB_RECEIPTS_TOKEN && !!process.env.GITHUB_RECEIPTS_REPO;

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gh(path: string, init: RequestInit & { accept?: string } = {}) {
  const { token } = config();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init.accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  if (!res.ok) {
    // GitHub's message only (never echo our request, it has the token header).
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new GitHubError(res.status, `GitHub ${res.status}: ${(body as { message?: string }).message ?? res.statusText}`);
  }
  return res;
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/** Two uploads at once can race on the branch head (409): retry a few times. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof GitHubError) || e.status !== 409 || i >= 3) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1) + Math.random() * 400));
    }
  }
}

export type PutResult = { path: string; sha: string; commitSha: string };

/**
 * Creates a file (one commit). If the path is taken, adds -2, -3... to the
 * name instead of overwriting.
 */
export async function createFile(path: string, bytes: Uint8Array, message: string): Promise<PutResult> {
  const { repo, branch } = config();
  const content = Buffer.from(bytes).toString("base64");
  for (let n = 1; n <= 20; n++) {
    const candidate = n === 1 ? path : path.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${n}${ext}`);
    try {
      return await withRetry(async () => {
        const res = await gh(`/repos/${repo}/contents/${encodePath(candidate)}`, {
          method: "PUT",
          body: JSON.stringify({ message, content, branch }),
        });
        const j = await res.json();
        return { path: candidate, sha: j.content.sha as string, commitSha: j.commit.sha as string };
      });
    } catch (e) {
      // 422 "sha wasn't supplied" means the file already exists: try the next name.
      if (e instanceof GitHubError && e.status === 422 && /sha/i.test(e.message)) continue;
      throw e;
    }
  }
  throw new Error("Couldn't find a free file name.");
}

/** File bytes by blob SHA (works for files up to 100 MB). */
export async function readBlob(sha: string): Promise<ArrayBuffer> {
  const { repo } = config();
  const res = await gh(`/repos/${repo}/git/blobs/${sha}`, { accept: "application/vnd.github.raw+json" });
  return res.arrayBuffer();
}

export async function deleteFile(path: string, sha: string, message: string) {
  const { repo, branch } = config();
  try {
    await withRetry(() =>
      gh(`/repos/${repo}/contents/${encodePath(path)}`, {
        method: "DELETE",
        body: JSON.stringify({ message, sha, branch }),
      }),
    );
  } catch (e) {
    // Already gone from GitHub: nothing to do.
    if (e instanceof GitHubError && e.status === 404) return;
    throw e;
  }
}

/** A text file from the branch, with its blob SHA (needed to save an edit). */
export async function readText(path: string) {
  const { repo, branch } = config();
  const res = await gh(`/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
  const j = await res.json();
  return { text: Buffer.from(j.content as string, "base64").toString("utf8"), sha: j.sha as string };
}

/** Replaces a text file in one commit. GitHub refuses (409) if it changed since `sha` was read. */
export async function updateText(path: string, text: string, sha: string, message: string) {
  const { repo, branch } = config();
  const res = await gh(`/repos/${repo}/contents/${encodePath(path)}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: Buffer.from(text, "utf8").toString("base64"), sha, branch }),
  });
  const j = await res.json();
  return { sha: j.content.sha as string, commitSha: j.commit.sha as string };
}

/** Last successful call, for the data sources health row. */
export async function repoReachable() {
  const { repo } = config();
  const res = await gh(`/repos/${repo}`);
  const j = await res.json();
  return { private: !!j.private, name: j.full_name as string };
}

/* ------------------------------------------------------------- naming */

/** "Kamakhya to IIT!" -> "kamakhya-to-iit" */
export const slug = (s: string, max = 40) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, max)
    .replace(/-$/, "");
