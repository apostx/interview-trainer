import type { InterviewRole, LangCode } from "@/core/models";

/** "all" or one of the role tracks shown as filter chips. */
export type RoleFilter = InterviewRole | "all";

/**
 * Study/Practice filter settings, persisted in localStorage so they survive
 * navigating between sections (the nav links carry no query string). The URL
 * always wins when it has a value; pages write both, so a shared link
 * reproduces the view and a bare visit restores the last state.
 */
export type FilterPrefs = {
  role?: RoleFilter;
  /** Selected data packs (folder labels); empty/absent = every pack. */
  packs?: string[];
  /** Selected importance levels: "1".."5", plus "u" for unrated topics. */
  imp?: string[];
  lang?: LangCode;
};

const KEY = "filter-prefs";

export function loadFilterPrefs(): FilterPrefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as FilterPrefs;
  } catch {
    return {};
  }
}

export function saveFilterPrefs(patch: FilterPrefs): void {
  localStorage.setItem(KEY, JSON.stringify({ ...loadFilterPrefs(), ...patch }));
}

/**
 * Writes the given params into the current URL, dropping any set to
 * null/"". Filters replace the history entry (view state); pass push=true
 * for navigation steps (e.g. opening a topic) so the back button undoes them.
 */
export function patchUrl(patch: Record<string, string | null>, push = false): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/** Valid ?imp= tokens (importance levels, "u" = unrated). */
export function parseImpParam(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .filter((s) => ["1", "2", "3", "4", "5", "u"].includes(s));
}

/** Comma list of pack labels; empty/absent (or the legacy "all") = all. */
export function parsePackParam(value: string | null): string[] {
  return (value ?? "").split(",").filter((s) => s && s !== "all");
}
