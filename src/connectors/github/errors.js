// User-facing error message mapper.
// Every GitHub API interaction routes errors through here so the MCP result
// stays free of stack traces, JSON blobs, and raw HTTP noise.

export function userFacingError(status, context, details = {}) {
  if (status === "network") {
    return "Can't reach GitHub. Check your internet connection.";
  }

  if (status === 401) {
    return "Your GitHub session has expired. Let me start a fresh authentication — try again and I'll prompt you to re-authorise.";
  }

  if (status === 403) {
    if (context === "repo_write" || context === "push" || context === "pr_create") {
      return "Your account doesn't have write access to this repo. You need push permission or a maintainer role.";
    }
    if (context === "repo_content" && details.org) {
      return `Your GitHub account can see the repo ${details.repo || ""} but can't access its contents.\n\nThis usually means the OAuth App needs to be approved by your organisation admin.\nGo to: https://github.com/orgs/${details.org}/settings/oauth_application_policy\nAsk an admin to approve the AIDOS GitHub MCP app.`;
    }
    return "Your account doesn't have permission to access this repo. Check org access settings — an admin may need to approve the AIDOS OAuth App for your organisation.";
  }

  if (status === 404) {
    if (context === "branch") {
      return "Branch not found. It may have been deleted. Try opening the workspace again to create a fresh one.";
    }
    return "Repo not found. Check the name and that your account has access.";
  }

  if (status === 409) {
    const target = details.target || "the target branch";
    return `Your changes conflict with what's on ${target}. Call publish and follow the conflict-packet flow with resolve to reconcile.`;
  }

  if (status === 422) {
    if (context === "pr_reviewers") {
      return `Couldn't assign reviewer '${details.name || "unknown"}'. Check the username or team name in the manifest.`;
    }
    if (context === "pr_create") {
      return "Couldn't create the PR. Common causes: a PR already exists from this branch, or there are no changes to publish.";
    }
    return "Request was rejected by GitHub. Double-check the inputs.";
  }

  if (typeof status === "number" && status >= 500 && status < 600) {
    return `GitHub is having issues right now (HTTP ${status}). Try again in a minute.`;
  }

  return `Unexpected error from GitHub (status ${status}). Check the logs for details.`;
}

// Parse a GitHub client Error and return { status, message }.
// The github.js client throws Error messages like "GitHub API 404 [getRepo]: ..."
export function mapGitHubError(err, context, details = {}) {
  if (err instanceof TypeError && /fetch/i.test(err.message || "")) {
    return { status: "network", message: userFacingError("network", context, details) };
  }

  const match = /GitHub API (\d{3})/.exec(err?.message || "");
  if (match) {
    const status = Number(match[1]);
    return { status, message: userFacingError(status, context, details) };
  }

  return { status: 0, message: `Unexpected error: ${err?.message || "unknown"}` };
}
