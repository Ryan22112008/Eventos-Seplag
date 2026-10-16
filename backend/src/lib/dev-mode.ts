export function isDevMockMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_MOCK_MODE === "true";
}
