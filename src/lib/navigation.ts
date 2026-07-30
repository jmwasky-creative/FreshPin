const APPLICATION_ORIGIN = "https://freshpin.invalid";

export function safeRedirectPath(value: string | null | undefined): string {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
  ) {
    return "/";
  }

  try {
    const url = new URL(value, APPLICATION_ORIGIN);
    if (url.origin !== APPLICATION_ORIGIN) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
