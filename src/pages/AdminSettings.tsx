import {
  Activity,
  BookOpen,
  BookOpenCheck,
  ChevronRight,
  CircleDollarSign,
  FileClock,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserRoundCog,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/Ui";

const sections = [
  {
    to: "/subscriptions",
    title: "Abonnement",
    description: "Abonnements actifs, suspendus, résiliés et changements d’offre.",
    permission: "subscriptions.read",
    icon: WalletCards,
  },
  {
    to: "/plans",
    title: "Plans et fonctionnalités",
    description: "Offres commerciales, limites, tarifs et fonctionnalités incluses.",
    permission: "plans.read",
    icon: Settings,
  },
  {
    to: "/billing",
    title: "Facturation Piloz",
    description: "Paiements Stripe, factures Piloz et suivi de la facturation SaaS.",
    permission: "billing.read",
    icon: ReceiptText,
  },
  {
    to: "/revenue",
    title: "Revenus",
    description: "Revenus récurrents, évolution et indicateurs financiers.",
    permission: "revenue.read",
    icon: CircleDollarSign,
  },
  {
    to: "/documentation",
    title: "Documentation",
    description: "Articles d’aide, contenus publiés et base de connaissances.",
    permission: "documentation.read",
    icon: BookOpen,
  },
  {
    to: "/compliance",
    title: "Conformité",
    description: "Contrôles réglementaires, fiscalité et état des obligations.",
    permission: "compliance.read",
    icon: BookOpenCheck,
  },
  {
    to: "/system",
    title: "Système",
    description: "Santé de la plateforme, traitements et état des services.",
    permission: "system.read",
    icon: Activity,
  },
  {
    to: "/audit",
    title: "Journal d’audit",
    description: "Traçabilité des actions sensibles réalisées dans le back-office.",
    permission: "audit.read",
    icon: FileClock,
  },
  {
    to: "/admins",
    title: "Équipe administrative",
    description: "Administrateurs Piloz, rôles internes et accès à la plateforme.",
    permission: "admin.read",
    icon: ShieldCheck,
  },
] as const;

export function AdminSettingsPage() {
  const { admin } = useAuth();
  const visible = sections.filter((section) =>
    admin?.permissions.includes(section.permission),
  );

  return (
    <>
      <PageHeader
        eyebrow="Configuration de la plateforme"
        title="Paramètres"
        description="Retrouvez les réglages administratifs de Piloz dans un espace unique."
      />
      <div className="admin-settings-grid">
        {visible.map(({ to, title, description, icon: Icon }) => (
          <Link className="admin-settings-card" to={to} key={to}>
            <span className="admin-settings-icon">
              <Icon />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ChevronRight />
          </Link>
        ))}
      </div>
      {admin?.permissions.includes("profile.read") && (
        <Link className="admin-profile-settings" to="/settings/profile">
          <UserRoundCog />
          <span>
            <strong>Profil et sécurité</strong>
            <small>Vos informations, votre mot de passe et vos sessions.</small>
          </span>
          <ChevronRight />
        </Link>
      )}
    </>
  );
}
