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
  ReauthFields,
  Table,
} from "../components/Ui";
import { adminApi } from "../lib/api";
import { date, statusLabel } from "../lib/format";
import { reauthenticateAdmin } from "../lib/reauth";
import { useAdminData } from "../lib/useAdminData";

type Trial = {
  company_id: string;
  plan_key: string;
  status: string;
  trial_started_at: string;
  trial_ends_at: string;
  companies: { name: string; platform_status: string } | null;
  subscription_plan_versions: { name: string } | null;
};

export function TrialsPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAdminData<{ items: Trial[] }>(
    "trials.list",
  );
  const [selected, setSelected] = useState<Trial | null>(null);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const values = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (button) button.disabled = true;
    setMessage("");
    try {
      await reauthenticateAdmin(
        admin!.email,
        String(values.get("password") || ""),
        String(values.get("totp") || ""),
      );
      await adminApi("subscriptions.manage", {
        companyId: selected.company_id,
        operation: values.get("operation"),
        parameters: { days: Number(values.get("days") || 14) },
        reason: values.get("reason"),
      });
      setSelected(null);
      await reload();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Action impossible");
      if (button?.isConnected) button.disabled = false;
    }
  }

  const canCreate =
    admin?.permissions.includes("companies.write") &&
    admin?.permissions.includes("subscriptions.write");

  return (
    <>
      <PageHeader
        eyebrow="Acquisition"
        title="Essais gratuits"
        description="Suivez les essais, prolongez-les ou convertissez-les en abonnement."
        actions={
          canCreate ? (
            <button
              className="primary-button"
              onClick={() => navigate("/companies/new?mode=trial")}
            >
              Démarrer un essai gratuit
            </button>
          ) : undefined
        }
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : data?.items.length ? (
        <Table>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Plan essayé</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Jours restants</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => {
              const days = Math.ceil(
                (new Date(row.trial_ends_at).getTime() - Date.now()) /
                  86_400_000,
              );
              return (
                <tr key={row.company_id}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => navigate(`/companies/${row.company_id}`)}
                    >
                      {row.companies?.name || row.company_id.slice(0, 8)}
                    </button>
                  </td>
                  <td>
                    {row.subscription_plan_versions?.name || row.plan_key}
                  </td>
                  <td>{date(row.trial_started_at)}</td>
                  <td>{date(row.trial_ends_at)}</td>
                  <td>
                    <Badge
                      tone={days < 3 ? "danger" : days < 7 ? "warning" : "info"}
                    >
                      {Math.max(0, days)} jours
                    </Badge>
                  </td>
                  <td>{statusLabel(row.status)}</td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => setSelected(row)}
                    >
                      Gérer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="Aucun essai en cours"
          description="Créez un essai gratuit pour envoyer une invitation et activer 14 jours d’accès."
        />
      )}
      {selected && (
        <Modal
          title={`Gérer l’essai · ${selected.companies?.name || selected.company_id}`}
          description="Cette action est historisée dans le journal d’audit."
          onClose={() => setSelected(null)}
        >
          <form className="modal-form" onSubmit={submit}>
            <Field label="Action">
              <select name="operation">
                <option value="extend_trial">Prolonger l’essai</option>
                <option value="activate_manual">
                  Convertir en abonnement manuel
                </option>
                <option value="end_trial">Terminer l’essai</option>
              </select>
            </Field>
            <Field label="Jours à ajouter">
              <input
                name="days"
                type="number"
                min={1}
                max={365}
                defaultValue={14}
              />
            </Field>
            <Field label="Motif obligatoire">
              <textarea name="reason" required maxLength={500} />
            </Field>
            <ReauthFields />
            {message && <p className="form-message">{message}</p>}
            <footer>
              <button type="button" onClick={() => setSelected(null)}>
                Annuler
              </button>
              <button type="submit" className="primary-button">
                Confirmer
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
