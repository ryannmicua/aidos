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
