import { isAbsolute, relative, resolve } from "node:path";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const KEY_PATTERN = new RegExp(`^${UUID}/assets/(banner|arteCertificadoFrente|arteCertificadoVerso)/${UUID}\\.(png|jpg)$`, "i");

export function isValidPrivateStorageKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.includes("..") && !key.includes("\\");
}

export function resolvePrivateStorageKey(rootDirectory: string, key: string): string {
  if (!isValidPrivateStorageKey(key)) throw new Error("Invalid private storage key.");
  const root = resolve(rootDirectory);
  const target = resolve(root, ...key.split("/"));
  const relativePath = relative(root, target);
  if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
    throw new Error("Storage key escapes the configured root.");
  }
  return target;
}
