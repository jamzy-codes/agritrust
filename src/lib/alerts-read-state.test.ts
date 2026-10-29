import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc },
}));

import { getAlertsReadState, markAlertsAsViewed } from "./alerts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("notification read-state persistence", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  let storage: MemoryStorage;

  beforeEach(() => {
    rpc.mockReset();
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  it("treats a successful null database response as authoritative", async () => {
    storage.setItem(`agritrust_last_viewed_alerts_${userId}`, "2099-01-01T00:00:00.000Z");
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(getAlertsReadState(userId)).resolves.toEqual({
      lastViewedAt: null,
      databaseAuthoritative: true,
    });
    expect(storage.getItem(`agritrust_last_viewed_alerts_${userId}`)).toBeNull();
  });

  it("uses local state only when the database lookup fails", async () => {
    const localTimestamp = "2026-10-28T08:00:00.000Z";
    storage.setItem(`agritrust_last_viewed_alerts_${userId}`, localTimestamp);
    rpc.mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });

    await expect(getAlertsReadState(userId)).resolves.toEqual({
      lastViewedAt: localTimestamp,
      databaseAuthoritative: false,
    });
  });

  it("caches the database timestamp returned by mark-as-viewed", async () => {
    const databaseTimestamp = "2026-10-28T09:15:00.000Z";
    rpc.mockResolvedValue({ data: databaseTimestamp, error: null });

    await expect(markAlertsAsViewed(userId)).resolves.toEqual({
      databasePersisted: true,
      localPersisted: true,
    });
    expect(rpc).toHaveBeenCalledWith("mark_my_alerts_viewed");
    expect(storage.getItem(`agritrust_last_viewed_alerts_${userId}`)).toBe(databaseTimestamp);
  });

  it("falls back locally and reports that the database write failed", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });

    const result = await markAlertsAsViewed(userId);
    expect(result.databasePersisted).toBe(false);
    expect(result.localPersisted).toBe(true);
    expect(storage.getItem(`agritrust_last_viewed_alerts_${userId}`)).not.toBeNull();
  });
});
