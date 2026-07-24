import { useCallback,useEffect,useState } from "react";
import { adminApi } from "./api";

export function useAdminData<T>(action:string,payload:Record<string,unknown>={}){
 const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const serialized=JSON.stringify(payload);
 const load=useCallback(async()=>{setLoading(true);setError("");try{setData(await adminApi<T>(action,JSON.parse(serialized) as Record<string,unknown>));}catch(reason){setError(reason instanceof Error?reason.message:"Chargement impossible");}finally{setLoading(false);}},[action,serialized]);
 useEffect(()=>{void load();},[load]);return{data,loading,error,reload:load};
}
