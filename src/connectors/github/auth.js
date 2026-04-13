import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const DEFAULT_AUTH_PATH = join(homedir(), ".aidos", "auth.json");

// GitHub OAuth App client ID — set via AIDOS_GITHUB_CLIENT_ID environment variable.
// Each user/org registers their own OAuth App with Device Flow enabled.
// See README.md for setup instructions.
const SCOPES = "repo read:org";

function getClientId() {
  const id = process.env.AIDOS_GITHUB_CLIENT_ID;
  if (!id) {
    throw new Error(
      "AIDOS_GITHUB_CLIENT_ID environment variable is required. " +
      "Register a GitHub OAuth App with Device Flow enabled and set the Client ID. " +
      "See src/connectors/github/README.md for setup instructions.",
    );
  }
  return id;
}

// ---- Token cache ----

export async function loadToken(path = DEFAULT_AUTH_PATH) {
  try {
    const raw = await readFile(path, "utf8");
    const data = JSON.parse(raw);
    if (data?.access_token) return data;
    return null;
  } catch {
    return null;
  }
}

export async function saveToken(path = DEFAULT_AUTH_PATH, token) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(token, null, 2), { mode: 0o600 });
}

// ---- Device flow ----

export async function deviceFlow(fetchFn = fetch) {
  const clientId = getClientId();
  // Step 1: Request device code
  const codeRes = await fetchFn("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ client_id: clientId, scope: SCOPES }),
  });
  if (!codeRes.ok) {
    throw new Error(`Device flow initiation failed: ${codeRes.status}`);
  }
  const { device_code, user_code, verification_uri, interval } =
    await codeRes.json();

  // Surface the code — caller displays this to the user
  const instructions = `Go to ${verification_uri} and enter code: ${user_code}`;
  console.error(instructions);

  // Step 2: Poll for token
  let currentInterval = (interval ?? 5) * 1000;
  while (true) {
    await new Promise((r) => setTimeout(r, currentInterval));

    const tokenRes = await fetchFn(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      },
    );
    const data = await tokenRes.json();

    if (data.access_token) return data;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      currentInterval += 5000;
      continue;
    }
    throw new Error(`Device flow error: ${data.error} — ${data.error_description}`);
  }
}

// ---- High-level: ensure we have a valid token ----

export async function ensureAuth(path = DEFAULT_AUTH_PATH, fetchFn = fetch) {
  // Try cached token
  let token = await loadToken(path);
  if (token?.access_token) {
    // Validate by calling /user
    const res = await fetchFn("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (res.ok) {
      const user = await res.json();
      return { token: token.access_token, login: user.login };
    }
    console.error("Cached token invalid, re-authenticating...");
  }

  // Run device flow
  const newToken = await deviceFlow(fetchFn);
  await saveToken(path, newToken);

  // Get username
  const res = await fetchFn("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${newToken.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  const user = await res.json();
  return { token: newToken.access_token, login: user.login };
}
