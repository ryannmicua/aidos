/**
 * Index a GitHub tree response into a Map<path, blobSha>.
 * Tree entries (directories) are skipped — only blob entries are included.
 */
export function indexTree(tree) {
  const map = new Map();
  for (const entry of tree.tree || []) {
    if (entry.type === "blob") map.set(entry.path, entry.sha);
  }
  return map;
}

/**
 * Detect conflicting paths between a branch and main.
 *
 * A path conflicts when both sides changed it from the merge base AND the two
 * sides' resulting blobs differ. Modify/delete is also a conflict.
 *
 * Returns:
 *   { conflicts: string[], baseSha, mainSha, branchSha, baseMap, mainMap, branchMap }
 */
export async function detectConflicts(client, owner, repo, branch, mainBranch) {
  const cmp = await client.compare(owner, repo, mainBranch, branch);
  const baseSha = cmp.merge_base_commit.sha;

  const [mainInfo, branchInfo] = await Promise.all([
    client.getBranch(owner, repo, mainBranch),
    client.getBranch(owner, repo, branch),
  ]);
  const mainSha = mainInfo.commit.sha;
  const branchSha = branchInfo.commit.sha;

  const [baseTree, mainTree, branchTree] = await Promise.all([
    client.getTree(owner, repo, baseSha),
    client.getTree(owner, repo, mainSha),
    client.getTree(owner, repo, branchSha),
  ]);

  const baseMap = indexTree(baseTree);
  const mainMap = indexTree(mainTree);
  const branchMap = indexTree(branchTree);

  const allPaths = new Set([...baseMap.keys(), ...mainMap.keys(), ...branchMap.keys()]);
  const conflicts = [];
  for (const path of allPaths) {
    const b = baseMap.get(path);
    const m = mainMap.get(path);
    const r = branchMap.get(path);
    const changedOnMain = b !== m;
    const changedOnBranch = b !== r;
    if (changedOnMain && changedOnBranch && m !== r) {
      conflicts.push(path);
    }
  }
  conflicts.sort();

  return { conflicts, baseSha, mainSha, branchSha, baseMap, mainMap, branchMap };
}

async function fetchBlobText(client, owner, repo, sha) {
  if (!sha) return "";
  const blob = await client.getBlob(owner, repo, sha);
  return Buffer.from(blob.content, blob.encoding || "base64").toString("utf8");
}

function renderMarkers(yours, theirs) {
  return `<<<<<<< yours\n${yours}\n=======\n${theirs}\n>>>>>>> theirs`;
}

/**
 * Verify that each incoming merge packet's `original` block matches the live
 * content for that path. Returns the list of paths whose `original` is stale.
 */
export async function stalenessCheck(client, owner, repo, mergesByPath, detection) {
  const stale = [];
  for (const [path, packet] of mergesByPath) {
    const liveTheirs = await fetchBlobText(client, owner, repo, detection.mainMap.get(path));
    const liveYours = await fetchBlobText(client, owner, repo, detection.branchMap.get(path));
    if (packet.original.theirs !== liveTheirs || packet.original.yours !== liveYours) {
      stale.push(path);
    }
  }
  return stale;
}

/**
 * Build the conflict packet the agent sees. For each conflicting path, fetch
 * base/theirs/yours content and include a rendered conflict-marker form.
 */
export async function buildConflictPacket(client, owner, repo, detection) {
  const conflicts = await Promise.all(
    detection.conflicts.map(async (path) => {
      const [base, theirs, yours] = await Promise.all([
        fetchBlobText(client, owner, repo, detection.baseMap.get(path)),
        fetchBlobText(client, owner, repo, detection.mainMap.get(path)),
        fetchBlobText(client, owner, repo, detection.branchMap.get(path)),
      ]);
      return { path, base, theirs, yours, marker_form: renderMarkers(yours, theirs) };
    }),
  );
  return {
    status: "conflict",
    conflicts,
    instructions:
      "For each conflict, propose a resolution to the user. Call resolve() " +
      "with the user's choice for each file, passing back the original block verbatim.",
  };
}
