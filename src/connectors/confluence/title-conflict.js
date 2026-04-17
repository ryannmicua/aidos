// Helpers for handling Confluence per-space title uniqueness.
//
// Confluence requires page titles to be unique within a space. When an AIDOS
// artifact's derived title collides with an existing page elsewhere in the
// space, we rename the new page with a numeric suffix — e.g. "Issues Log (1)".
// The cap below hard-fails after this many attempts to force duplicates to be
// resolved at the source rather than accumulating silently.

export const MAX_TITLE_ATTEMPTS = 3;
