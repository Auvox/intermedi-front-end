// Sessão do funcionário gravada no login (sessionStorage).
export function readEmployeeSession() {
  try {
    const raw = sessionStorage.getItem("intermediEmployeeSession");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
