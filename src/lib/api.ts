import { supabase,supabaseUrl } from "./supabase";

export class AdminApiError extends Error{status:number;code?:string;constructor(message:string,status:number,code?:string){super(message);this.name="AdminApiError";this.status=status;this.code=code;}}

export async function adminApi<T>(action:string,payload:Record<string,unknown>={}):Promise<T>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new AdminApiError("Votre session a expiré.",401,"session_required");
 const response=await fetch(`${supabaseUrl}/functions/v1/platform-admin-api`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_ANON_KEY,"Content-Type":"application/json","X-Request-Id":crypto.randomUUID()},body:JSON.stringify({action,payload})});
 const contentType=response.headers.get("content-type")||"";let result:Record<string,unknown>={};
 if(contentType.includes("application/json")){try{result=await response.json() as Record<string,unknown>;}catch{result={};}}
 if(!response.ok)throw new AdminApiError(String(result.error||"L’opération administrative a échoué."),response.status,String(result.code||"request_failed"));
 return result as T;
}
