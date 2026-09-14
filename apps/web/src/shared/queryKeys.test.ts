import { describe, expect, test } from "bun:test";
import { queryKeys } from "./queryKeys";

// Contrato: los valores son los literales historicos. Cambiarlos invalida
// la cache existente de react-query en clientes abiertos.
describe("queryKeys", () => {
  test("claves globales estables", () => {
    expect(queryKeys.records).toEqual(["records"]);
    expect(queryKeys.companies).toEqual(["companies"]);
    expect(queryKeys.syncStatus).toEqual(["sync-status"]);
  });
  test("claves por archivo estables", () => {
    expect(queryKeys.record("a")).toEqual(["record", "a"]);
    expect(queryKeys.rows("a")).toEqual(["rows", "a"]);
    expect(queryKeys.cells("a")).toEqual(["cells", "a"]);
    expect(queryKeys.stats("a")).toEqual(["stats", "a"]);
    expect(queryKeys.design("a")).toEqual(["design", "a"]);
  });
});
