/** Small HTTP client shared by study interactions; rules remain in the service. */
export async function studyRequest<T>(url: string, body?: unknown, options?: { signal?: AbortSignal }): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { cache: "no-store", signal: options?.signal }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: options?.signal,
        },
  );
  const result = (await response.json()) as { data?: T; error?: { code?: string; message: string } };
  if (!response.ok || !result.data) {
    throw new Error(result.error?.message ?? "Não foi possível acessar o estudo. Tente novamente.");
  }
  return result.data;
}
