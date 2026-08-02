import { useState, type FormEvent } from "react";
import { KeyRound, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { Badge, Card, Field, Modal, PageHeader, ReauthFields } from "../components/Ui";
import { adminApi } from "../lib/api";
import { roleLabel } from "../lib/format";
import { reauthenticateAdmin } from "../lib/reauth";
import { supabase } from "../lib/supabase";

type MfaResetResult = {
  reset: boolean;
  deletedFactors: number;
};

export function SettingsPage() {
  const { admin, refresh, signOut } = useAuth();
  const [message, setMessage] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setMessage("");
    try {
      await adminApi("profile.update", {
        values: {
          first_name: values.get("first_name"),
          last_name: values.get("last_name"),
          timezone: values.get("timezone"),
          language: values.get("language"),
          theme: values.get("theme"),
        },
      });
      await refresh();
      setMessage("Profil enregistré.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Enregistrement impossible");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = String(values.get("new_password") || "");
    setMessage("");
    try {
      await reauthenticateAdmin(admin!.email, "", "");
      if (next.length < 12) {
        throw new Error("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setPasswordOpen(false);
      setMessage("Mot de passe mis à jour.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Modification impossible");
    }
  }

  async function resetMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const reason = String(values.get("reason") || "").trim();
    setMessage("");
    setBusy(true);
    try {
      await reauthenticateAdmin(admin!.email, "", "");
      const result = await adminApi<MfaResetResult>("profile.mfa_reset", { reason });
      if (!result.reset) throw new Error("La 2FA n’a pas pu être réinitialisée.");
      await supabase.auth.signOut({ scope: "global" });
      await signOut();
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Réinitialisation 2FA impossible");
    }
  }

  async function revokeAll() {
    await supabase.auth.signOut({ scope: "global" });
    await signOut();
  }

  return (
    <>
      <PageHeader
        eyebrow="Compte plateforme"
        title="Paramètres administrateur"
        description="Les protections essentielles, notamment la double authentification, restent obligatoires."
      />
      {message && <div className="inline-notice">{message}</div>}
      <div className="detail-grid">
        <Card>
          <div className="card-header">
            <div>
              <h2>Profil</h2>
              <p>{admin?.email}</p>
            </div>
            <ShieldCheck />
          </div>
          <form className="modal-form" onSubmit={saveProfile}>
            <div className="form-grid">
              <Field label="Prénom">
                <input name="first_name" defaultValue={admin?.first_name || ""} />
              </Field>
              <Field label="Nom">
                <input name="last_name" defaultValue={admin?.last_name || ""} />
              </Field>
              <Field label="Fuseau horaire">
                <select name="timezone" defaultValue="Europe/Paris">
                  <option>Europe/Paris</option>
                  <option>UTC</option>
                </select>
              </Field>
              <Field label="Langue">
                <select name="language" defaultValue="fr">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Thème">
                <select name="theme" defaultValue="light">
                  <option value="light">Clair</option>
                </select>
              </Field>
            </div>
            <button className="primary-button" type="submit">
              Enregistrer le profil
            </button>
          </form>
        </Card>
        <Card>
          <div className="card-header">
            <div>
              <h2>Sécurité</h2>
              <p>Actions sensibles réservées à ta session administrateur MFA.</p>
            </div>
            <KeyRound />
          </div>
          <dl className="details">
            <div>
              <dt>Rôle</dt>
              <dd>{roleLabel(admin?.role || "")}</dd>
            </div>
            <div>
              <dt>Double authentification</dt>
              <dd>
                <Badge tone={admin?.aal === "aal2" ? "positive" : "warning"}>
                  {admin?.aal === "aal2" ? "Active · AAL2" : "À vérifier"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Session inactive</dt>
              <dd>Déconnexion après 20 minutes</dd>
            </div>
          </dl>
          <div className="stack-actions">
            <button className="secondary-button" type="button" onClick={() => setPasswordOpen(true)}>
              Changer mon mot de passe
            </button>
            <button className="secondary-button" type="button" onClick={() => setMfaOpen(true)}>
              <RotateCcw size={16} /> Refaire ma 2FA
            </button>
            <button className="danger-button" type="button" onClick={() => void revokeAll()}>
              <LogOut size={16} /> Révoquer toutes mes sessions
            </button>
          </div>
        </Card>
      </div>

      {passwordOpen && (
        <Modal
          title="Changer le mot de passe"
          description="Votre session MFA active protège cette modification."
          onClose={() => setPasswordOpen(false)}
        >
          <form className="modal-form" onSubmit={changePassword}>
            <Field label="Nouveau mot de passe">
              <input name="new_password" type="password" minLength={12} autoComplete="new-password" required />
            </Field>
            <ReauthFields />
            <footer>
              <button type="button" onClick={() => setPasswordOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="primary-button">
                Mettre à jour
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {mfaOpen && (
        <Modal
          title="Refaire ma 2FA"
          description="Cette opération supprime l’ancien authentificateur et force l’enrôlement d’un nouveau QR code."
          onClose={() => (busy ? undefined : setMfaOpen(false))}
        >
          <form className="modal-form" onSubmit={resetMfa}>
            <div className="danger-note">
              <ShieldCheck />
              <span>
                Après confirmation, tu seras déconnecté. À la prochaine connexion, Piloz Admin affichera un
                nouveau QR code à scanner dans ton application d’authentification.
              </span>
            </div>
            <Field label="Motif obligatoire">
              <textarea
                name="reason"
                required
                maxLength={500}
                defaultValue="Réinitialisation de ma double authentification administrateur"
              />
            </Field>
            <ReauthFields />
            <footer>
              <button type="button" onClick={() => setMfaOpen(false)} disabled={busy}>
                Annuler
              </button>
              <button type="submit" className="danger-button" disabled={busy}>
                {busy ? "Réinitialisation…" : "Réinitialiser et me reconnecter"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
