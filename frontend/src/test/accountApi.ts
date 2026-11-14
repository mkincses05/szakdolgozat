// Stubs `fetch` for the account API. By default nobody is logged in and every other request
// succeeds; tests pass the answers they need, keyed by the path under `/api/auth`.

type Answer = { ok: boolean; data?: unknown; code?: string };

export function stubAccountApi(answers: Partial<Record<"/me" | "/login" | "/register" | "/logout", Answer>> = {}) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname.replace(/^\/api\/auth/, "");
    const answer = answers[path as keyof typeof answers] ?? (path === "/me" ? { ok: false, code: "not_logged_in" } : { ok: true });
    return new Response(JSON.stringify(answer), { headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
