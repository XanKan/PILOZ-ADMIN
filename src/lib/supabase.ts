import { createClient } from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const anonKey=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
export const configurationReady=Boolean(url&&/^https:\/\/.+\.supabase\.co$/i.test(url)&&anonKey&&anonKey.length>30);
export const supabase=createClient(url||"https://configuration-required.supabase.co",anonKey||"configuration-required",{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"piloz-admin-auth"},
  global:{headers:{"X-Client-Info":"piloz-admin/0.1.0"}}
});
export const supabaseUrl=url||"";
