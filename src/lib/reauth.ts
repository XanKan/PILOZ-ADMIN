import { supabase } from "./supabase";

export async function reauthenticateAdmin(...credentials:[string,string,string]){
 void credentials;
 const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error||data.currentLevel!=="aal2")throw new Error("Votre session MFA a expiré. Reconnectez-vous.");
}
