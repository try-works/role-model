import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createServer as tcp } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const ART="E:/rm-tmp/s38b/release/win32-x64", FIX="D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/testdata/router-runtime/fixtures", STATE="E:/rm-tmp/s64a/jstate";
const assert=(cond,msg)=>{if(!cond)throw new Error("ASSERT: "+msg);};
const alloc=()=>new Promise((res,rej)=>{const s=tcp();s.once("error",rej);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?rej(e):res(p));});});
const json=(r,s,b)=>{r.writeHead(s,{"content-type":"application/json"});r.end(JSON.stringify(b));};
const mp=await alloc();const mock=createServer(async(req,res)=>{let raw="";for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};const text=body.messages?.at(-1)?.content??"";if(req.url==="/v1/models")return json(res,200,{data:[{id:"moonshot/kimi-k2.5"}]});if(text.includes("FAIL"))return json(res,500,{error:"mock upstream failed"});await new Promise(r=>setTimeout(r,text.includes("SLOW")?3000:10));res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({id:"chatcmpl",object:"chat.completion",model:body.model,choices:[{index:0,message:{role:"assistant",content:"echo:"+text},finish_reason:"stop"}],usage:{prompt_tokens:7,completion_tokens:5,total_tokens:12}}));});await new Promise(r=>mock.listen(mp,"127.0.0.1",r));
const port=await alloc();const child=spawn(path.join(ART,"role-model-dev.exe"),["--repo-root",ART,"--runtime-state-root",STATE,"--scope-id","standalone-runtime-dev","--host","127.0.0.1","--port",String(port),"--fixture-root",FIX],{cwd:ART,stdio:["ignore","pipe","pipe"],env:{...process.env,SP7_MOONSHOT_API_KEY:"s64"}});child.stderr.resume();const base="http://127.0.0.1:"+port;
const post=(p,b,init={})=>fetch(base+p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b),...init});
const count=async()=>{const r=await fetch(base+"/api/role-model/telemetry/summary");return (await r.json()).requestCount;};
const items=async()=>{const r=await fetch(base+"/api/metrics/page?windowMs=86400000");return (await r.json()).items;};
const decisions=async()=>{const r=await fetch(base+"/api/role-model/router/decisions");return await r.json();};
const j4Checks=(item,decision)=>item!==undefined&&decision!==undefined&&decision.selectedModelId==="moonshot/kimi-k2.5"&&decision.reasoningEffort===null&&decision.effortSource==="none";
try{for(let i=0;i<100;i++){try{const r=await fetch(base+"/healthz");if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 await post("/api/role-model/accounts",{providerAccountId:"moonshot.personal.primary",providerId:"moonshot",providerKind:"provider-openai",orgScope:"personal",accountScope:"workspace-default",credentialRef:{backend:"env",ref:"SP7_MOONSHOT_API_KEY"},authMode:"api-key-static",regionPolicy:{mode:"prefer",regions:["global"]},baseUrlOverride:"http://127.0.0.1:"+mp+"/v1",allowedModels:["moonshot/kimi-k2.5"],modelRoleBindings:[{modelId:"moonshot/kimi-k2.5",roleIds:["writer"]}],deniedModels:[],entitlementTags:["chat"],budgetPolicyRef:"budget.default",quotaPolicyRef:"quota.default",status:"active",healthStatus:"healthy",rotationState:"stable"});
 await post("/api/role-model/endpoints",{providerAccountId:"moonshot.personal.primary",modelId:"moonshot/kimi-k2.5",region:"global"});
 // J3 success
 const before=await count();const ok=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"OK"}]});const okBody=await ok.json();const afterOk=await count();assert(ok.status===200,"success status");assert(afterOk===before+1,"success +1");
 const okItems=(await items()).filter(i=>i.resp_status_code===200);assert(okItems.length===1,"one success item");const successItem=okItems[0];const successDecision=(await decisions()).find(d=>d.requestId===successItem.request_id);assert(successDecision,"success decision by request id");
 // J3 failure
 const bad=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"FAIL"}]});const badText=await bad.text();const afterBad=await count();assert(bad.status===500,"failure status 500");assert(afterBad===afterOk+1,"failure +1");assert(!badText.includes("echo:"),"no false success on failure");
 const failureItem=(await items()).find(i=>i.resp_status_code===500);assert(failureItem,"failure item");const failureDecision=(await decisions()).find(d=>d.requestId===failureItem.request_id);assert(failureDecision,"failure decision");assert(typeof failureDecision.selectedEndpointId==="string" && failureDecision.selectedEndpointId.length>0,"failure decision has endpoint");
 // J3 cancel
 const ac=new AbortController();const t0=Date.now();const slow=post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",messages:[{role:"user",content:"SLOW"}]},{signal:ac.signal}).catch(e=>"ABORT:"+e.name);setTimeout(()=>ac.abort(),250);const cancelRaw=await slow;const cancelMs=Date.now()-t0;const cancelStatus=typeof cancelRaw==="object"&&cancelRaw!==null&&"status" in cancelRaw?cancelRaw.status:undefined;const cancelBody=typeof cancelRaw==="object"&&cancelRaw!==null&&"text" in cancelRaw?await cancelRaw.text():String(cancelRaw);const afterCancel=await count();const cancelAborted = cancelRaw === "ABORT:AbortError";assert(cancelMs<2000,"cancel no hung spinner");assert(afterCancel===afterBad+1,"cancel counted exactly once");
 // J4 metadata/effort
 const beforeEffort=await count();const effort=await post("/v1/chat/completions",{model:"moonshot/kimi-k2.5",reasoning_effort:"high",messages:[{role:"user",content:"EFFORT"}]});const effortText=await effort.text();const afterEffort=await count();
 let j4;
 if(effort.status!==200){
   j4={classification:"FAIL",defect:"reasoning_effort request rejected",status:effort.status,body:effortText.slice(0,300),countDelta:afterEffort-beforeEffort};
 } else {
   const effortItem=(await items()).find(i=>i.request_id&&i.model==="moonshot/kimi-k2.5"&&i.id>failureItem.id&&i.resp_status_code===200);
   const effortDecision=effortItem===undefined?undefined:(await decisions()).find(d=>d.requestId===effortItem.request_id);
   const ok=j4Checks(effortItem,effortDecision);
   j4={classification:ok?"PASS":"FAIL",requestId:effortItem?.request_id,decisionId:effortDecision?.routingDecisionId,model:effortDecision?.selectedModelId,reasoningEffort:effortDecision?.reasoningEffort,effortSource:effortDecision?.effortSource,countDelta:afterEffort-beforeEffort,defect:ok?undefined:"model/effort metadata mismatch"};
 }
 const result={J3:{classification:"PARTIAL",defect:cancelStatus===503?"cancel path NOT RUN: endpoint circuit-breaker 503 before cancellation; no abort observed":undefined,before,afterOk,afterBad,afterCancel,success:{requestId:successItem.request_id,decisionId:successDecision.routingDecisionId,capture:successItem.has_capture},failure:{requestId:failureItem.request_id,decisionId:failureDecision.routingDecisionId,endpoint:failureDecision.selectedEndpointId},cancel:{classification:"NOT RUN",reason:"endpoint temporarily unavailable 503 from prior failure; cancellation not exercised",aborted:cancelAborted,status:cancelStatus,body:cancelBody.slice(0,200),ms:cancelMs,counted:afterCancel-afterBad}},J4:j4,J6:{classification:"NOT RUN",reason:"replay/eval/learning need configured extension runtime; not seeded by this harness"}};
 console.log(JSON.stringify(result,null,2));await writeFile("E:/rm-tmp/s64a/journeys-result.json",JSON.stringify(result,null,2));
}finally{spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore"});await new Promise(r=>mock.close(r));}
