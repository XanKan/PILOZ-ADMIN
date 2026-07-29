import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  ChevronRight,
  FilePenLine,
  Headphones,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Metric,
  Modal,
  PageHeader,
  Table,
} from "../components/Ui";
import { adminApi } from "../lib/api";
import { dateTime } from "../lib/format";
import { useAdminData } from "../lib/useAdminData";

type Category = {
  id: string;
  parent_id?: string;
  slug: string;
  name: string;
  description?: string;
  position: number;
  active: boolean;
};
type Article = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  summary: string;
  content?: string;
  status: string;
  visibility: string;
  availability: string;
  language: string;
  current_version: number;
  app_version_min?: string;
  app_version_max?: string;
  module_keys?: string[];
  role_keys?: string[];
  published_at?: string;
  updated_at: string;
  knowledge_categories?: { name: string; slug: string } | null;
};
type ArticleVersion = {
  id: string;
  version_number: number;
  title: string;
  summary: string;
  content: string;
  availability: string;
  visibility: string;
  change_summary?: string;
  created_at: string;
};
type KnowledgeAttachment = {
  id: string;
  article_version: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};
type ArticleDetailResult = {
  article: Article;
  versions: ArticleVersion[];
  attachments: KnowledgeAttachment[];
};
type Unanswered = {
  id: string;
  company_id?: string;
  question: string;
  occurrences: number;
  status: string;
  linked_article_id?: string;
  first_asked_at: string;
  last_asked_at: string;
};
type IndexEvent = {
  id: number;
  article_id: string;
  article_version: number;
  event_type: string;
  status: string;
  detail?: string;
  created_at: string;
  completed_at?: string;
};
type DocumentationStats = {
  articles: Array<{ status: string }>;
  searches: number;
  helpful: number;
  unhelpful: number;
  unanswered: number;
};

const documentationTabs = [
  "Articles",
  "Catégories",
  "Brouillons",
  "À valider",
  "Publiés",
  "Archivés",
  "Questions sans réponse",
  "Suggestions",
  "Historique",
  "Indexation",
  "Statistiques",
] as const;
const statusTone = (
  status: string,
): "neutral" | "positive" | "warning" | "danger" | "info" =>
  status === "published" || status === "resolved"
    ? "positive"
    : status === "review" || status === "waiting_customer"
      ? "warning"
      : status === "archived" || status === "closed"
        ? "neutral"
        : status === "urgent"
          ? "danger"
          : "info";
const availabilityLabel: Record<string, string> = {
  available: "Disponible",
  partial: "Partiel",
  configuration_required: "Configuration requise",
  external_connector_required: "Connecteur externe requis",
  roadmap: "Roadmap",
  unavailable: "Indisponible",
};
function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Le fichier n’a pas pu être lu."));
    reader.onload = () => {
      const value = String(reader.result || ""), separator = value.indexOf(",");
      if (separator < 0) reject(new Error("Le fichier n’a pas pu être encodé."));
      else resolve(value.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function DocumentationPage() {
  const { admin } = useAuth(),
    [tab, setTab] = useState<(typeof documentationTabs)[number]>("Articles"),
    [search, setSearch] = useState(""),
    [editor, setEditor] = useState<Article | null | "new">(null),
    [detail, setDetail] = useState<ArticleDetailResult | null>(null),
    [notice, setNotice] = useState("");
  const articles = useAdminData<{ items: Article[]; total: number }>(
    "documentation.list",
    { pageSize: 200 },
  );
  const categories = useAdminData<{ items: Category[] }>(
    "documentation.categories",
  );
  const unanswered = useAdminData<{ items: Unanswered[] }>(
    "documentation.unanswered",
  );
  const indexing = useAdminData<{ items: IndexEvent[] }>("documentation.index");
  const stats = useAdminData<{ stats: DocumentationStats }>(
    "documentation.stats",
  );
  const filtered = useMemo(() => {
    const status =
      tab === "Brouillons"
        ? "draft"
        : tab === "À valider"
          ? "review"
          : tab === "Publiés"
            ? "published"
            : tab === "Archivés"
              ? "archived"
              : "";
    return (articles.data?.items || []).filter(
      (item) =>
        (!status || item.status === status) &&
        (!search ||
          `${item.title} ${item.summary}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    );
  }, [articles.data, search, tab]);
  async function reload() {
    await Promise.all([
      articles.reload(),
      categories.reload(),
      unanswered.reload(),
      indexing.reload(),
      stats.reload(),
    ]);
  }
  async function openArticle(article: Article) {
    setNotice("");
    try {
      const result = await adminApi<ArticleDetailResult>(
        "documentation.detail",
        { articleId: article.id },
      );
      setDetail(result);
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Article inaccessible",
      );
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget),
      button = event.currentTarget.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
    if (button) button.disabled = true;
    setNotice("");
    try {
      await adminApi("documentation.save", {
        articleId: editor !== "new" ? editor?.id : null,
        values: {
          category_id: values.get("category_id"),
          title: values.get("title"),
          slug: values.get("slug"),
          summary: values.get("summary"),
          content: values.get("content"),
          visibility: values.get("visibility"),
          availability: values.get("availability"),
          app_version_min: values.get("app_version_min"),
          app_version_max: values.get("app_version_max"),
          module_keys: values.get("module_keys"),
          role_keys: values.get("role_keys"),
          language: "fr",
        },
        reason: values.get("reason"),
      });
      setEditor(null);
      setNotice("Version documentaire enregistrée.");
      await reload();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Enregistrement impossible",
      );
      if (button?.isConnected) button.disabled = false;
    }
  }
  async function transition(article: Article, status: string) {
    setNotice("");
    try {
      await adminApi("documentation.transition", {
        articleId: article.id,
        status,
        reason: `Passage au statut ${status}`,
      });
      setDetail(null);
      await reload();
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "Changement de statut impossible",
      );
    }
  }
  async function restore(article: Article, version: ArticleVersion) {
    setNotice("");
    try {
      await adminApi("documentation.restore", {
        articleId: article.id,
        versionId: version.id,
      });
      setDetail(null);
      setNotice(`Version ${version.version_number} restaurée dans un nouveau brouillon.`);
      await reload();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Restauration impossible");
    }
  }
  async function duplicate(article: Article) {
    setNotice("");
    try {
      await adminApi("documentation.duplicate", { articleId: article.id });
      setDetail(null);
      setNotice("Une copie a été créée comme nouveau brouillon.");
      await reload();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Duplication impossible");
    }
  }
  async function uploadAttachment(article: Article, file: File) {
    setNotice("");
    try {
      if (file.size < 1 || file.size > 10 * 1024 * 1024) {
        throw new Error("La pièce jointe doit faire 10 Mo maximum.");
      }
      await adminApi("documentation.attachment.upload", {
        articleId: article.id,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        fileBase64: await fileAsBase64(file),
      });
      setNotice("Pièce jointe documentaire ajoutée.");
      await openArticle(article);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Ajout impossible");
    }
  }
  async function downloadAttachment(attachmentId: string) {
    setNotice("");
    try {
      const result = await adminApi<{ url: string; name: string }>(
        "documentation.attachment.download",
        { attachmentId },
      );
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.name;
      link.rel = "noopener noreferrer";
      document.body.append(link);
      link.click();
      link.remove();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Téléchargement impossible");
    }
  }
  const loading = articles.loading || categories.loading;
  return (
    <>
      <PageHeader
        eyebrow="Base de connaissance officielle"
        title="Documentation"
        description="Seuls les articles publiés et autorisés peuvent servir de source à Pilo."
        actions={
          admin?.permissions.includes("documentation.write") && (
            <button className="primary-button" onClick={() => setEditor("new")}>
              <FilePenLine /> Nouvel article
            </button>
          )
        }
      />
      {notice && <div className="inline-notice">{notice}</div>}
      <nav className="knowledge-tabs">
        {documentationTabs.map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {loading ? (
        <Loading />
      ) : articles.error ? (
        <ErrorState message={articles.error} retry={() => void reload()} />
      ) : tab === "Catégories" ? (
        <CategoryView items={categories.data?.items || []} />
      ) : tab === "Questions sans réponse" ? (
        <UnansweredView items={unanswered.data?.items || []} />
      ) : tab === "Suggestions" ? (
        <Card>
          <h2>Suggestions documentaires</h2>
          <p className="muted-copy">
            Les questions sans réponse et les retours négatifs servent à
            prioriser la documentation. Aucun article n’est publié
            automatiquement.
          </p>
          <div className="metrics-grid compact">
            <Metric
              label="Questions ouvertes"
              value={stats.data?.stats.unanswered || 0}
            />
            <Metric
              label="Réponses utiles"
              value={stats.data?.stats.helpful || 0}
            />
            <Metric
              label="Retours à revoir"
              value={stats.data?.stats.unhelpful || 0}
            />
          </div>
        </Card>
      ) : tab === "Indexation" || tab === "Historique" ? (
        <IndexView
          items={indexing.data?.items || []}
          history={tab === "Historique"}
        />
      ) : tab === "Statistiques" ? (
        <DocumentationStatistics stats={stats.data?.stats} />
      ) : (
        <>
          <section className="filters-bar">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un titre ou un résumé…"
            />
            <span>{filtered.length} article(s)</span>
          </section>
          {filtered.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Catégorie</th>
                  <th>Disponibilité</th>
                  <th>Visibilité</th>
                  <th>Version</th>
                  <th>Statut</th>
                  <th>Mise à jour</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <b>{article.title}</b>
                      <small>{article.summary}</small>
                    </td>
                    <td>{article.knowledge_categories?.name || "—"}</td>
                    <td>
                      {availabilityLabel[article.availability] ||
                        article.availability}
                    </td>
                    <td>{article.visibility}</td>
                    <td>v{article.current_version}</td>
                    <td>
                      <Badge tone={statusTone(article.status)}>
                        {article.status}
                      </Badge>
                    </td>
                    <td>{dateTime(article.updated_at)}</td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() => void openArticle(article)}
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="Aucun article"
              description="Aucun article ne correspond à cette vue."
            />
          )}
        </>
      )}
      {editor && (
        <ArticleEditor
          article={editor === "new" ? null : editor}
          categories={categories.data?.items || []}
          onClose={() => setEditor(null)}
          onSubmit={save}
          notice={notice}
        />
      )}{" "}
      {detail && (
        <ArticleDetail
          article={detail.article}
          versions={detail.versions}
          attachments={detail.attachments || []}
          canWrite={Boolean(admin?.permissions.includes("documentation.write"))}
          canPublish={Boolean(
            admin?.permissions.includes("documentation.publish"),
          )}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditor(detail.article);
            setDetail(null);
          }}
          onTransition={(status) => void transition(detail.article, status)}
          onRestore={(version) => void restore(detail.article, version)}
          onDuplicate={() => void duplicate(detail.article)}
          onUpload={(file) => void uploadAttachment(detail.article, file)}
          onDownload={(attachmentId) => void downloadAttachment(attachmentId)}
        />
      )}
    </>
  );
}

function CategoryView({ items }: { items: Category[] }) {
  return (
    <div className="category-grid">
      {items.map((item) => (
        <Card key={item.id}>
          <span className="eyebrow">{item.slug}</span>
          <h2>{item.name}</h2>
          <p>{item.description || "Aucune description."}</p>
          <small>
            Position {item.position} · {item.active ? "Active" : "Inactive"}
          </small>
        </Card>
      ))}
    </div>
  );
}
function UnansweredView({ items }: { items: Unanswered[] }) {
  return items.length ? (
    <Table>
      <thead>
        <tr>
          <th>Question</th>
          <th>Occurrences</th>
          <th>Statut</th>
          <th>Première demande</th>
          <th>Dernière demande</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <b>{item.question}</b>
              <small>
                {item.company_id?.slice(0, 8) || "Toutes entreprises"}
              </small>
            </td>
            <td>{item.occurrences}</td>
            <td>
              <Badge tone="warning">{item.status}</Badge>
            </td>
            <td>{dateTime(item.first_asked_at)}</td>
            <td>{dateTime(item.last_asked_at)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  ) : (
    <EmptyState
      title="Aucune question sans réponse"
      description="Pilo a trouvé une source officielle pour les dernières questions enregistrées."
    />
  );
}
function IndexView({
  items,
  history,
}: {
  items: IndexEvent[];
  history: boolean;
}) {
  return items.length ? (
    <Table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Article</th>
          <th>Version</th>
          <th>Événement</th>
          <th>État</th>
          <th>Détail</th>
        </tr>
      </thead>
      <tbody>
        {items
          .filter((item) => !history || item.status === "completed")
          .map((item) => (
            <tr key={item.id}>
              <td>{dateTime(item.created_at)}</td>
              <td>{item.article_id.slice(0, 8)}</td>
              <td>v{item.article_version}</td>
              <td>{item.event_type}</td>
              <td>
                <Badge
                  tone={
                    item.status === "completed"
                      ? "positive"
                      : item.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {item.status}
                </Badge>
              </td>
              <td>{item.detail || "—"}</td>
            </tr>
          ))}
      </tbody>
    </Table>
  ) : (
    <EmptyState
      title="Aucun événement d’indexation"
      description="La publication d’un article crée une opération d’indexation traçable."
    />
  );
}
function DocumentationStatistics({ stats }: { stats?: DocumentationStats }) {
  const counts = (status: string) =>
    stats?.articles.filter((item) => item.status === status).length || 0;
  return (
    <>
      <div className="metrics-grid">
        <Metric label="Articles publiés" value={counts("published")} />
        <Metric label="À valider" value={counts("review")} />
        <Metric label="Brouillons" value={counts("draft")} />
        <Metric label="Archivés" value={counts("archived")} />
        <Metric label="Recherches" value={stats?.searches || 0} />
        <Metric label="Questions ouvertes" value={stats?.unanswered || 0} />
        <Metric label="Réponses utiles" value={stats?.helpful || 0} />
        <Metric label="Retours négatifs" value={stats?.unhelpful || 0} />
      </div>
    </>
  );
}
function ArticleEditor({
  article,
  categories,
  onClose,
  onSubmit,
  notice,
}: {
  article: Article | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  notice: string;
}) {
  return (
    <Modal
      title={article ? "Modifier l’article" : "Nouvel article"}
      description="Chaque enregistrement crée une version. La publication reste une action distincte."
      onClose={onClose}
    >
      <form className="modal-form article-editor" onSubmit={onSubmit}>
        <div className="form-grid">
          <Field label="Titre">
            <input name="title" defaultValue={article?.title || ""} required />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              defaultValue={article?.slug || ""}
              placeholder="Généré depuis le titre"
            />
          </Field>
          <Field label="Catégorie">
            <select
              name="category_id"
              defaultValue={article?.category_id || categories[0]?.id}
              required
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Disponibilité réelle">
            <select
              name="availability"
              defaultValue={article?.availability || "available"}
            >
              {Object.entries(availabilityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visibilité">
            <select
              name="visibility"
              defaultValue={article?.visibility || "authenticated"}
            >
              <option value="public">Publique</option>
              <option value="authenticated">Utilisateurs connectés</option>
              <option value="company">Entreprise ciblée</option>
              <option value="internal">Interne Piloz</option>
            </select>
          </Field>
          <Field label="Version Piloz minimale (facultatif)">
            <input
              name="app_version_min"
              defaultValue={article?.app_version_min || ""}
              placeholder="Ex. 1.4.0"
              pattern="[0-9]+(\.[0-9]+){0,2}"
            />
          </Field>
          <Field label="Version Piloz maximale (facultatif)">
            <input
              name="app_version_max"
              defaultValue={article?.app_version_max || ""}
              placeholder="Ex. 2.0.0"
              pattern="[0-9]+(\.[0-9]+){0,2}"
            />
          </Field>
        </div>
        <Field label="Modules autorisés (facultatif, séparés par des virgules)">
          <input
            name="module_keys"
            defaultValue={(article?.module_keys || []).join(", ")}
            placeholder="Ex. sales, accounting — vide = tous les modules"
          />
        </Field>
        <Field label="Rôles autorisés (facultatif, séparés par des virgules)">
          <input
            name="role_keys"
            defaultValue={(article?.role_keys || []).join(", ")}
            placeholder="Ex. administrator, accountant — vide = tous les rôles"
          />
        </Field>
        <Field label="Résumé">
          <textarea name="summary" defaultValue={article?.summary || ""} />
        </Field>
        <Field label="Contenu officiel">
          <textarea
            name="content"
            className="knowledge-content"
            defaultValue={article?.content || ""}
            required
          />
        </Field>
        <Field label="Résumé des changements">
          <input name="reason" required />
        </Field>
        {notice && <p className="form-message">{notice}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button className="primary-button" type="submit">
            Enregistrer la version
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function ArticleDetail({
  article,
  versions,
  attachments,
  canWrite,
  canPublish,
  onClose,
  onEdit,
  onTransition,
  onRestore,
  onDuplicate,
  onUpload,
  onDownload,
}: {
  article: Article;
  versions: ArticleVersion[];
  attachments: KnowledgeAttachment[];
  canWrite: boolean;
  canPublish: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTransition: (status: string) => void;
  onRestore: (version: ArticleVersion) => void;
  onDuplicate: () => void;
  onUpload: (file: File) => void;
  onDownload: (attachmentId: string) => void;
}) {
  const [leftVersionId, setLeftVersionId] = useState(
    versions[1]?.id || versions[0]?.id || "",
  );
  const [rightVersionId, setRightVersionId] = useState(versions[0]?.id || "");
  const leftVersion = versions.find((version) => version.id === leftVersionId);
  const rightVersion = versions.find((version) => version.id === rightVersionId);
  return (
    <Modal
      title={article.title}
      description={`${article.slug} · version ${article.current_version}`}
      onClose={onClose}
    >
      <div className="knowledge-detail">
        <div className="detail-badges">
          <Badge tone={statusTone(article.status)}>{article.status}</Badge>
          <Badge>
            {availabilityLabel[article.availability] || article.availability}
          </Badge>
          <Badge>{article.visibility}</Badge>
        </div>
        <p>{article.summary}</p>
        <pre>
          {article.content ||
            "Rechargez l’article pour afficher son contenu complet."}
        </pre>
        <section className="knowledge-versions">
          <h3>Historique des versions</h3>
          {versions.map((version) => (
            <div key={version.id}>
              <span>
                <b>Version {version.version_number}</b>
                <small>{version.change_summary || "Sans résumé"} · {dateTime(version.created_at)}</small>
              </span>
              {canWrite && version.version_number !== article.current_version && (
                <button className="secondary-button" onClick={() => onRestore(version)}>
                  Restaurer dans un brouillon
                </button>
              )}
            </div>
          ))}
        </section>
        {versions.length > 1 && (
          <section className="knowledge-comparison">
            <h3>Comparer deux versions</h3>
            <div className="form-grid">
              <Field label="Version de gauche">
                <select
                  value={leftVersionId}
                  onChange={(event) => setLeftVersionId(event.target.value)}
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      Version {version.version_number}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Version de droite">
                <select
                  value={rightVersionId}
                  onChange={(event) => setRightVersionId(event.target.value)}
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      Version {version.version_number}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="knowledge-comparison-grid">
              <pre>{leftVersion?.content || "Contenu indisponible"}</pre>
              <pre>{rightVersion?.content || "Contenu indisponible"}</pre>
            </div>
          </section>
        )}
        <section className="knowledge-attachments">
          <h3>Images et fichiers</h3>
          {attachments.length ? (
            <div className="attachment-list">
              {attachments.map((attachment) => (
                <button
                  type="button"
                  className="secondary-button"
                  key={attachment.id}
                  onClick={() => onDownload(attachment.id)}
                >
                  {attachment.original_name} · v{attachment.article_version} ·{" "}
                  {Math.ceil(attachment.size_bytes / 1024)} Ko
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-copy">Aucune pièce jointe documentaire.</p>
          )}
          {canWrite && (
            <label className="secondary-button knowledge-upload">
              Ajouter une image ou un fichier
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.log,.md,.docx,.xlsx"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
          )}
        </section>
        <footer>
          {canWrite && (
            <button className="secondary-button" onClick={onEdit}>
              Modifier
            </button>
          )}
          {canWrite && (
            <button className="secondary-button" onClick={onDuplicate}>
              Dupliquer
            </button>
          )}
          {canWrite && article.status === "draft" && (
            <button
              className="secondary-button"
              onClick={() => onTransition("review")}
            >
              Demander validation
            </button>
          )}
          {canPublish && article.status !== "published" && (
            <button
              className="primary-button"
              onClick={() => onTransition("published")}
            >
              Publier
            </button>
          )}
          {canWrite && article.status !== "archived" && (
            <button
              className="danger-button"
              onClick={() => onTransition("archived")}
            >
              Archiver
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}

type Ticket = {
  id: string;
  ticket_number: string;
  company_id: string;
  requester_email?: string;
  subject: string;
  category: string;
  module_key?: string;
  ticket_type: string;
  priority: string;
  status: string;
  source: string;
  request_details?: Record<string, unknown> | null;
  safe_context?: Record<string, unknown> | null;
  assistant_conversation_id?: string | null;
  assigned_team_id?: string;
  assigned_admin_id?: string;
  first_response_at?: string;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
};
type TicketDetail = {
  ticket: Ticket & { description: string };
  messages: Array<{
    id: string;
    author_kind: string;
    visibility: string;
    body: string;
    sent_at?: string;
    created_at: string;
  }>;
  events: Array<{
    id: number;
    event_type: string;
    public_summary?: string;
    internal_detail?: unknown;
    created_at: string;
  }>;
  attachments: Array<{
    id: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    visibility: string;
    created_at: string;
  }>;
  teams: Array<{ id: string; name: string }>;
  admins: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  }>;
};
type Suggestion = {
  id: string;
  suggestion_number: string;
  company_id: string;
  title: string;
  description: string;
  module_key: string;
  status: string;
  priority: string;
  created_at: string;
  companies?: { name: string } | null;
};
const supportTabs = [
  "Tickets",
  "File d’attente",
  "Mes tickets",
  "Entreprises",
  "Documentation",
  "Questions sans réponse",
  "Suggestions produit",
  "Réponses enregistrées",
  "Équipes",
  "SLA",
  "Statistiques",
  "Paramètres",
] as const;

export function SupportPage() {
  const navigate = useNavigate(),
    { admin } = useAuth(),
    [tab, setTab] = useState<(typeof supportTabs)[number]>("File d’attente"),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<TicketDetail | null>(null),
    [notice, setNotice] = useState("");
  const status = tab === "File d’attente" ? "new" : "",
    mine = tab === "Mes tickets";
  const tickets = useAdminData<{ items: Ticket[]; total: number }>(
    "support.v2.list",
    { status, mine, pageSize: 200 },
  );
  const suggestions = useAdminData<{ items: Suggestion[] }>("suggestions.list");
  const saved = useAdminData<{
    items: Array<{
      id: string;
      title: string;
      body: string;
      category?: string;
    }>;
  }>("support.saved_replies");
  const settings = useAdminData<{
    teams: Array<{
      id: string;
      name: string;
      description?: string;
      active: boolean;
    }>;
    policies: Array<{
      id: string;
      name: string;
      priority: string;
      first_response_minutes: number;
      resolution_minutes: number;
      active: boolean;
    }>;
    replies: Array<{
      id: string;
      title: string;
      body: string;
      category?: string;
      active: boolean;
    }>;
  }>("support.settings");
  const unanswered = useAdminData<{ items: Unanswered[] }>(
    "documentation.unanswered",
  );
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    setNotice("");
    void adminApi<TicketDetail>("support.v2.detail", { ticketId: selected })
      .then(setDetail)
      .catch((reason) =>
        setNotice(
          reason instanceof Error ? reason.message : "Ticket inaccessible",
        ),
      );
  }, [selected]);
  async function refresh() {
    await tickets.reload();
    if (selected)
      setDetail(await adminApi("support.v2.detail", { ticketId: selected }));
  }
  async function update(values: Record<string, unknown>, reason: string) {
    if (!selected) return;
    setNotice("");
    try {
      await adminApi("support.v2.update", {
        ticketId: selected,
        values,
        reason,
      });
      await refresh();
    } catch (reasonValue) {
      setNotice(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Modification impossible",
      );
    }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const values = new FormData(event.currentTarget),
      button = event.currentTarget.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
    if (button) button.disabled = true;
    setNotice("");
    try {
      await adminApi("support.v2.message", {
        ticketId: selected,
        body: values.get("body"),
        visibility: values.get("visibility"),
        status: values.get("status"),
        reason: "Traitement du ticket",
      });
      event.currentTarget.reset();
      await refresh();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Envoi impossible");
      if (button?.isConnected) button.disabled = false;
    }
  }
  async function downloadAttachment(attachmentId: string) {
    setNotice("");
    try {
      const result = await adminApi<{ url: string }>("support.v2.attachment", {
        attachmentId,
      });
      if (!result.url) throw new Error("Lien temporaire indisponible");
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Téléchargement impossible",
      );
    }
  }
  const items = tickets.data?.items || [],
    companies = Array.from(
      new Map(
        items.map((item) => [
          item.company_id,
          {
            id: item.company_id,
            name: item.companies?.name || item.company_id.slice(0, 8),
          },
        ]),
      ).values(),
    );
  return (
    <>
      <PageHeader
        eyebrow="Assistance réelle"
        title="Support"
        description="Tickets clients, réponses visibles, notes internes et brouillons sont strictement séparés."
      />
      <nav className="knowledge-tabs">
        {supportTabs.map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => {
              setSelected(null);
              setTab(item);
            }}
          >
            {item}
          </button>
        ))}
      </nav>
      {notice && <div className="inline-notice">{notice}</div>}
      {tab === "Documentation" ? (
        <Card className="support-link-card">
          <BookOpen />
          <div>
            <h2>Base documentaire</h2>
            <p>
              Créer, valider et publier les sources officielles utilisées par
              Pilo.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => navigate("/documentation")}
          >
            Ouvrir <ChevronRight />
          </button>
        </Card>
      ) : tab === "Questions sans réponse" ? (
        <UnansweredView items={unanswered.data?.items || []} />
      ) : tab === "Suggestions produit" ? (
        <SuggestionView
          items={suggestions.data?.items || []}
          canWrite={Boolean(admin?.permissions.includes("suggestions.write"))}
          onUpdated={() => void suggestions.reload()}
        />
      ) : tab === "Réponses enregistrées" ? (
        <SavedReplies items={saved.data?.items || []} />
      ) : tab === "Équipes" ? (
        <Teams items={settings.data?.teams || []} />
      ) : tab === "SLA" ? (
        <Sla items={settings.data?.policies || []} />
      ) : tab === "Paramètres" ? (
        <SupportSettings />
      ) : tab === "Statistiques" ? (
        <SupportStats items={items} />
      ) : tab === "Entreprises" ? (
        <Card>
          <h2>Entreprises présentes dans la file chargée</h2>
          {companies.map((company) => (
            <p key={company.id}>
              <b>{company.name}</b>{" "}
              <small>
                {items.filter((item) => item.company_id === company.id).length}{" "}
                ticket(s)
              </small>
            </p>
          ))}
        </Card>
      ) : tickets.loading ? (
        <Loading />
      ) : tickets.error ? (
        <ErrorState
          message={tickets.error}
          retry={() => void tickets.reload()}
        />
      ) : (
        <div className="support-workspace">
          <section>
            {items.length ? (
              <Table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Entreprise</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th>Source</th>
                    <th>Mise à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={selected === item.id ? "selected-row" : ""}
                      onClick={() => setSelected(item.id)}
                    >
                      <td>
                        <b>{item.ticket_number}</b>
                        <small>{item.subject}</small>
                      </td>
                      <td>
                        {item.companies?.name || item.company_id.slice(0, 8)}
                      </td>
                      <td>
                        <Badge
                          tone={
                            item.priority === "urgent"
                              ? "danger"
                              : item.priority === "high"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {item.priority}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={statusTone(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td>{item.source}</td>
                      <td>{dateTime(item.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState
                title="Aucun ticket"
                description="Aucun ticket réel ne correspond à cette file."
              />
            )}
          </section>
          <aside>
            {selected ? (
              detail ? (
                <TicketPanel
                  detail={detail}
                  savedReplies={saved.data?.items || []}
                  canAssign={Boolean(
                    admin?.permissions.includes("support.assign"),
                  )}
                  onClose={() => setSelected(null)}
                  onUpdate={update}
                  onSend={send}
                  onDownload={downloadAttachment}
                />
              ) : (
                <Loading />
              )
            ) : (
              <div className="support-placeholder">
                <Headphones />
                <h3>Sélectionnez un ticket</h3>
                <p>
                  Le fil client, les notes internes et l’historique apparaîtront
                  ici.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function TicketPanel({
  detail,
  savedReplies,
  canAssign,
  onClose,
  onUpdate,
  onSend,
  onDownload,
}: {
  detail: TicketDetail;
  savedReplies: Array<{ id: string; title: string; body: string }>;
  canAssign: boolean;
  onClose: () => void;
  onUpdate: (values: Record<string, unknown>, reason: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onDownload: (attachmentId: string) => void;
}) {
  const [reply, setReply] = useState("");
  const [replyVisibility, setReplyVisibility] = useState("client");
  return (
    <div className="ticket-panel">
      <header>
        <div>
          <span className="eyebrow">{detail.ticket.ticket_number}</span>
          <h2>{detail.ticket.subject}</h2>
          <p>
            {detail.ticket.companies?.name} · {detail.ticket.requester_email}
          </p>
        </div>
        <button className="icon-button" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="ticket-controls">
        <Field label="Statut">
          <select
            value={detail.ticket.status}
            disabled={!canAssign}
            onChange={(event) =>
              onUpdate(
                { status: event.target.value },
                "Changement de statut support",
              )
            }
          >
            <option value="new">Nouveau</option>
            <option value="to_qualify">À qualifier</option>
            <option value="in_progress">En cours</option>
            <option value="waiting_customer">En attente client</option>
            <option value="waiting_internal">En attente interne</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Clos</option>
          </select>
        </Field>
        <Field label="Priorité">
          <select
            value={detail.ticket.priority}
            disabled={!canAssign}
            onChange={(event) =>
              onUpdate(
                { priority: event.target.value },
                "Changement de priorité support",
              )
            }
          >
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>
        </Field>
        <Field label="Équipe">
          <select
            value={detail.ticket.assigned_team_id || ""}
            disabled={!canAssign}
            onChange={(event) =>
              onUpdate(
                { assigned_team_id: event.target.value },
                "Affectation à une équipe",
              )
            }
          >
            <option value="">Non affecté</option>
            {detail.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Agent">
          <select
            value={detail.ticket.assigned_admin_id || ""}
            disabled={!canAssign}
            onChange={(event) =>
              onUpdate(
                { assigned_admin_id: event.target.value },
                "Affectation à un agent",
              )
            }
          >
            <option value="">Non affecté</option>
            {detail.admins.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {[agent.first_name, agent.last_name]
                  .filter(Boolean)
                  .join(" ") || agent.email}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <section className="ticket-thread">
        <article className="thread-origin">
          <b>Demande initiale</b>
          <p>{detail.ticket.description}</p>
        </article>
        {detail.ticket.request_details &&
          Object.keys(detail.ticket.request_details).length > 0 && (
            <article className="ticket-intake-summary">
              <header>
                <b>Qualification transmise par le client</b>
              </header>
              <dl>
                {Object.entries(detail.ticket.request_details).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt>{supportDetailLabel(key)}</dt>
                      <dd>{supportDetailValue(value)}</dd>
                    </div>
                  ),
                )}
              </dl>
            </article>
          )}
        {detail.ticket.safe_context &&
          Object.keys(detail.ticket.safe_context).length > 0 && (
            <details className="ticket-safe-context">
              <summary>Contexte applicatif autorisé</summary>
              <dl>
                {Object.entries(detail.ticket.safe_context).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt>{supportContextLabel(key)}</dt>
                      <dd>{supportDetailValue(value)}</dd>
                    </div>
                  ),
                )}
              </dl>
              {detail.ticket.assistant_conversation_id && (
                <p>
                  Conversation Pilo liée :
                  <code>{detail.ticket.assistant_conversation_id}</code>
                </p>
              )}
            </details>
          )}
        {detail.messages.map((message) => (
          <article
            key={message.id}
            className={`thread-message ${message.author_kind} ${message.visibility}`}
          >
            <header>
              <b>
                {message.visibility === "internal"
                  ? "Note interne"
                  : message.visibility === "draft"
                    ? "Brouillon non envoyé"
                    : message.author_kind === "client"
                      ? "Client"
                      : "Support Piloz"}
              </b>
              <small>{dateTime(message.created_at)}</small>
            </header>
            <p>{message.body}</p>
          </article>
        ))}
      </section>
      {detail.attachments.length > 0 && (
        <section className="ticket-attachments">
          <h3>Pièces jointes</h3>
          {detail.attachments.map((file) => (
            <button
              type="button"
              className="secondary-button"
              key={file.id}
              onClick={() => onDownload(file.id)}
            >
              {file.original_name} · {Math.ceil(file.size_bytes / 1024)} Ko ·{" "}
              {file.visibility}
            </button>
          ))}
        </section>
      )}
      <form className="ticket-reply" onSubmit={onSend}>
        <div className="form-grid">
          <Field label="Type">
            <select
              name="visibility"
              value={replyVisibility}
              onChange={(event) => setReplyVisibility(event.target.value)}
            >
              <option value="client">Réponse visible par le client</option>
              <option value="internal">Note interne</option>
              <option value="draft">Brouillon non envoyé</option>
            </select>
          </Field>
          <Field label="Après envoi">
            <select name="status">
              <option value="waiting_customer">En attente du client</option>
              <option value="in_progress">Rester en cours</option>
              <option value="resolved">Résolu</option>
            </select>
          </Field>
        </div>
        {savedReplies.length > 0 && (
          <Field label="Réponse enregistrée">
            <select
              value=""
              onChange={(event) =>
                setReply(
                  savedReplies.find((item) => item.id === event.target.value)
                    ?.body || reply,
                )
              }
            >
              <option value="">Choisir…</option>
              {savedReplies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Message">
          <textarea
            name="body"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            required
          />
        </Field>
        <button className="primary-button" type="submit">
          <Send /> {replyVisibility === "client"
            ? "Envoyer au client"
            : replyVisibility === "internal"
              ? "Ajouter la note interne"
              : "Enregistrer le brouillon"}
        </button>
      </form>
    </div>
  );
}

const supportDetailLabels: Record<string, string> = {
  impact: "Impact",
  frequency: "Fréquence",
  started_on: "Date de début",
  blocking: "Blocage",
  expected: "Résultat attendu",
  observed: "Résultat observé",
  reproduction: "Étapes de reproduction",
};
const supportContextLabels: Record<string, string> = {
  route: "Page",
  module: "Module",
  submodule: "Sous-module",
  object_type: "Type d’objet",
  object_status: "Statut de l’objet",
  available_actions: "Actions disponibles",
  user_role: "Rôle utilisateur",
  permissions: "Permissions autorisées",
  language: "Langue",
  app_version: "Version Piloz",
  object_id: "Identifiant technique autorisé",
};
function supportDetailLabel(key: string) {
  return supportDetailLabels[key] || key.replaceAll("_", " ");
}
function supportContextLabel(key: string) {
  return supportContextLabels[key] || key.replaceAll("_", " ");
}
function supportDetailValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ") || "—";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function SuggestionView({
  items,
  canWrite,
  onUpdated,
}: {
  items: Suggestion[];
  canWrite: boolean;
  onUpdated: () => void;
}) {
  async function change(item: Suggestion, status: string) {
    await adminApi("suggestions.update", {
      suggestionId: item.id,
      status,
      reason: "Qualification produit",
    });
    onUpdated();
  }
  return items.length ? (
    <Table>
      <thead>
        <tr>
          <th>Suggestion</th>
          <th>Entreprise</th>
          <th>Module</th>
          <th>Priorité</th>
          <th>Statut</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <b>
                {item.suggestion_number} · {item.title}
              </b>
              <small>{item.description}</small>
            </td>
            <td>{item.companies?.name || item.company_id.slice(0, 8)}</td>
            <td>{item.module_key}</td>
            <td>{item.priority}</td>
            <td>
              {canWrite ? (
                <select
                  value={item.status}
                  onChange={(event) => void change(item, event.target.value)}
                >
                  <option value="received">Reçue</option>
                  <option value="reviewing">À étudier</option>
                  <option value="planned">Planifiée</option>
                  <option value="roadmap">Roadmap</option>
                  <option value="rejected">Non retenue</option>
                  <option value="delivered">Livrée</option>
                </select>
              ) : (
                item.status
              )}
            </td>
            <td>{dateTime(item.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  ) : (
    <EmptyState
      title="Aucune suggestion produit"
      description="Aucune suggestion réelle n’a été enregistrée."
    />
  );
}
function SavedReplies({
  items,
}: {
  items: Array<{ id: string; title: string; body: string; category?: string }>;
}) {
  return (
    <div className="category-grid">
      {items.map((item) => (
        <Card key={item.id}>
          <span className="eyebrow">{item.category || "Général"}</span>
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </Card>
      ))}
    </div>
  );
}
function Teams({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    description?: string;
    active: boolean;
  }>;
}) {
  return (
    <div className="category-grid">
      {items.map((item) => (
        <Card key={item.id}>
          <Badge tone={item.active ? "positive" : "neutral"}>
            {item.active ? "Active" : "Inactive"}
          </Badge>
          <h2>{item.name}</h2>
          <p>{item.description || "—"}</p>
        </Card>
      ))}
    </div>
  );
}
function Sla({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    priority: string;
    first_response_minutes: number;
    resolution_minutes: number;
    active: boolean;
  }>;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <th>Politique</th>
          <th>Priorité</th>
          <th>Première réponse</th>
          <th>Résolution</th>
          <th>État</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.priority}</td>
            <td>{item.first_response_minutes} min</td>
            <td>{item.resolution_minutes} min</td>
            <td>{item.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
function SupportStats({ items }: { items: Ticket[] }) {
  return (
    <div className="metrics-grid">
      <Metric label="Tickets chargés" value={items.length} />
      <Metric
        label="Nouveaux"
        value={items.filter((item) => item.status === "new").length}
      />
      <Metric
        label="En cours"
        value={items.filter((item) => item.status === "in_progress").length}
      />
      <Metric
        label="En attente client"
        value={
          items.filter((item) => item.status === "waiting_customer").length
        }
      />
      <Metric
        label="Urgents"
        value={items.filter((item) => item.priority === "urgent").length}
      />
      <Metric
        label="Résolus"
        value={items.filter((item) => item.status === "resolved").length}
      />
    </div>
  );
}
function SupportSettings() {
  return (
    <Card className="notice-card">
      <ShieldAlert />
      <div>
        <h3>Paramètres du support</h3>
        <p>
          Les SLA, équipes et réponses enregistrées proviennent uniquement des
          données réelles. Aucun délai de réponse atteint n’est simulé.
        </p>
      </div>
    </Card>
  );
}
