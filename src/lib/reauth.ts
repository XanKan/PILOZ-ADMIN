import { supabase } from "./supabase";

export async function reauthenticateAdmin(email:string,password:string,totpCode:string){
 const {error:passwordError}=await supabase.auth.signInWithPassword({email,password});
 if(passwordError)throw new Error("Réauthentification refusée.");
 const {data:factors,error:factorsError}=await supabase.auth.mfa.listFactors();
 if(factorsError)throw new Error("Impossible de vérifier le second facteur.");
 const factor=factors.totp.find(item=>item.status==="verified");
 if(!factor)throw new Error("Aucun second facteur vérifié.");
 const {error:mfaError}=await supabase.auth.mfa.challengeAndVerify({factorId:factor.id,code:totpCode});
 if(mfaError)throw new Error("Code MFA incorrect ou expiré.");
 const {error:refreshError}=await supabase.auth.refreshSession();
 if(refreshError)throw new Error("La session sécurisée n’a pas pu être renouvelée.");
}
