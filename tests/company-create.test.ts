import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { join,resolve } from "node:path";

const root=resolve(import.meta.dirname,"..");

describe("création simplifiée d'une entreprise",()=>{
 it("ne demande que le propriétaire et l'abonnement",()=>{
  const source=readFileSync(join(root,"src","pages","CompanyCreate.tsx"),"utf8");
  expect(source).toContain('name="owner_first_name"');
  expect(source).toContain('name="owner_last_name"');
  expect(source).toContain('name="owner_email"');
  expect(source).toContain('name="plan"');
  expect(source).toContain("provisioning_name");
  expect(source).not.toContain('name="legal_name"');
  expect(source).not.toContain('name="siret"');
  expect(source).not.toContain('name="address_line1"');
 });
});
