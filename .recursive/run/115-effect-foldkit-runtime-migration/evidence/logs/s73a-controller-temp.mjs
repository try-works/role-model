import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createServer as tcp } from "node:net";
import path from "node:path";
const ART="E:/rm-tmp/s38b/release/win32-x64", FIX="D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/testdata/router-runtime/fixtures", STATE="E:/rm-tmp/s64a/cstate-temp";
const alloc=()=>new Promise((res,rej)=>{const s=tcp();s.once("error",rej);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?rej(e):res(p));});});
const mp=await alloc();const mock=createServer(async(req,res)=>{let raw="";for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({id:"chatcmpl",object:"chat.completion",model:body.model,choices:[{index:0,message:{role:"assistant",content:"ok"},finish_reason:"stop"}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));});await new Promise(r=>mock.listen(mp,"127.0.0.1",r));
const port=await alloc();const child=spawn(path.join(ART,"role-model-dev.exe"),["--repo-root",ART,"--runtime-state-root",STATE,"--scope-id","standalone-runtime-dev","--host","127.0.0.1","--port",String(port),"--fixture-root",FIX],{cwd:ART,stdio:["ignore","pipe","pipe"],env:{...process.env,SP7_MOONSHOT_API_KEY:"s64",SP7_DEEPSEEK_API_KEY:"s64"}});child.stderr.resume();const base="http://127.0.0.1:"+port;
const post=(p,b,method="POST")=>fetch(base+p,{method,headers:{"content-type":"application/json"},body:JSON.stringify(b)});
const get=async(p)=>{const r=await fetch(base+p);return {body:await r.json(),status:r.status};};
try{for(let i=0;i<100;i++){try{const r=await fetch(base+"/healthz");if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 for(const [account,provider,env] of [["moonshot.personal.primary","moonshot","SP7_MOONSHOT_API_KEY"],["deepseek.personal.primary","deepseek","SP7_DEEPSEEK_API_KEY"]]){await post("/api/role-model/accounts",{providerAccountId:account,providerId:provider,providerKind:"provider-openai",orgScope:"personal",accountScope:"workspace-default",credentialRef:{backend:"env",ref:env},authMode:"api-key-static",regionPolicy:{mode:"prefer",regions:["global"]},baseUrlOverride:"http://127.0.0.1:"+mp+"/v1",allowedModels:["moonshot/kimi-k2.5"],modelRoleBindings:[{modelId:"moonshot/kimi-k2.5",roleIds:["writer"]}],deniedModels:[],entitlementTags:["chat"],budgetPolicyRef:"budget.default",quotaPolicyRef:"quota.default",status:"active",healthStatus:"healthy",rotationState:"stable"});await post("/api/role-model/endpoints",{providerAccountId:account,modelId:"moonshot/kimi-k2.5",region:"global"});}
 const endpoints=await get("/api/role-model/endpoints");const ids=endpoints.body.map(e=>e.endpointId);if(ids.length<2)throw new Error("need two endpoints: "+JSON.stringify(endpoints.body));
 const before=await get("/api/role-model/controller");
 const patch=await post("/api/role-model/controller",{endpointId:ids[1]},"PATCH");const status=patch.status;const body=await patch.json();
 const after=await get("/api/role-model/controller");
 const back=await post("/api/role-model/controller",{endpointId:ids[0]},"PATCH");const backBody=await back.json();
 const final=await get("/api/role-model/controller");
 console.log(JSON.stringify({port,state:STATE,endpoints:ids,initial:before.body,patchStatus:status,patchBody:body,after:after.body,patchBackStatus:back.status,patchBackBody:backBody,final:final.body},null,2));
}finally{spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore"});await new Promise(r=>mock.close(r));}
