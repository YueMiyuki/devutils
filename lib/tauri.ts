/**
 * Tauri environment detection and invoke wrapper
 */

/**
 * Check if the app is running in a Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Invoke a Tauri command in the desktop environment.
 * @throws {Error} Throws an Error with message "Not in Tauri environment"
 *         when called outside of the Tauri desktop app context.
 * @returns A promise that resolves with the command result of type T.
 */
export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    throw new Error("Not in Tauri environment");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}
