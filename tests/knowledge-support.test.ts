import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const page = readFileSync(join(root, "src", "pages", "KnowledgeSupport.tsx"), "utf8");

describe("documentation et support Piloz", () => {
  it("expose toutes les vues documentaires demandées", () => {
    for (const tab of [
      "Articles", "Catégories", "Brouillons", "À valider", "Publiés", "Archivés",
      "Questions sans réponse", "Suggestions", "Historique", "Indexation", "Statistiques",
    ]) expect(page).toContain(`"${tab}"`);
  });

  it("expose toutes les vues du support", () => {
    for (const tab of [
      "Tickets", "File d’attente", "Mes tickets", "Entreprises", "Documentation",
      "Questions sans réponse", "Suggestions produit", "Réponses enregistrées", "Équipes",
      "SLA", "Statistiques", "Paramètres",
    ]) expect(page).toContain(`"${tab}"`);
  });

  it("sépare les notes internes, brouillons et réponses client", () => {
    expect(page).toContain('value="internal"');
    expect(page).toContain('value="draft"');
    expect(page).toContain('value="client"');
    expect(page).toContain("Envoyer au client");
  });

  it("permet de restaurer une version dans un nouveau brouillon", () => {
    expect(page).toContain('adminApi("documentation.restore"');
    expect(page).toContain("Restaurer dans un brouillon");
  });

  it("permet de comparer, dupliquer et joindre des fichiers privés", () => {
    expect(page).toContain("Comparer deux versions");
    expect(page).toContain('adminApi("documentation.duplicate"');
    expect(page).toContain('adminApi("documentation.attachment.upload"');
    expect(page).toContain('"documentation.attachment.download"');
    expect(page).toContain("10 * 1024 * 1024");
  });
});
