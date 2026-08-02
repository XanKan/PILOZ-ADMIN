import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { Login } from "./auth/Login";
import { AppShell } from "./components/AppShell";
import { Loading } from "./components/Ui";
import { configurationReady } from "./lib/supabase";

const Companies = lazy(() =>
  import("./pages/Companies").then((module) => ({ default: module.Companies })),
);
const CompanyDetail = lazy(() =>
  import("./pages/CompanyDetail").then((module) => ({
    default: module.CompanyDetail,
  })),
);
const CompanyCreate = lazy(() =>
  import("./pages/CompanyCreate").then((module) => ({
    default: module.CompanyCreate,
  })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const TrialsPage = lazy(() =>
  import("./pages/Trials").then((module) => ({ default: module.TrialsPage })),
);
const DemoAccountsPage = lazy(() =>
  import("./pages/DemoAccounts").then((module) => ({
    default: module.DemoAccountsPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import("./pages/AdminSettings").then((module) => ({
    default: module.AdminSettingsPage,
  })),
);
const AdminsPage = lazy(() =>
  import("./pages/Admins").then((module) => ({ default: module.AdminsPage })),
);
const operations = () => import("./pages/Operations");
const UsersPage = lazy(() =>
  operations().then((module) => ({ default: module.UsersPage })),
);
const SubscriptionsPage = lazy(() =>
  operations().then((module) => ({ default: module.SubscriptionsPage })),
);
const PlansPage = lazy(() =>
  operations().then((module) => ({ default: module.PlansPage })),
);
const BillingPage = lazy(() =>
  operations().then((module) => ({ default: module.BillingPage })),
);
const RevenuePage = lazy(() =>
  operations().then((module) => ({ default: module.RevenuePage })),
);
const knowledgeSupport = () => import("./pages/KnowledgeSupport");
const SupportPage = lazy(() =>
  knowledgeSupport().then((module) => ({ default: module.SupportPage })),
);
const DocumentationPage = lazy(() =>
  knowledgeSupport().then((module) => ({ default: module.DocumentationPage })),
);
const CompliancePage = lazy(() =>
  operations().then((module) => ({ default: module.CompliancePage })),
);
const SystemPage = lazy(() =>
  operations().then((module) => ({ default: module.SystemPage })),
);
const AuditPage = lazy(() =>
  operations().then((module) => ({ default: module.AuditPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
function Gate() {
  const { session, admin, loading, needsMfa } = useAuth();
  if (!configurationReady)
    return (
      <main className="configuration-error">
        <img src="/piloz-logo.png" />
        <h1>Configuration requise</h1>
        <p>
          Les variables publiques Supabase doivent être configurées avant
          d’ouvrir Piloz Admin.
        </p>
      </main>
    );
  if (loading)
    return (
      <div className="boot-screen">
        <img src="/piloz-logo.png" />
        <span />
      </div>
    );
  if (!session || !admin || needsMfa) return <Login />;
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="companies/new" element={<CompanyCreate />} />
          <Route path="companies/:companyId" element={<CompanyDetail />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="trials" element={<TrialsPage />} />
          <Route path="demo-accounts" element={<DemoAccountsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="documentation" element={<DocumentationPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="system" element={<SystemPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="settings/profile" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
