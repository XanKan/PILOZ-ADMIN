/* eslint-disable react-refresh/only-export-components */
import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { adminApi } from "../lib/api";
import type { AdminContext } from "../types";

type AuthState={session:Session|null;admin:AdminContext|null;loading:boolean;needsMfa:boolean;error:string;refresh:()=>Promise<void>;signOut:()=>Promise<void>};
const Context=createContext<AuthState|null>(null);
const INACTIVITY_MS=20*60*1000;

export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[admin,setAdmin]=useState<AdminContext|null>(null),[loading,setLoading]=useState(true),[needsMfa,setNeedsMfa]=useState(false),[error,setError]=useState("");
 const lastActivity=useRef(Date.now());
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:{session:current}}=await supabase.auth.getSession();setSession(current);
  if(!current){setAdmin(null);setNeedsMfa(false);setLoading(false);return;}
  const {data:context,error:contextError}=await supabase.rpc("platform_admin_context");
  if(contextError||!context){setAdmin(null);setNeedsMfa(false);setError("Ce compte n’est pas autorisé à accéder à Piloz Admin.");setLoading(false);return;}
  const own=context as AdminContext;setAdmin(own);
  if(own.mfa_required&&own.aal!=="aal2"){setNeedsMfa(true);setLoading(false);return;}
  try{const verified=await adminApi<{context:AdminContext}>("context");setAdmin(verified.context);setNeedsMfa(false);}catch(apiError){setError(apiError instanceof Error?apiError.message:"Accès administratif refusé.");}
  setLoading(false);
 },[]);
 const signOut=useCallback(async()=>{await supabase.auth.signOut();setSession(null);setAdmin(null);setNeedsMfa(false);},[]);
 useEffect(()=>{void refresh();const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(!next){setAdmin(null);setNeedsMfa(false);setLoading(false);}else setTimeout(()=>void refresh(),0);});return()=>subscription.unsubscribe();},[refresh]);
 useEffect(()=>{const mark=()=>{lastActivity.current=Date.now();};const events=["pointerdown","keydown","scroll","touchstart"];events.forEach(name=>window.addEventListener(name,mark,{passive:true}));const timer=window.setInterval(()=>{if(session&&Date.now()-lastActivity.current>INACTIVITY_MS)void signOut();},30_000);return()=>{events.forEach(name=>window.removeEventListener(name,mark));window.clearInterval(timer);};},[session,signOut]);
 const value=useMemo(()=>({session,admin,loading,needsMfa,error,refresh,signOut}),[session,admin,loading,needsMfa,error,refresh,signOut]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error("AuthProvider manquant");return value;}
