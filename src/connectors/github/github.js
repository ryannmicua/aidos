const API = "https://api.github.com";

export function createClient(token, fetchFn = fetch) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  async function api(method, path, body, label = "") {
    const url = path.startsWith("http") ? path : `${API}${path}`;
    console.error(`  GitHub API: ${method} ${path}${label ? ` [${label}]` : ""}`);

    // Retry up to 3 times on rate limit (429 or 403 with Retry-After header)
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetchFn(url, {
        method,
        headers: body
          ? { ...headers, "Content-Type": "application/json" }
          : headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.status === 429 || (res.status === 403 && res.headers?.get?.("retry-after"))) {
        const wait = Math.min(Number(res.headers?.get?.("retry-after") || 5) * 1000, 30000);
        console.error(`  Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/3)`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API ${res.status}${label ? ` [${label}]` : ""}: ${text}`,
        );
      }
      if (res.status === 204) return null;
      return res.json();
    }
    throw new Error(`GitHub API rate limit exceeded after 3 retries [${label}]`);
  }

  return {
    getUser: () => api("GET", "/user", null, "getUser"),
    searchRepos: (query) =>
      api("GET", `/search/repositories?q=${encodeURIComponent(query)}&per_page=10`, null, "searchRepos"),
    getRepo: (owner, repo) =>
      api("GET", `/repos/${owner}/${repo}`, null, "getRepo"),
    getBranch: (owner, repo, branch) =>
      api("GET", `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`, null, "getBranch"),
    createBranch: (owner, repo, name, sha) =>
      api("POST", `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${name}`, sha }, "createBranch"),
    deleteRef: (owner, repo, branch) =>
      api("DELETE", `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, null, "deleteRef"),
    getTree: (owner, repo, sha) =>
      api("GET", `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`, null, "getTree"),
    getBlob: (owner, repo, sha) =>
      api("GET", `/repos/${owner}/${repo}/git/blobs/${sha}`, null, "getBlob"),
    createTree: (owner, repo, baseTree, tree) =>
      api("POST", `/repos/${owner}/${repo}/git/trees`, { base_tree: baseTree, tree }, "createTree"),
    createCommit: (owner, repo, message, tree, parents) =>
      api("POST", `/repos/${owner}/${repo}/git/commits`, { message, tree, parents }, "createCommit"),
    updateRef: (owner, repo, branch, sha) =>
      api("PATCH", `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha }, "updateRef"),
    merge: (owner, repo, base, head, message) =>
      api("POST", `/repos/${owner}/${repo}/merges`, { base, head, commit_message: message }, "merge"),
    compare: (owner, repo, base, head) =>
      api("GET", `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`, null, "compare"),
    createPull: (owner, repo, opts) =>
      api("POST", `/repos/${owner}/${repo}/pulls`, opts, "createPull"),
    requestReviewers: (owner, repo, pullNumber, opts) =>
      api("POST", `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`, opts, "requestReviewers"),
  };
}
