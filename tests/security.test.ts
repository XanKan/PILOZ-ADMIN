import { describe,expect,it } from "vitest";
import { readFileSync,readdirSync,statSync } from "node:fs";
import { join,resolve } from "node:path";

const root=resolve(import.meta.dirname,"..");
function files(directory:string):string[]{return readdirSync(directory).flatMap(name=>{const path=join(directory,name);return statSync(path).isDirectory()?files(path):[path]});}
function contents(...directories:string[]){return directories.flatMap(directory=>files(join(root,directory))).filter(file=>!file.endsWith(".png")).map(file=>readFileSync(file,"utf8")).join("\n");}

describe("barrières du back-office",()=>{
 it("n’embarque jamais la clé service_role",()=>{expect(contents("src","public")).not.toContain("SUPABASE_SERVICE_ROLE_KEY")});
 it("ne propose aucune inscription publique",()=>{const source=contents("src"),login=readFileSync(join(root,"src","auth","Login.tsx"),"utf8");expect(source).not.toContain("signUp(");expect(login).not.toMatch(/créer un compte|s’inscrire/i)});
 it("interdit l’indexation",()=>{expect(readFileSync(join(root,"public","robots.txt"),"utf8")).toContain("Disallow: /");const html=readFileSync(join(root,"index.html"),"utf8");expect(html).toContain("noindex,nofollow");expect(html).toContain("frame-ancestors 'none'")});
 it("conserve le domaine admin uniquement",()=>{expect(readFileSync(join(root,"public","CNAME"),"utf8").trim()).toBe("admin.piloz.fr")});
 it("bloque le déploiement avant activation explicite",()=>{const workflow=readFileSync(join(root,".github","workflows","deploy.yml"),"utf8");expect(workflow).toContain("ADMIN_PRODUCTION_ENABLED == 'true'");expect(workflow).toContain("npm run verify")});
});
