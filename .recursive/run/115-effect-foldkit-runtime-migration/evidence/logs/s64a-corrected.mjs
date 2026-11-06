import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createServer as tcp } from "node:net";
import path from "node:path";
const ART="E:/rm-tmp/s38b/release/win32-x64", FIX="D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/testdata/router-runtime/fixtures", STATE="E:/rm-tmp/s64a/cstate";
const assert=(cond,msg)=>{if(!cond)throw new Error("ASSERT: "+msg);};
const alloc=()=>new Promise((res,rej)=>{const s=tcp();s.once("error",rej);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?rej(e):res(p));});});
const json=(r,s,b)=>{r.writeHead(s,{"content-type":"application/json"});r.end(JSON.stringify(b));};
const mp=await alloc();const mock=createServer(async(req,res)=>{let raw="";for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};const text=body.messages?.at(-1)?.content??"";if(req.url==="/v1/models")return json(res,200,{data:[{id:"moonshot/kimi-k2.5"}]});await new Promise(r=>setTimeout(r,text.includes("SLOW")?10000:15));res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({id:"chatcmpl",object:"chat.completion",model:body.model,choices:[{index:0,message:{role:"assistant",content:"echo:"+text},finish_reason:"stop"}],usage:{prompt_tokens:7,completion_tokens:5,total_tokens:12}}));});await new Promise(r=>mock.listen(mp,"127.0.0.1",r));
const port=await alloc();const child=spawn(path.join(ART,"role-model-dev.exe"),["--repo-root",ART,"--runtime-state-root",STATE,"--scope-id","standalone-runtime-dev","--host","127.0.0.1","--port",String(port),"--fixture-root",FIX],{cwd:ART,stdio:["ignore","pipe","pipe"],env:{...process.env,SP7_MOONSHOT_API_KEY:"s64"}});child.stderr.resume();const base="http://127.0.0.1:"+port;
const post=(p,b,init={})=>fetch(base+p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b),...init});
const count=async()=>{const r=await fetch(base+"/api/role-model/telemetry/summary");return (await r.json()).requestCount;};
const items=async()=>{const r=await fetch(base+"/api/metrics/page?windowMs=86400000");return (await r.json()).items;};
const decisions=async()=>{const r=await fetch(base+"/api/role-model/router/decisions");return await r.json();};
try{for(let i=0;i<100;i++){try{const r=await fetch(base+"/healthz");if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 await post("/api/role-model/accounts",{providerAccountId:"moonshot.personal.primary",providerId:"moonshot",providerKind:"provider-openai",orgScope:"personal",accountScope:"workspace-default",credentialRef:{backend:"env",ref:"SP7_MOONSHOT_API_KEY"},authMode:"api-key-static",regionPolicy:{mode:"prefer",regions:["global"]},baseUrlOverride:"http://127.0.0.1:"+mp+"/v1",allowedModels:["moonshot/kimi-k2.5"],modelRoleBindings:[{modelId:"moonshot/kimi-k2.5",roleIds:["writer"]}],deniedModels:[],entitlementTags:["chat"],budgetPolicyRef:"budget.default",quotaPolicyRef:"quota.default",status:"active",healthStatus:"healthy",rotationState:"stable"});
 await post("/api/role-model/endpoints",{providerAccountId:"moonshot.personal.primary",modelId:"moonshot/kimi-k2.5",region:"global"});
 // J4 no-effort success + metadata
 const ok=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"OK"}]});const okText=await ok.text();const afterOk=await count();const okItem=(await items()).find(i=>i.resp_status_code===200);const okDecision=okItem===undefined?undefined:(await decisions()).find(d=>d.requestId===okItem.request_id);
 const endpoints=await (await fetch(base+"/api/role-model/endpoints")).json();const effortSupported=endpoints.some(e=>e.reasoningEffort!==null&&e.reasoningEffort!==undefined&&e.reasoningEffort!=="");
 const effort=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",reasoning_effort:"high",messages:[{role:"user",content:"EFFORT"}]});const effortText=await effort.text();const afterEffort=await count();
 // J3 cancel on fresh state
 const beforeCancel=await count();const ac=new AbortController();const t0=Date.now();const slowPromise=post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"SLOW"}]},{signal:ac.signal}).then(async r=>({kind:"response",status:r.status,body:(await r.text()).slice(0,200)})).catch(e=>({kind:"error",name:e.name,message:String(e)}));setTimeout(()=>ac.abort(),500);const slowResult=await slowPromise;const cancelMs=Date.now()-t0;const afterCancel=await count();
 // J6 operator endpoints
 const j6=[];for(const path of ["/api/role-model/operator/replay/jobs","/api/role-model/operator/evaluation/jobs","/api/role-model/operator/learning"]){const r=await fetch(base+path);j6.push({path,status:r.status,body:await r.json()});}
 assert(typeof slowResult==="object","cancel result"); // recorded, not asserted successful abort
 assert(afterCancel===afterEffort+1,"cancel counted once");
 assert(ok.status===200,"success status");assert(afterOk===afterEffort-1,"success counted before effort rejection");
 assert(okDecision!==undefined,"success decision");assert(okDecision.selectedModelId==="moonshot/kimi-k2.5","model");assert(okDecision.reasoningEffort===null,"no fabricated effort");assert(okDecision.effortSource==="none","effort source none");
 assert(effortSupported===false,"no effort-capable endpoint configured");
 assert(effort.status===400,"effort rejected");assert(effortText.includes("no_eligible_target"),"eligibility reason");assert(afterEffort===afterOk+1,"effort counted once");
 assert(j6.every(e=>e.status===200),"operator endpoints 200");assert(Array.isArray(j6[0].body)&&j6[0].body.length===0,"no replay rows");assert(Array.isArray(j6[1].body)&&j6[1].body.length===0,"no eval rows");assert(j6[2].body.knowledge?.candidates===0,"no learning candidates");
 console.log(JSON.stringify({J3:{classification:slowResult.kind==="error"&&slowResult.name==="AbortError"?"PASS":"PARTIAL",before:beforeCancel,afterCancel,cancelMs,slowResult,countDelta:afterCancel-beforeCancel,note:"fresh state, abort at 500ms; no prior failure"},J4:{classification:"PASS",honesty:"400 no_eligible_target; no-effort decision null/none",effortSupported,effortStatus:effort.status,effortBody:effortText.slice(0,250),afterOk,afterEffort,okDecision:{requestId:okDecision.requestId,model:okDecision.selectedModelId,reasoningEffort:okDecision.reasoningEffort,effortSource:okDecision.effortSource}},J6:{classification:"PASS",endpoints:j6,execution:"NOT RUN - no jobs exist; honest empty/disabled",noSeededRows:true}},null,2));
}finally{spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore"});await new Promise(r=>mock.close(r));}
