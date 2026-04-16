/**
 * Count non-overlapping occurrences of needle in haystack.
 */
function countOccurrences(haystack, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

/**
 * Replace all non-overlapping occurrences of needle in haystack with replacement.
 * Uses String.prototype.split + join to avoid special-character issues that
 * String.prototype.replaceAll with a regex would introduce.
 */
function replaceAll(haystack, needle, replacement) {
  return haystack.split(needle).join(replacement);
}

/**
 * Apply a list of string-replacement edits to a file's content.
 *
 * Each edit has { old_string, new_string, replace_all? }. Edits are applied
 * sequentially — later edits see the result of earlier ones.
 *
 * Returns { newContent: string, error: null } on success
 *      or { newContent: null, error: string } on failure. Never both set.
 */
export function applyEdits(content, edits) {
  let current = content;
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const label = `Edit ${i + 1}`;
    const { old_string, new_string, replace_all = false } = edit;

    if (old_string === new_string) {
      return {
        newContent: null,
        error: `${label}: old_string and new_string are identical — nothing to change.`,
      };
    }

    const count = countOccurrences(current, old_string);
    if (count === 0) {
      const sample = current.slice(0, 200);
      return {
        newContent: null,
        error: `${label}: old_string not found in content. Current content starts with: ${JSON.stringify(sample)}`,
      };
    }

    if (replace_all) {
      current = replaceAll(current, old_string, new_string);
    } else {
      if (count > 1) {
        return {
          newContent: null,
          error: `${label}: old_string is ambiguous — found ${count} matches. Use replace_all: true or provide more surrounding context to make the match unique.`,
        };
      }
      // exactly one occurrence
      current = replaceAll(current, old_string, new_string);
    }
  }
  return { newContent: current, error: null };
}
