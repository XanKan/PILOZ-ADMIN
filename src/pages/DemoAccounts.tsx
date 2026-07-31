import { MonitorPlay, PauseCircle, PlayCircle, Trash2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
  Table,
} from "../components/Ui";
import { adminApi } from "../lib/api";
import { date, dateTime, statusLabel } from "../lib/format";
import { useAdminData } from "../lib/useAdminData";

type DemoAccount = {
  id: string;
  name: string;
  owner_email: string | null;
  platform_status: string;
  created_at: string;
  company_settings:
    | { email?: string | null; trade_name?: string | null }
    | { email?: string | null; trade_name?: string | null }[]
    | null;
  subscriptions:
    | {
        plan_key: string;
        status: string;
        trial_started_at: string | null;
        trial_ends_at: string | null;
      }
    | {
        plan_key: string;
        status: string;
        trial_started_at: string | null;
        trial_ends_at: string | null;
      }[]
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

export function DemoAccountsPage() {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const { data, loading, error, reload } = useAdminData<{
    items: DemoAccount[];
  }>("demo_accounts.list");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [accountAction, setAccountAction] = useState<{
    account: DemoAccount;
    type: "suspend" | "reactivate" | "delete";
  } | null>(null);
  const canCreate =
    admin?.permissions.includes("companies.write") &&
    admin?.permissions.includes("users.write") &&
    admin?.permissions.includes("subscriptions.write");
  const canSuspend = admin?.permissions.includes("companies.suspend");
  const canDelete = canCreate;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      const result = await adminApi<{ message: string }>(
        "demo_accounts.create",
        {
          firstName: values.get("first_name"),
          lastName: values.get("last_name"),
          email: values.get("email"),
          reason: "Création d’un compte de démonstration depuis Piloz Admin",
        },
      );
      setOpen(false);
      setSuccess(result.message);
      await reload();
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Création impossible",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitAccountAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountAction || busy) return;
    const values = new FormData(event.currentTarget);
    if (
      accountAction.type === "delete" &&
      values.get("confirmation") !== "SUPPRIMER"
    ) {
      setMessage("Saisissez SUPPRIMER pour confirmer la suppression définitive.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await adminApi<{ message: string }>(
        accountAction.type === "delete"
          ? "demo_accounts.delete"
          : "companies.suspension",
        accountAction.type === "delete"
          ? {
              companyId: accountAction.account.id,
              reason: values.get("reason"),
            }
          : {
              companyId: accountAction.account.id,
              suspended: accountAction.type === "suspend",
              level: "full",
              reason: values.get("reason"),
            },
      );
      setAccountAction(null);
      setSuccess(
        result.message ||
          (accountAction.type === "delete"
            ? "Compte de démonstration supprimé."
            : "Statut du compte mis à jour."),
      );
      await reload();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Démonstration commerciale"
        title="Compte démo"
        description="Créez un environnement isolé, prérempli de données fictives et valable 14 jours."
        actions={
          canCreate ? (
            <button className="primary-button" onClick={() => setOpen(true)}>
              <UserPlus /> Créer un compte démo
            </button>
          ) : undefined
        }
      />
      <div className="inline-notice demo-security-notice">
        <MonitorPlay />
        <span>
          Le destinataire reçoit son adresse de connexion et un mot de passe
          temporaire par e-mail. Ce mot de passe n’est jamais affiché ni
          conservé dans Piloz Admin.
        </span>
      </div>
      {success && <div className="inline-notice positive">{success}</div>}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={() => void reload()} />
      ) : data?.items.length ? (
        <Table>
          <thead>
            <tr>
              <th>Compte de démonstration</th>
              <th>Destinataire</th>
              <th>Plan</th>
              <th>Fin de l’essai</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => {
              const settings = one(item.company_settings);
              const subscription = one(item.subscriptions);
              return (
                <tr key={item.id}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => navigate(`/companies/${item.id}`)}
                    >
                      {settings?.trade_name || item.name}
                    </button>
                    <small className="table-subtitle">Données fictives</small>
                  </td>
                  <td>{item.owner_email || settings?.email || "—"}</td>
                  <td>{subscription?.plan_key || "—"}</td>
                  <td>
                    {subscription?.trial_ends_at
                      ? date(subscription.trial_ends_at)
                      : "—"}
                  </td>
                  <td>
                    <Badge
                      tone={
                        subscription?.status === "trialing"
                          ? "info"
                          : subscription?.status === "active"
                            ? "positive"
                            : "neutral"
                      }
                    >
                      {statusLabel(
                        subscription?.status || item.platform_status,
                      )}
                    </Badge>
                  </td>
                  <td>{dateTime(item.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      {canSuspend && item.platform_status !== "suspended" && (
                        <button
                          className="secondary-button"
                          onClick={() =>
                            setAccountAction({ account: item, type: "suspend" })
                          }
                        >
                          <PauseCircle /> Suspendre
                        </button>
                      )}
                      {canSuspend && item.platform_status === "suspended" && (
                        <button
                          className="secondary-button"
                          onClick={() =>
                            setAccountAction({ account: item, type: "reactivate" })
                          }
                        >
                          <PlayCircle /> Réactiver
                        </button>
                      )}
                      {canDelete && item.platform_status === "suspended" && (
                        <button
                          className="danger-button"
                          onClick={() =>
                            setAccountAction({ account: item, type: "delete" })
                          }
                        >
                          <Trash2 /> Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="Aucun compte démo"
          description="Créez votre premier environnement de démonstration prérempli."
        />
      )}
      {open && (
        <Modal
          title="Créer un compte démo"
          description="Une fausse société et des données fictives seront créées. Les accès temporaires seront envoyés directement par e-mail."
          onClose={() => setOpen(false)}
        >
          <form className="modal-form" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Prénom">
                <input
                  name="first_name"
                  required
                  maxLength={100}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Nom">
                <input
                  name="last_name"
                  required
                  maxLength={100}
                  autoComplete="family-name"
                />
              </Field>
            </div>
            <Field label="Adresse e-mail">
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </Field>
            <div className="demo-account-summary">
              <strong>Création automatique</strong>
              <span>Entreprise fictive Horizon Conseil</span>
              <span>Clients, articles et activités de démonstration</span>
              <span>Essai gratuit de 14 jours</span>
            </div>
            {message && (
              <p className="form-message" role="alert">
                {message}
              </p>
            )}
            <footer>
              <button type="button" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button className="primary-button" disabled={busy}>
                {busy ? "Création en cours…" : "Créer et envoyer les accès"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {accountAction && (
        <Modal
          title={
            accountAction.type === "delete"
              ? "Supprimer définitivement ce compte démo"
              : accountAction.type === "suspend"
                ? "Suspendre ce compte démo"
                : "Réactiver ce compte démo"
          }
          description={
            accountAction.type === "delete"
              ? "Cette opération efface la société fictive, ses données de démonstration et son compte de connexion. Elle est irréversible."
              : "Le changement prend effet immédiatement et sera journalisé."
          }
          onClose={() => setAccountAction(null)}
        >
          <form className="modal-form" onSubmit={submitAccountAction}>
            <Field label="Motif obligatoire">
              <textarea
                name="reason"
                required
                maxLength={500}
                defaultValue={
                  accountAction.type === "delete"
                    ? "Suppression d’un compte de démonstration arrivé à son terme"
                    : accountAction.type === "suspend"
                      ? "Suspension du compte de démonstration"
                      : "Réactivation du compte de démonstration"
                }
              />
            </Field>
            {accountAction.type === "delete" && (
              <Field label="Confirmation — saisissez SUPPRIMER">
                <input name="confirmation" required autoComplete="off" />
              </Field>
            )}
            {message && <p className="form-message">{message}</p>}
            <footer>
              <button type="button" onClick={() => setAccountAction(null)}>
                Annuler
              </button>
              <button
                className={
                  accountAction.type === "delete"
                    ? "danger-button"
                    : "primary-button"
                }
                disabled={busy}
              >
                {busy ? "Traitement…" : "Confirmer"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
