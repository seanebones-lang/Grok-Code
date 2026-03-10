#!/usr/bin/env node
/**
 * CTO Eleven MCP Server Bridge
 *
 * Standalone MCP server that connects Cursor to the deployed CTO Eleven API.
 * Communicates with Cursor via stdio, forwards requests to the remote API.
 *
 * Usage:
 *   BASE_URL=https://your-app.vercel.app node server.mjs
 *   GITHUB_TOKEN=ghp_xxx BASE_URL=https://your-app.vercel.app node server.mjs
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.BASE_URL || process.env.CTO_ELEVEN_URL || "http://localhost:3000";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

async function apiCall(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(GITHUB_TOKEN && { "X-Github-Token": GITHUB_TOKEN }),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

const server = new McpServer({
  name: "CTO Eleven MCP",
  version: "1.0.0",
});

// ── Health ──────────────────────────────────────────────────────────────────

server.tool("health", "Check the health status of the CTO Eleven platform", {}, async () => {
  const data = await apiCall("/api/health");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("agent_health", "Check the health status of the agent service", {}, async () => {
  const data = await apiCall("/api/agent/health");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

// ── Chat ────────────────────────────────────────────────────────────────────

server.tool(
  "chat",
  "Send a prompt to the Grok AI chat",
  { prompt: z.string().describe("The prompt to send to Grok AI") },
  async ({ prompt }) => {
    const data = await apiCall("/api/chat", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── GitHub Repos ────────────────────────────────────────────────────────────

server.tool("github_list_repos", "List your GitHub repositories", {}, async () => {
  const data = await apiCall("/api/github/repos");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool(
  "github_create_repo",
  "Create a new GitHub repository",
  {
    name: z.string().describe("Repository name"),
    description: z.string().optional().describe("Repository description"),
    isPrivate: z.boolean().optional().default(false).describe("Whether the repo is private"),
  },
  async ({ name, description, isPrivate }) => {
    const data = await apiCall("/api/github/create-repo", {
      method: "POST",
      body: JSON.stringify({ name, description, private: isPrivate }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "github_tree",
  "Get the file tree of a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    branch: z.string().optional().default("main").describe("Branch name"),
  },
  async ({ owner, repo, branch }) => {
    const params = new URLSearchParams({ owner, repo, branch });
    const data = await apiCall(`/api/github/tree?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "github_push",
  "Push files to a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    branch: z.string().optional().default("main").describe("Branch name"),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
    })).describe("Files to push"),
    message: z.string().describe("Commit message"),
  },
  async ({ owner, repo, branch, files, message }) => {
    const data = await apiCall("/api/github/push", {
      method: "POST",
      body: JSON.stringify({ owner, repo, branch, files, message }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Code Search ─────────────────────────────────────────────────────────────

server.tool(
  "code_search",
  "Search code in a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    query: z.string().describe("Search query"),
    language: z.string().optional().describe("Filter by programming language"),
    path: z.string().optional().describe("Filter by file path"),
    limit: z.number().optional().default(10).describe("Max results (1-100)"),
  },
  async ({ owner, repo, query, language, path, limit }) => {
    const params = new URLSearchParams({ owner, repo, query, limit: String(limit) });
    if (language) params.set("language", language);
    if (path) params.set("path", path);
    const data = await apiCall(`/api/agent/search?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Git Operations ──────────────────────────────────────────────────────────

server.tool(
  "git_create_branch",
  "Create a new branch in a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    branch: z.string().describe("New branch name"),
    fromBranch: z.string().optional().describe("Source branch (default: main)"),
  },
  async ({ owner, repo, branch, fromBranch }) => {
    const data = await apiCall("/api/agent/git", {
      method: "POST",
      body: JSON.stringify({ action: "create_branch", owner, repo, branch, fromBranch }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "git_create_pr",
  "Create a pull request",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    title: z.string().describe("PR title"),
    body: z.string().optional().describe("PR description"),
    head: z.string().describe("Head branch"),
    base: z.string().describe("Base branch"),
  },
  async ({ owner, repo, title, body, head, base }) => {
    const data = await apiCall("/api/agent/git", {
      method: "POST",
      body: JSON.stringify({ action: "create_pr", owner, repo, title, body, head, base }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "git_diff",
  "Get diff between branches or commits",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    base: z.string().optional().describe("Base ref"),
    head: z.string().optional().describe("Head ref"),
    path: z.string().optional().describe("Filter by file path"),
  },
  async ({ owner, repo, base, head, path }) => {
    const params = new URLSearchParams({ owner, repo, action: "get_diff" });
    if (base) params.set("base", base);
    if (head) params.set("head", head);
    if (path) params.set("path", path);
    const data = await apiCall(`/api/agent/git?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "git_commit_history",
  "Get commit history for a repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    branch: z.string().optional().describe("Branch name"),
    path: z.string().optional().describe("Filter by file path"),
    limit: z.number().optional().default(10).describe("Max commits to return"),
  },
  async ({ owner, repo, branch, path, limit }) => {
    const params = new URLSearchParams({ owner, repo, action: "get_commit_history", limit: String(limit) });
    if (branch) params.set("branch", branch);
    if (path) params.set("path", path);
    const data = await apiCall(`/api/agent/git?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── File Operations (GitHub) ────────────────────────────────────────────────

server.tool(
  "file_read",
  "Read a file from a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().describe("File path"),
    branch: z.string().optional().describe("Branch name"),
  },
  async ({ owner, repo, path, branch }) => {
    const params = new URLSearchParams({ owner, repo, path, action: "read" });
    if (branch) params.set("branch", branch);
    const data = await apiCall(`/api/agent/files?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "file_list",
  "List files in a GitHub repository directory",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().optional().default("").describe("Directory path"),
    branch: z.string().optional().describe("Branch name"),
  },
  async ({ owner, repo, path, branch }) => {
    const params = new URLSearchParams({ owner, repo, path, action: "list" });
    if (branch) params.set("branch", branch);
    const data = await apiCall(`/api/agent/files?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "file_write",
  "Write/create a file in a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().describe("File path"),
    content: z.string().describe("File content"),
    message: z.string().describe("Commit message"),
    branch: z.string().optional().describe("Branch name"),
  },
  async ({ owner, repo, path, content, message, branch }) => {
    const data = await apiCall("/api/agent/files", {
      method: "POST",
      body: JSON.stringify({ owner, repo, path, content, message, branch }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "file_delete",
  "Delete a file from a GitHub repository",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z.string().describe("File path"),
    message: z.string().describe("Commit message"),
    sha: z.string().describe("File SHA (from file_read)"),
    branch: z.string().optional().describe("Branch name"),
  },
  async ({ owner, repo, path, message, sha, branch }) => {
    const data = await apiCall("/api/agent/files", {
      method: "DELETE",
      body: JSON.stringify({ owner, repo, path, message, sha, branch }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Web Tools ───────────────────────────────────────────────────────────────

server.tool(
  "web_search",
  "Search the web using DuckDuckGo",
  {
    query: z.string().describe("Search query"),
    max_results: z.number().optional().default(5).describe("Max results"),
  },
  async ({ query, max_results }) => {
    const data = await apiCall("/api/agent/web-search", {
      method: "POST",
      body: JSON.stringify({ query, max_results }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "web_browse",
  "Fetch and extract readable content from a web page",
  { url: z.string().describe("URL to browse") },
  async ({ url }) => {
    const data = await apiCall("/api/agent/web-browse", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Terminal ────────────────────────────────────────────────────────────────

server.tool(
  "terminal",
  "Execute a shell command on the server",
  {
    command: z.string().describe("Shell command to execute"),
    cwd: z.string().optional().describe("Working directory"),
  },
  async ({ command, cwd }) => {
    const data = await apiCall("/api/agent/terminal", {
      method: "POST",
      body: JSON.stringify({ command, cwd }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Workflow ────────────────────────────────────────────────────────────────

server.tool(
  "full_stack_workflow",
  "Run a full-stack workflow: generate repo, write code, commit, push, deploy",
  {
    description: z.string().min(10).describe("Description of what to build (min 10 chars)"),
    repositoryName: z.string().optional().describe("Repository name"),
    branch: z.string().optional().default("main").describe("Branch name"),
    deploymentTarget: z.string().optional().default("vercel").describe("Deployment target"),
    autoDeploy: z.boolean().optional().default(true).describe("Auto-deploy after push"),
  },
  async ({ description, repositoryName, branch, deploymentTarget, autoDeploy }) => {
    const data = await apiCall("/api/workflow/full-stack", {
      method: "POST",
      body: JSON.stringify({ description, repositoryName, branch, deploymentTarget, autoDeploy }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Self Evolve ─────────────────────────────────────────────────────────────

server.tool(
  "self_evolve",
  "Trigger the self-evolution process with a goal",
  { goal: z.string().describe("Evolution goal") },
  async ({ goal }) => {
    const data = await apiCall("/api/self-evolve", {
      method: "POST",
      body: JSON.stringify({ goal }),
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Start Server ────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
