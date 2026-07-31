import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

describe("essais et comptes de démonstration", () => {
  it("crée un essai gratuit de 14 jours depuis le back-office", () => {
    const trials = readFileSync(join(root, "src", "pages", "Trials.tsx"), "utf8");
    const companyCreate = readFileSync(
      join(root, "src", "pages", "CompanyCreate.tsx"),
      "utf8",
    );

    expect(trials).toContain('/companies/new?mode=trial');
    expect(companyCreate).toContain('status:trialMode?"trialing":"active"');
    expect(companyCreate).toContain("trial_days:trialMode?14:0");
  });

  it("provisionne un compte démo isolé avec des données fictives", () => {
    const page = readFileSync(
      join(root, "src", "pages", "DemoAccounts.tsx"),
      "utf8",
    );

    expect(page).toContain('"demo_accounts.create"');
    expect(page).toContain("Horizon Conseil");
    expect(page).toContain("14 jours");
  });

  it("envoie des accès temporaires sans afficher le mot de passe dans l’admin", () => {
    const page = readFileSync(
      join(root, "src", "pages", "DemoAccounts.tsx"),
      "utf8",
    );

    expect(page).toContain("mot de passe");
    expect(page).toContain("temporaire par e-mail");
    expect(page).toContain("Créer et envoyer les accès");
    expect(page).not.toMatch(/name=["']password["']/i);
  });

  it("autorise la suppression définitive uniquement après suspension", () => {
    const page = readFileSync(
      join(root, "src", "pages", "DemoAccounts.tsx"),
      "utf8",
    );

    expect(page).toContain('"demo_accounts.delete"');
    expect(page).toContain('item.platform_status === "suspended"');
    expect(page).toContain("SUPPRIMER");
  });
});
