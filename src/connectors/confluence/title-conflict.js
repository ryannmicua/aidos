// Helpers for handling Confluence per-space title uniqueness.
//
// Confluence requires page titles to be unique within a space. When an AIDOS
// artifact's derived title collides with an existing page elsewhere in the
// space, we rename the new page with a numeric suffix — e.g. "Issues Log (1)".
// The cap below hard-fails after this many attempts to force duplicates to be
// resolved at the source rather than accumulating silently.

export const MAX_TITLE_ATTEMPTS = 3;

/**
 * Build the title to try on attempt N of a create loop.
 * Attempt 0 is the plain title; attempts 1+ append " (N)".
 */
export function suffixedTitle(baseTitle, attempt) {
  return attempt === 0 ? baseTitle : `${baseTitle} (${attempt})`;
}

/**
 * Detect the Confluence "duplicate title in space" 400 error by matching the
 * two known server phrasings. Safe on non-Error inputs.
 */
export function isDuplicateTitleError(err) {
  if (!err || typeof err !== "object" || typeof err.message !== "string") {
    return false;
  }
  const msg = err.message.toLowerCase();
  return (
    msg.includes("a page with this title already exists") ||
    msg.includes("a page already exists with the same title")
  );
}

/**
 * Attempt to create a page, retrying with numeric suffixes when Confluence
 * rejects the title as a duplicate within the space. Caps at MAX_TITLE_ATTEMPTS
 * total attempts — the last failure becomes a hard error that tells the user
 * to rename the source file, so duplicates are resolved at the source rather
 * than accumulating.
 *
 * @param {string} baseTitle  The desired title.
 * @param {(title: string) => Promise<object>} doCreate  Caller's create impl.
 * @returns {Promise<{ result: object, title: string, renamed: boolean }>}
 */
export async function createWithRetryOnDuplicate(baseTitle, doCreate) {
  for (let attempt = 0; attempt < MAX_TITLE_ATTEMPTS; attempt++) {
    const title = suffixedTitle(baseTitle, attempt);
    try {
      const result = await doCreate(title);
      return { result, title, renamed: attempt > 0 };
    } catch (err) {
      if (!isDuplicateTitleError(err)) throw err;
      if (attempt === MAX_TITLE_ATTEMPTS - 1) {
        throw new Error(
          `Cannot publish "${baseTitle}" to Confluence: the titles "${baseTitle}", "${baseTitle} (1)", and "${baseTitle} (2)" are all taken in the target space. ` +
            `Confluence requires page titles to be unique within a space. ` +
            `Rename the source file (or the conflicting Confluence pages) and re-run the publish.`,
        );
      }
    }
  }
}

/**
 * Try to find a page the connector previously created, tolerant of numeric
 * suffix renames. Walks the same ladder as createWithRetryOnDuplicate — plain,
 * (1), (2), up to MAX_TITLE_ATTEMPTS — and returns the first hit.
 *
 * @param {string} baseTitle
 * @param {(title: string) => Promise<{id: string, title: string} | null>} doFind
 * @returns {Promise<{id: string, title: string} | null>}
 */
export async function findOwnedPageByTitle(baseTitle, doFind) {
  for (let attempt = 0; attempt < MAX_TITLE_ATTEMPTS; attempt++) {
    const title = suffixedTitle(baseTitle, attempt);
    const page = await doFind(title);
    if (page) return page;
  }
  return null;
}
