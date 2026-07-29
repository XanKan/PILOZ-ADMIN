import { useMemo,useState,type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft,Building2,Mail,UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { Card,Field,Loading,PageHeader } from "../components/Ui";
import { adminApi } from "../lib/api";
import { reauthenticateAdmin } from "../lib/reauth";
import { useAdminData } from "../lib/useAdminData";
import type { PlanVersion } from "../types";

export function CompanyCreate(){
 const navigate=useNavigate(),{admin}=useAuth(),{data,loading,error}=useAdminData<{items:PlanVersion[]}>("plans.list"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const plans=useMemo(()=>data?.items.filter(plan=>!plan.effective_to)||[],[data]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setBusy(true);setMessage("");
  const values=new FormData(event.currentTarget),firstName=String(values.get("owner_first_name")||"").trim(),lastName=String(values.get("owner_last_name")||"").trim(),ownerEmail=String(values.get("owner_email")||"").trim().toLowerCase(),provisioningName=`Entreprise à configurer — ${firstName} ${lastName}`;
  try{
   await reauthenticateAdmin(admin!.email,"","");
   const result=await adminApi<{company:{id:string}}>("companies.create",{
    company:{
     owner_first_name:firstName,
     owner_last_name:lastName,
     owner_email:ownerEmail,
     provisioning_name:provisioningName,
     provisioning_pending:true,
     // Compatibilité avec l'ancienne RPC durant le déploiement progressif.
     // La nouvelle RPC ignore cette valeur dans les données juridiques.
     trade_name:provisioningName
    },
    subscription:{
     plan_version_id:values.get("plan"),
     billing_interval:"monthly",
     status:"active",
     trial_days:0,
     max_users:null
    },
    reason:`Création du compte entreprise et invitation de ${ownerEmail}`
   });
   navigate(`/companies/${result.company.id}`);
  }catch(reason){
   setMessage(reason instanceof Error?reason.message:"La création a échoué.");
   setBusy(false);
  }
 }

 if(loading)return <Loading/>;
 return <>
  <button className="back-link" onClick={()=>navigate("/companies")}><ArrowLeft/> Entreprises</button>
  <PageHeader eyebrow="Provisionnement simplifié" title="Créer une entreprise" description="Renseignez uniquement le futur propriétaire et son abonnement. Il complétera lui-même son entreprise lors de sa première connexion."/>
  {error&&<div className="inline-notice danger">{error}</div>}
  <form className="company-form company-create-simple" onSubmit={submit}>
   <Card>
    <div className="card-header"><div><h2>Propriétaire du compte</h2><p>Ces informations servent à créer l’accès et à envoyer l’invitation sécurisée.</p></div><UserRound/></div>
    <div className="form-grid">
     <Field label="Prénom"><input name="owner_first_name" required maxLength={100} autoComplete="given-name"/></Field>
     <Field label="Nom"><input name="owner_last_name" required maxLength={100} autoComplete="family-name"/></Field>
     <Field label="Adresse e-mail"><input name="owner_email" type="email" required maxLength={254} autoComplete="email"/></Field>
     <Field label="Abonnement"><select name="plan" required defaultValue=""><option value="" disabled>Choisir un abonnement</option>{plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></Field>
    </div>
   </Card>
   <Card className="company-onboarding-handoff">
    <div className="card-header"><div><h2>Complété ensuite par le client</h2><p>Aucune donnée juridique fictive n’est créée dans son entreprise.</p></div><Building2/></div>
    <div className="handoff-list">
     <span><Building2/> Raison sociale, forme juridique, SIREN et SIRET</span>
     <span><Mail/> Coordonnées, adresses et informations fiscales</span>
     <span><UserRound/> Logo, numérotation et préférences de documents</span>
    </div>
    {message&&<p className="form-message" role="alert">{message}</p>}
    <footer className="form-actions"><button type="button" onClick={()=>navigate("/companies")}>Annuler</button><button className="primary-button" disabled={busy||!plans.length}>{busy?"Création sécurisée…":"Créer l’entreprise et envoyer l’invitation"}</button></footer>
   </Card>
  </form>
 </>;
}
