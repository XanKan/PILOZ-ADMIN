import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { join,resolve } from "node:path";
import { euro,roleLabel,statusLabel } from "../src/lib/format";

const root=resolve(import.meta.dirname,"..");
describe("contrat de présentation",()=>{
 it("formate les montants stockés en centimes",()=>{expect(euro(2900)).toMatch(/29,00/);expect(euro(59000)).toMatch(/590,00/)});
 it("distingue les rôles plateforme",()=>{expect(roleLabel("super_admin")).toBe("Super administrateur");expect(roleLabel("billing_admin")).toContain("facturation")});
 it("affiche des statuts honnêtes",()=>{expect(statusLabel("trialing")).toBe("Essai");expect(statusLabel("past_due")).toBe("Impayé")});
 it("documente MRR, ARR et encaissements séparément",()=>{const formulas=readFileSync(join(root,"docs","REVENUE_FORMULAS.md"),"utf8");expect(formulas).toContain("ARR** : MRR × 12");expect(formulas).toContain("Ils ne sont jamais présentés comme des encaissements")});
 it("propose la réinitialisation MFA depuis la gestion utilisateur",()=>{const operations=readFileSync(join(root,"src","pages","Operations.tsx"),"utf8");expect(operations).toContain('operation==="mfa_reset"');expect(operations).toContain("Réinitialiser puis réactiver le MFA")});
 it("permet de renvoyer l'e-mail d'activation depuis les utilisateurs et l'entreprise",()=>{const operations=readFileSync(join(root,"src","pages","Operations.tsx"),"utf8"),company=readFileSync(join(root,"src","pages","CompanyDetail.tsx"),"utf8");expect(operations).toContain('adminApi("users.activation_email"');expect(operations).toContain("Renvoyer l’e-mail d’activation");expect(company).toContain('adminApi("users.activation_email"');expect(company).toContain("Renvoyer l’e-mail")});
 it("active explicitement la licence manuelle lors de l'attribution d'une offre",()=>{const company=readFileSync(join(root,"src","pages","CompanyDetail.tsx"),"utf8");expect(company).toContain('activateManual=values.get("activate_manual")==="on"');expect(company).toContain('operation:"activate_manual"');expect(company).toContain("Activer immédiatement la licence manuelle")});
});
