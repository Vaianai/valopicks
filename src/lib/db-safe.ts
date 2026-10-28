export function isDbConnectionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { code?: string; message?: string };

  return (
    maybe.code === "ECONNREFUSED" ||
    maybe.code === "P2021" ||
    maybe.code === "P2022" ||
    maybe.message?.includes("Connection terminated unexpectedly") === true ||
    maybe.message?.includes("ECONNREFUSED") === true ||
    maybe.message?.includes("does not exist in the current database") === true ||
    maybe.message?.includes("Invalid `") === true
  );
}
