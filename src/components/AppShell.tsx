import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  BookOpenCheck,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  Command,
  FileClock,
  Headphones,
  Hourglass,
  LayoutDashboard,
  Menu,
  MonitorPlay,
  PanelLeftClose,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { dateTime, roleLabel } from "../lib/format";
import { adminApi } from "../lib/api";
import type { CompanyListItem, UserListItem } from "../types";

const links = [
  ["/", "Tableau de bord", LayoutDashboard, "companies.read"],
  ["/companies", "Entreprises", Building2, "companies.read"],
  ["/users", "Utilisateurs", Users, "users.read"],
  ["/subscriptions", "Abonnements", WalletCards, "subscriptions.read"],
  ["/trials", "Essais gratuits", Hourglass, "subscriptions.read"],
  ["/demo-accounts", "Compte démo", MonitorPlay, "companies.read"],
  ["/plans", "Plans et fonctionnalités", Command, "plans.read"],
  ["/billing", "Facturation Piloz", ReceiptText, "billing.read"],
  ["/revenue", "Revenus", CircleDollarSign, "revenue.read"],
  ["/documentation", "Documentation", BookOpen, "documentation.read"],
  ["/support", "Support", Headphones, "support.read"],
  ["/compliance", "Conformité", BookOpenCheck, "compliance.read"],
  ["/system", "Système", Activity, "system.read"],
  ["/audit", "Journal d’audit", FileClock, "audit.read"],
  ["/admins", "Équipe administrative", ShieldCheck, "admin.read"],
  ["/settings", "Paramètres", Settings, "profile.read"],
] as const;

export function AppShell() {
  const { admin, signOut } = useAuth(),
    navigate = useNavigate(),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [support, setSupport] = useState<SupportSession | null>(null);
  const visible = useMemo(
    () => links.filter((link) => admin?.permissions.includes(link[3])),
    [admin],
  );
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!admin?.permissions.includes("support.session")) return;
    const load = () =>
      void adminApi<{ session: SupportSession | null }>("support.current")
        .then((result) => setSupport(result.session))
        .catch(() => setSupport(null));
    load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener("piloz-support-changed", load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("piloz-support-changed", load);
    };
  }, [admin]);
  async function closeSupport() {
    if (!support) return;
    await adminApi("support.end", { sessionId: support.id });
    setSupport(null);
  }
  return (
    <div className={`admin-layout ${collapsed ? "collapsed" : ""}`}>
      <aside className={mobile ? "mobile-open" : ""}>
        <header>
          <img src="/piloz-logo.png" alt="Piloz" />
          <div>
            <b>Piloz Admin</b>
            <span>Back-office interne</span>
          </div>
          <button className="mobile-close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </header>
        <nav>
          {visible.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobile(false)}
              title={label}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <footer>
          <button onClick={() => setCollapsed((value) => !value)}>
            <PanelLeftClose />
            <span>Réduire</span>
          </button>
        </footer>
      </aside>
      <main className="admin-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <button className="global-search" onClick={() => setSearchOpen(true)}>
            <Search />
            <span>Rechercher dans Piloz</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="top-actions">
            <button
              className="icon-button"
              title="Notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell />
            </button>
            <div className="admin-identity">
              <span>
                {(
                  admin?.first_name?.[0] ||
                  admin?.email?.[0] ||
                  "A"
                ).toUpperCase()}
              </span>
              <div>
                <b>
                  {[admin?.first_name, admin?.last_name]
                    .filter(Boolean)
                    .join(" ") || admin?.email}
                </b>
                <small>{roleLabel(admin?.role || "")}</small>
              </div>
            </div>
            <button className="signout" onClick={() => void signOut()}>
              Déconnexion
            </button>
          </div>
        </header>
        {support && (
          <div className="support-banner">
            <span>
              <b>Mode support actif</b> — vous consultez l’entreprise{" "}
              {support.companies?.name || support.company_id.slice(0, 8)} en{" "}
              {support.mode === "read_only"
                ? "lecture seule"
                : "écriture limitée"}
              . Fin automatique {dateTime(support.expires_at)}.
            </span>
            <button onClick={() => void closeSupport()}>
              Quitter maintenant
            </button>
          </div>
        )}
        <div className="page-container">
          <Outlet />
        </div>
      </main>
      {searchOpen && (
        <GlobalSearch
          onClose={() => setSearchOpen(false)}
          onCompany={(id) => {
            setSearchOpen(false);
            navigate(`/companies/${id}`);
          }}
        />
      )}
      {notificationsOpen && (
        <NotificationCenter
          onClose={() => setNotificationsOpen(false)}
          onCompany={(id) => {
            setNotificationsOpen(false);
            navigate(`/companies/${id}`);
          }}
        />
      )}
    </div>
  );
}

function GlobalSearch({
  onClose,
  onCompany,
}: {
  onClose: () => void;
  onCompany: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [result, setResult] = useState<{
      companies: CompanyListItem[];
      users: UserListItem[];
    }>({ companies: [], users: [] }),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) {
      setResult({ companies: [], users: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setResult(await adminApi("global.search", { search: query }));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const empty = !result.companies.length && !result.users.length;
  return (
    <div
      className="command-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="command-palette">
        <header>
          <Search />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Entreprise, utilisateur, e-mail, SIREN, SIRET…"
          />
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <div>
          {loading ? (
            <p className="command-hint">Recherche sécurisée…</p>
          ) : empty ? (
            <p className="command-hint">
              {query.length < 2
                ? "Saisissez au moins deux caractères."
                : "Aucun résultat."}
            </p>
          ) : (
            <>
              {result.companies.map((item) => (
                <button
                  key={`c-${item.company_id}`}
                  onClick={() => onCompany(item.company_id)}
                >
                  <Building2 />
                  <span>
                    <b>{item.trade_name || item.company_name}</b>
                    <small>{item.owner_email || item.identifier}</small>
                  </span>
                  <ChevronLeft />
                </button>
              ))}
              {result.users.map((item) => (
                <button
                  key={`u-${item.user_id}-${item.company_id}`}
                  onClick={() => onCompany(item.company_id)}
                >
                  <Users />
                  <span>
                    <b>{item.full_name || item.email}</b>
                    <small>
                      {item.company_name} · {item.email}
                    </small>
                  </span>
                  <ChevronLeft />
                </button>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

type Notification = {
  id: string;
  severity: string;
  title: string;
  message: string;
  company_id?: string;
  created_at: string;
};
type SupportSession = {
  id: string;
  company_id: string;
  mode: string;
  expires_at: string;
  companies?: { name: string } | null;
};
function NotificationCenter({
  onClose,
  onCompany,
}: {
  onClose: () => void;
  onCompany: (id: string) => void;
}) {
  const [items, setItems] = useState<Notification[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    void adminApi<{ items: Notification[] }>("notifications.list")
      .then((result) => setItems(result.items))
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Chargement impossible",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside className="notification-drawer">
        <header>
          <div>
            <span className="eyebrow">Centre persistant</span>
            <h2>Notifications</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>
        {loading ? (
          <p>Chargement…</p>
        ) : error ? (
          <p className="form-message">{error}</p>
        ) : items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className={`notification ${item.severity}`}
              onClick={() => item.company_id && onCompany(item.company_id)}
            >
              <span />
              <div>
                <b>{item.title}</b>
                <p>{item.message}</p>
                <small>{dateTime(item.created_at)}</small>
              </div>
            </article>
          ))
        ) : (
          <p className="command-hint">Aucune notification active.</p>
        )}
      </aside>
    </div>
  );
}
