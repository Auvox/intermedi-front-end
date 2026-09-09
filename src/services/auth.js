export async function authRequest(action, data, signal) {
  let response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: data ? "POST" : "GET",
      credentials: "same-origin",
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      signal: signal || AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "Não foi possível conectar ao serviço de contas. Verifique sua conexão e tente novamente.",
      { cause: error },
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "O serviço de contas está indisponível no momento. Tente novamente em instantes.",
    );
  }
  if (!response.ok) {
    const error = new Error(
      result.message || "Não foi possível concluir a solicitação.",
    );
    error.status = response.status;
    throw error;
  }
  return result;
}
