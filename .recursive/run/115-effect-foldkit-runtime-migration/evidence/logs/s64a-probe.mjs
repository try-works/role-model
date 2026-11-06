import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createServer as tcp } from "node:net";
import path from "node:path";
const ART="E:/rm-tmp/s38b/release/win32-x64", FIX="D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/testdata/router-runtime/fixtures", STATE="E:/rm-tmp/s64a/state";
const alloc=()=>new Promise((res,rej)=>{const s=tcp();s.once("error",rej);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?rej(e):res(p));});});
const json=(r,s,b,extra={})=>{r.writeHead(s,{"content-type":"application/json",...extra});r.end(JSON.stringify(b));};
const mp=await alloc();const mock=createServer(async(req,res)=>{let raw="";for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};const text=body.messages?.at(-1)?.content??"";if(req.url==="/v1/models")return json(res,200,{data:[{id:"moonshot/kimi-k2.5"}]});if(text.includes("FAIL"))return json(res,500,{error:"mock upstream failed"});await new Promise(r=>setTimeout(r,text.includes("SLOW")?3000:10));res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({id:"chatcmpl-"+Date.now(),object:"chat.completion",model:body.model,choices:[{index:0,message:{role:"assistant",content:"echo:"+text},finish_reason:"stop"}],usage:{prompt_tokens:7,completion_tokens:5,total_tokens:12}}));});await new Promise(r=>mock.listen(mp,"127.0.0.1",r));
const port=await alloc();const child=spawn(path.join(ART,"role-model-dev.exe"),["--repo-root",ART,"--runtime-state-root",STATE,"--scope-id","standalone-runtime-dev","--host","127.0.0.1","--port",String(port),"--fixture-root",FIX],{cwd:ART,stdio:["ignore","pipe","pipe"],env:{...process.env,SP7_MOONSHOT_API_KEY:"s64"}});child.stderr.resume();const base="http://127.0.0.1:"+port;
const post=(p,b,init={})=>fetch(base+p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b),...init});
try{for(let i=0;i<100;i++){try{const r=await fetch(base+"/healthz");if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 await post("/api/role-model/accounts",{providerAccountId:"moonshot.personal.primary",providerId:"moonshot",providerKind:"provider-openai",orgScope:"personal",accountScope:"workspace-default",credentialRef:{backend:"env",ref:"SP7_MOONSHOT_API_KEY"},authMode:"api-key-static",regionPolicy:{mode:"prefer",regions:["global"]},baseUrlOverride:"http://127.0.0.1:"+mp+"/v1",allowedModels:["moonshot/kimi-k2.5"],modelRoleBindings:[{modelId:"moonshot/kimi-k2.5",roleIds:["writer"]}],deniedModels:[],entitlementTags:["chat"],budgetPolicyRef:"budget.default",quotaPolicyRef:"quota.default",status:"active",healthStatus:"healthy",rotationState:"stable"});
 await post("/api/role-model/endpoints",{providerAccountId:"moonshot.personal.primary",modelId:"moonshot/kimi-k2.5",region:"global"});
 const count=async()=>{const r=await fetch(base+"/api/role-model/telemetry/summary");return (await r.json()).requestCount;};
 const before=await count();const ok=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"OK"}]});const okBody=await ok.json();const mid=await count();
 const bad=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"FAIL"}]});const badBody=await bad.text();const afterBad=await count();
 const ac=new AbortController();const slow=post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"SLOW"}]},{signal:ac.signal}).catch(e=>"ABORT:"+e.name);setTimeout(()=>ac.abort(),300);const cancel=await slow;const afterCancel=await count();
 const metrics=await (await fetch(base+"/api/metrics/page?windowMs=86400000")).json();
 const decisions=await (await fetch(base+"/api/role-model/router/decisions")).json();
 console.log(JSON.stringify({port,before,mid,afterBad,afterCancel,okStatus:ok.status,okBody,badStatus:bad.status,badBody:badBody.slice(0,300),cancel,metricsItem:metrics.items?.[0],decisions:decisions.slice(0,2)},null,2));
}finally{spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore"});await new Promise(r=>mock.close(r));}
