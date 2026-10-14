import { describe, expect, it } from "vitest";
import { parsePublicEventSearchParams } from "@backend/modules/events/public-event.schemas";

describe("public event query validation", () => {
  it("accepts and normalizes allowed filters with bounded pagination", () => {
    const result = parsePublicEventSearchParams({ q: "  saúde ", modalidade: "PRESENCIAL", cidade: "Cuiaba", page: "2", pageSize: "50", futuro: "true" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toMatchObject({ q: "saúde", modalidade: "PRESENCIAL", cidade: "Cuiaba", page: 2, pageSize: 50, futuro: "true" });
  });

  it("rejects unsafe enum values, oversized pages, and reversed dates", () => {
    expect(parsePublicEventSearchParams({ modalidade: "DROP TABLE" }).success).toBe(false);
    expect(parsePublicEventSearchParams({ pageSize: "5000" }).success).toBe(false);
    expect(parsePublicEventSearchParams({ dataDe: "2027-06-02", dataAte: "2027-06-01" }).success).toBe(false);
  });
});
