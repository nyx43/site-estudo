/** Client HTTP error preserving structured API error code and status when available. */
export class StudyClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "StudyClientError";
    this.status = status;
    this.code = code;
  }
}

/** Small HTTP client shared by study interactions; rules remain in the service. */
export async function studyRequest<T>(
  url: string,
  body?: unknown,
  options?: { method?: "POST" | "PUT"; signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { cache: "no-store", signal: options?.signal }
      : {
          method: options?.method ?? "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: options?.signal,
        },
  );
  const result = (await response.json()) as { data?: T; error?: { code?: string; message: string } };
  if (!response.ok || !result.data) {
    throw new StudyClientError(
      result.error?.message ?? "Não foi possível acessar o estudo. Tente novamente.",
      response.status,
      result.error?.code,
    );
  }
  return result.data;
}
