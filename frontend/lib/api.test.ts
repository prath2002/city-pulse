import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiRequestError, API_URL } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ status: "healthy" }), { status: 200 })),
    );

    const result = await apiFetch<{ status: string }>("/health");
    expect(result.status).toBe("healthy");
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/health`, expect.anything());
  });

  it("throws ApiRequestError with the Doc 9 error envelope on failure", async () => {
    const envelope = {
      error: { code: "unauthorized", message: "Missing token" },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify(envelope), { status: 401 })),
        ),
    );

    await expect(apiFetch("/zones")).rejects.toThrowError(ApiRequestError);
    await expect(apiFetch("/zones")).rejects.toMatchObject({
      status: 401,
      body: envelope,
    });
  });
});
