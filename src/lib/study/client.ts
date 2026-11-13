/** Small HTTP client shared by study interactions; rules remain in the service. */
export async function studyRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { data?: T; error?: { message: string } };
  if (!response.ok || !result.data) throw new Error(result.error?.message ?? "Não foi possível acessar o estudo. Tente novamente.");
  return result.data;
}
