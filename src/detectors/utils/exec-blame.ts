import { execFile } from "child_process";

/**
 * Async wrapper around `git blame --porcelain`.
 * Returns raw stdout. Returns empty string for binary files.
 */
export function execBlame(filePath: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["blame", "--porcelain", "--", filePath],
      { cwd, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          // Git blame on binary files produces "binary" in stderr
          if (stderr && /binary/i.test(stderr)) {
            return resolve("");
          }
          return reject(err);
        }
        resolve(stdout);
      }
    );
  });
}
