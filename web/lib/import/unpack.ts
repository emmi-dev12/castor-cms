// Safely unpack an uploaded site ZIP.
//
// The archive is untrusted input, so every limit here exists because the
// obvious version is exploitable: a zip bomb (a few KB expanding to gigabytes),
// a path-traversal entry (`../../etc/...`) escaping the destination, or simply
// a wrong file someone dragged in.
//
// Nothing is written to disk. Entries are decompressed into memory, capped, and
// handed to the caller — the filesystem is never a participant, so traversal is
// defused by construction rather than by careful path joining.

import { unzipSync } from "fflate";

export interface UnpackedFile {
  /** Normalised, archive-relative path, e.g. "about/index.html". */
  path: string;
  bytes: Uint8Array;
}

export interface UnpackLimits {
  /** Total uncompressed bytes across all entries. */
  maxTotalBytes: number;
  /** Largest single file. */
  maxFileBytes: number;
  maxFiles: number;
}

export const DEFAULT_LIMITS: UnpackLimits = {
  maxTotalBytes: 50 * 1024 * 1024, // 50 MB — see the storage note in CLAUDE.md
  maxFileBytes: 8 * 1024 * 1024, // one asset; Mongo documents cap at 16 MB
  maxFiles: 2000,
};

export class UnpackError extends Error {}

/**
 * Reject anything that isn't a plain relative path inside the archive.
 * Returns the cleaned path, or null if the entry should be skipped.
 */
export function safeEntryPath(raw: string): string | null {
  // Zip entries use forward slashes; normalise Windows archives too.
  const path = raw.replace(/\\/g, "/");

  if (path.endsWith("/")) return null; // directory entry
  if (path.startsWith("/")) return null; // absolute
  if (/^[a-zA-Z]:/.test(path)) return null; // drive-lettered
  if (path.split("/").some((part) => part === "..")) return null; // traversal

  // Editor droppings and macOS metadata: never useful, often confusing.
  const parts = path.split("/");
  if (parts.some((p) => p === "__MACOSX" || p === ".DS_Store" || p === ".git")) return null;

  return path;
}

/**
 * Many exports wrap everything in a single top-level folder ("dist/", the
 * project name). Strip it so page paths come out right.
 */
export function stripCommonRoot(files: UnpackedFile[]): UnpackedFile[] {
  if (files.length === 0) return files;
  const firstSegments = new Set(files.map((f) => f.path.split("/")[0]));
  if (firstSegments.size !== 1) return files;
  // Only strip when it really is a wrapper, i.e. nothing lives at the root.
  if (files.some((f) => !f.path.includes("/"))) return files;
  const prefix = `${[...firstSegments][0]}/`;
  return files.map((f) => ({ ...f, path: f.path.slice(prefix.length) }));
}

export function unpack(zip: Uint8Array, limits: UnpackLimits = DEFAULT_LIMITS): UnpackedFile[] {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zip);
  } catch {
    throw new UnpackError("That doesn't look like a valid ZIP file.");
  }

  const files: UnpackedFile[] = [];
  let total = 0;

  for (const [raw, bytes] of Object.entries(entries)) {
    const path = safeEntryPath(raw);
    if (path === null) continue;

    if (bytes.length > limits.maxFileBytes) {
      throw new UnpackError(
        `"${path}" is ${mb(bytes.length)} — the limit for one file is ${mb(limits.maxFileBytes)}.`,
      );
    }
    total += bytes.length;
    if (total > limits.maxTotalBytes) {
      throw new UnpackError(
        `The archive unpacks to more than ${mb(limits.maxTotalBytes)}. Trim it and try again.`,
      );
    }
    files.push({ path, bytes });
    if (files.length > limits.maxFiles) {
      throw new UnpackError(`The archive holds more than ${limits.maxFiles} files.`);
    }
  }

  if (files.length === 0) throw new UnpackError("The archive is empty.");

  const stripped = stripCommonRoot(files);
  if (!stripped.some((f) => /\.html?$/i.test(f.path))) {
    throw new UnpackError(
      "No HTML file found. Castor imports a built site — export it first, then zip the output folder.",
    );
  }
  return stripped;
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
