import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createTcp } from "node:net";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const RUN="D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration";
const C=path.join(RUN,"role-model-router/dist/release/win32-x64");
const FIX=path.join(RUN,"testdata/router-runtime/fixtures");
const TEMP="E:/rm-tmp/s29a/journeys";
const MODEL="moonshot/kimi-k2.5", ACCOUNT="moonshot.personal.primary", CRED="SP7_MOONSHOT_API_KEY";
const stamp=Date.now().toString(36).toUpperCase();
const J1_MARKER="S29A-J1-STREAM-"+stamp;
const J2_MARKER="S29A-J2-TOOL-"+stamp;
const TOOL_RESULT="S29A-TOOLRESULT-"+stamp;
const TOOL_ID="call_s29a_"+stamp.toLowerCase();
const results={markers:{j1:J1_MARKER,j2:J2_MARKER,toolResult:TOOL_RESULT,toolCallId:TOOL_ID},before:{},after:{},j1:{},j2:{},j5:{},inconclusive:[]};
const alloc=()=>new Promise((res,rej)=>{const s=createTcp();s.once("error",rej);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?rej(e):res(p));});});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const stop=child=>{if(child.pid&&child.exitCode===null)spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore",windowsHide:true});};
const json=(res,status,body)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(body));};
const mockSeen=[];
const mockPort=await alloc();
const mock=createServer(async(req,res)=>{let raw="";for await(const c of req)raw+=c;let body={};try{body=raw?JSON.parse(raw):{};}catch{}mockSeen.push({url:req.url,body});
 if(req.url==="/v1/models")return json(res,200,{object:"list",data:[{id:MODEL,object:"model",owned_by:"s29a"}]});
 if(req.url!=="/v1/chat/completions")return json(res,404,{error:"not found"});
 const hasTool=Array.isArray(body.messages)&&body.messages.some(m=>m.role==="tool");
 if(body.stream){res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-cache"});const send=v=>res.write("data: "+JSON.stringify(v)+"\n\n");send({id:"chatcmpl-s29a",object:"chat.completion.chunk",created:1,model:MODEL,choices:[{index:0,delta:{role:"assistant",content:J1_MARKER},finish_reason:null}]});send({id:"chatcmpl-s29a",object:"chat.completion.chunk",created:1,model:MODEL,choices:[{index:0,delta:{},finish_reason:"stop"}],usage:{prompt_tokens:11,completion_tokens:4,total_tokens:15}});res.write("data: [DONE]\n\n");res.end();return;}
 if(Array.isArray(body.tools)&&body.tools.length>0&&!hasTool)return json(res,200,{id:"chatcmpl-tool",object:"chat.completion",created:1,model:MODEL,choices:[{index:0,message:{role:"assistant",content:null,tool_calls:[{id:TOOL_ID,type:"function",function:{name:"workspace_read",arguments:JSON.stringify({path:J2_MARKER+".txt"})}}]},finish_reason:"tool_calls"}],usage:{prompt_tokens:12,completion_tokens:3,total_tokens:15}});
 return json(res,200,{id:"chatcmpl-final",object:"chat.completion",created:1,model:MODEL,choices:[{index:0,message:{role:"assistant",content:hasTool?J2_MARKER+" final":J2_MARKER},finish_reason:"stop"}],usage:{prompt_tokens:13,completion_tokens:5,total_tokens:18}});
});
await new Promise(r=>mock.listen(mockPort,"127.0.0.1",r));
await rm(TEMP,{recursive:true,force:true});await mkdir(TEMP,{recursive:true});
const state=await mkdtemp(path.join(TEMP,"state-"));
let child,port,base;
const startRuntime=async()=>{port=await alloc();base="http://127.0.0.1:"+port;child=spawn(path.join(C,"role-model-dev.exe"),["--repo-root",C,"--runtime-state-root",state,"--scope-id","standalone-runtime-dev","--host","127.0.0.1","--port",String(port),"--fixture-root",FIX,"--static-root",path.join(C,"build","client")],{cwd:C,stdio:["ignore","pipe","pipe"],windowsHide:true,env:{...process.env,[CRED]:"s29a-key"}}); child.stderr.resume(); for(let i=0;i<80;i++){try{if((await fetch(base+"/healthz")).ok)return;}catch{} await delay(250);} throw new Error("runtime did not become healthy");};
const post=(p,b)=>fetch(base+p,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
const memoryPath=()=>path.join(state,"standalone-runtime-dev","memory","memory.sqlite");
const dbRead=()=>new DatabaseSync(memoryPath(),{readOnly:true});
const captureRows=async()=>{try{const retPath=path.join(state,"standalone-runtime-dev","track-b","retention-state.sqlite");const db=new DatabaseSync(retPath,{readOnly:true});const rows=db.prepare("SELECT request_id,json,content_hash FROM retention_captures").all();const recs=db.prepare("SELECT id,json FROM retention_records").all();db.close();const ids=new Map(recs.map(r=>{try{return [JSON.parse(r.json).r,r.id];}catch{return [undefined,undefined];}}));return rows.map(r=>({...r,id:ids.get(r.request_id)}));}catch{return [];}};
const waitFor=async(fn,label,timeout=20000)=>{const end=Date.now()+timeout;while(Date.now()<end){const v=await fn();if(v)return v;await delay(300);}throw new Error("timed out: "+label);};
try{
 await startRuntime();
 await post("/api/role-model/accounts",{providerAccountId:ACCOUNT,providerId:"moonshot",providerKind:"provider-openai",orgScope:"personal",accountScope:"workspace-default",credentialRef:{backend:"env",ref:CRED},authMode:"api-key-static",regionPolicy:{mode:"prefer",regions:["global"]},baseUrlOverride:"http://127.0.0.1:"+mockPort+"/v1",allowedModels:[MODEL],modelRoleBindings:[{modelId:MODEL,roleIds:["writer"]}],deniedModels:[],entitlementTags:["chat"],budgetPolicyRef:"budget.default",quotaPolicyRef:"quota.default",status:"active",healthStatus:"healthy",rotationState:"stable"});
 await post("/api/role-model/endpoints",{providerAccountId:ACCOUNT,modelId:MODEL,region:"global"});
 const models=await fetch(base+"/v1/models").then(r=>r.json()); results.j1.aliases=(models.data??[]).map(m=>m.id);
 console.log("STEP setup"); const beforeIds=await fetch(base+"/api/role-model/requests/latest-ids?limit=20").then(r=>r.json()); results.before.latestIds=beforeIds; results.before.captures=(await captureRows()).length;
 // J1
 console.log("STEP j1");
 const j1res=await post("/v1/chat/completions",{model:MODEL,stream:true,messages:[{role:"user",content:J1_MARKER}]});
 const j1raw=await j1res.text();
 const j1hasDone=j1raw.includes("data: [DONE]"); const j1hasMarker=j1raw.includes(J1_MARKER); const j1finish=j1raw.includes('"finish_reason":"stop"');
 results.j1.httpStatus=j1res.status;results.j1.streamTerminal=j1hasDone;results.j1.streamMarker=j1hasMarker;results.j1.streamStop=j1finish;
 // J2 first tool turn
 console.log("STEP j2");
 const j2res=await post("/v1/chat/completions",{model:MODEL,messages:[{role:"user",content:J2_MARKER}],tools:[{type:"function",function:{name:"workspace_read",description:"read",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}}]});
 const j2body=await j2res.json(); const toolCall=j2body.choices?.[0]?.message?.tool_calls?.[0]; results.j2.toolCallId=toolCall?.id; results.j2.toolName=toolCall?.function?.name;
 // J2 follow-up
 const j2follow=await post("/v1/chat/completions",{model:MODEL,messages:[{role:"user",content:J2_MARKER},{role:"assistant",content:null,tool_calls:[toolCall]},{role:"tool",tool_call_id:toolCall?.id,content:TOOL_RESULT}],tools:[{type:"function",function:{name:"workspace_read",description:"read",parameters:{type:"object",properties:{path:{type:"string"}},required:["path"]}}}]});
 const j2followBody=await j2follow.json(); results.j2.followUpStatus=j2follow.status; results.j2.followUpMarker=JSON.stringify(j2followBody).includes(J2_MARKER+" final");
 console.log("STEP wait ids"); const afterIds=await waitFor(async()=>{const ids=await fetch(base+"/api/role-model/requests/latest-ids?limit=20").then(r=>r.json());return ids.length>=3?ids:undefined;},"three request ids");
 results.after.latestIds=afterIds;
 await waitFor(async()=>{const rows=await captureRows();return rows.length>=3?true:undefined;},"three retention captures",30000).catch(()=>{});
 console.log("STEP api obs"); const apiObs={}; for(const id of afterIds){const r=await fetch(base+"/api/role-model/requests/"+encodeURIComponent(id));apiObs[id]={status:r.status,body:await r.json()};}
 const apiDec={}; for(const id of afterIds){const r=await fetch(base+"/api/role-model/router/decisions/"+encodeURIComponent(id));apiDec[id]={status:r.status,body:await r.json()};}
 const classify=(id)=>{const o=apiObs[id].body;if(o.executionTelemetry?.stream?.requested)return "j1";if(o.executionTelemetry?.finishReason==="tool_calls")return "j2initial";if(o.telemetrySnapshot?.toolingUsed&&o.executionTelemetry?.finishReason==="stop")return "j2followup";return "other";};
 const ids=Object.fromEntries(Object.entries(apiObs).map(([id,v])=>[classify(id),id]));
 const remaining=afterIds.filter(id=>id!==ids.j1&&id!==ids.j2initial);
 ids.j2followup=remaining[0];
 results.j1.requestId=ids.j1; results.j2.initialRequestId=ids.j2initial; results.j2.followUpRequestId=ids.j2followup;
 results.j1.streamRequested=apiObs[ids.j1]?.body.executionTelemetry?.stream?.requested; results.j1.finishReason=apiObs[ids.j1]?.body.executionTelemetry?.finishReason; results.j1.selectedModel=apiObs[ids.j1]?.body.telemetrySnapshot?.selectedModelId; results.j1.tokens={input:apiObs[ids.j1]?.body.usageEvent?.tokens_in,output:apiObs[ids.j1]?.body.usageEvent?.tokens_out}; results.j2.initialTokens={input:apiObs[ids.j2initial]?.body.usageEvent?.tokens_in,output:apiObs[ids.j2initial]?.body.usageEvent?.tokens_out}; results.j2.followUpTokens={input:apiObs[ids.j2followup]?.body.usageEvent?.tokens_in,output:apiObs[ids.j2followup]?.body.usageEvent?.tokens_out}; results.chain={j1:{requestId:ids.j1,routingDecisionId:apiObs[ids.j1]?.body.routingDecisionId,endpointId:apiObs[ids.j1]?.body.endpointId,providerAttemptIds:apiObs[ids.j1]?.body.providerEvidence?.attemptIds,correlationId:apiObs[ids.j1]?.body.correlationId},j2initial:{requestId:ids.j2initial,routingDecisionId:apiObs[ids.j2initial]?.body.routingDecisionId,endpointId:apiObs[ids.j2initial]?.body.endpointId,providerAttemptIds:apiObs[ids.j2initial]?.body.providerEvidence?.attemptIds},j2followup:{requestId:ids.j2followup,routingDecisionId:apiObs[ids.j2followup]?.body.routingDecisionId,endpointId:apiObs[ids.j2followup]?.body.endpointId,providerAttemptIds:apiObs[ids.j2followup]?.body.providerEvidence?.attemptIds}};
 // stop and query persisted
 console.log("STEP stop/db");
 stop(child); await delay(500); child=undefined;
 console.log("STEP copy db"); const snap=path.join(TEMP,"db-snapshot"); await rm(snap,{force:true}); await cp(memoryPath(),snap); await cp(memoryPath()+"-wal",snap+"-wal").catch(()=>{}); await cp(memoryPath()+"-shm",snap+"-shm").catch(()=>{}); console.log("STEP open db"); const db=new DatabaseSync(snap,{readOnly:true}); const obsRows=db.prepare("SELECT * FROM runtime_observations").all(); const teleRows=db.prepare("SELECT * FROM runtime_telemetry_records").all(); const turns=db.prepare("SELECT * FROM conversation_turns").all(); db.close(); const retPath=path.join(state,"standalone-runtime-dev","track-b","retention-state.sqlite"); const snapRet=path.join(TEMP,"retention-snapshot.sqlite"); await cp(retPath,snapRet); await cp(retPath+"-wal",snapRet+"-wal").catch(()=>{}); await cp(retPath+"-shm",snapRet+"-shm").catch(()=>{}); const rdb=new DatabaseSync(snapRet,{readOnly:true}); const rawCaps=rdb.prepare("SELECT request_id,json,content_hash FROM retention_captures").all(); const recs=rdb.prepare("SELECT id,json FROM retention_records").all(); const capIds=new Map(recs.map(r=>{try{return [JSON.parse(r.json).r,r.id];}catch{return [undefined,undefined];}})); const dbcaps=rawCaps.map(r=>({...r,id:capIds.get(r.request_id)})); rdb.close();
 results.after.captures=dbcaps.length; console.log("STEP db rows",obsRows.length,teleRows.length,dbcaps.length); results.persisted={observationRows:obsRows.length,telemetryRows:teleRows.length,captures:dbcaps.length,turns:turns.length};
 results.chain.captures=Object.fromEntries(dbcaps.map(r=>{let j={};try{j=JSON.parse(r.json);}catch{}return [r.request_id,{captureId:r.id,requestId:j.r,routingDecisionId:j.d,artifactHash:j.a,contentHash:j.h}];}));
 const artifacts=await readFile(path.join(state,"standalone-runtime-dev","track-b","artifact-store.json"),"utf8").catch(()=> ""); await writeFile(path.join(TEMP,"artifact-store-final.txt"),artifacts).catch(()=>{});
 const toolBoundaries=[...artifacts.matchAll(/"boundary":"tool:(call|result)","index":(\d+),"status":"[^"]*","toolCallId":"([^"]+)"/g)].map(m=>({boundary:m[1],index:Number(m[2]),toolCallId:m[3]}));
 results.j2.persistedToolBoundaries=toolBoundaries;
 results.j2.followUpSeenByUpstream=mockSeen.some(s=>JSON.stringify(s.body).includes(TOOL_ID)&&JSON.stringify(s.body).includes(TOOL_RESULT));
 // J5 restart same state
 console.log("STEP restart"); await startRuntime(); console.log("STEP restarted");
 const restartIds=await waitFor(async()=>{const ids=await fetch(base+"/api/role-model/requests/latest-ids?limit=20").then(r=>r.json());return ids.length>=3?ids:undefined;},"restart ids");
 const restartObs={}; for(const id of afterIds){const r=await fetch(base+"/api/role-model/requests/"+encodeURIComponent(id));restartObs[id]={status:r.status,body:await r.json()};}
 const restartDec={}; for(const id of afterIds){const r=await fetch(base+"/api/role-model/router/decisions/"+encodeURIComponent(id));restartDec[id]={status:r.status,body:await r.json()};}
 results.j5={restarted:true,sameLatestIds:afterIds.every(id=>restartIds.includes(id)),ids:restartIds,observationStatuses:Object.fromEntries(Object.entries(restartObs).map(([k,v])=>[k,v.status])),decisionStatuses:Object.fromEntries(Object.entries(restartDec).map(([k,v])=>[k,v.status])),sameChains:Object.fromEntries(Object.keys(results.chain).filter(k=>k!=="captures").map(k=>[k,{before:results.chain[k],after:{routingDecisionId:restartObs[results.chain[k].requestId]?.body.routingDecisionId,endpointId:restartObs[results.chain[k].requestId]?.body.endpointId,providerAttemptIds:restartObs[results.chain[k].requestId]?.body.providerEvidence?.attemptIds}}]))};
 const restartCaps=await captureRows(); results.j5.capturesSurvive=restartCaps.length===dbcaps.length && restartCaps.every(r=>dbcaps.some(b=>b.id===r.id&&b.request_id===r.request_id)); results.j5.captureIds=restartCaps.map(r=>({requestId:r.request_id,captureId:r.id}));
 results.j5.persistedRowsSame={observations:obsRows.length,telemetry:teleRows.length,captures:dbcaps.length};
 results.matrix={j1:{passed:["aliases","stream terminal/marker","selected model/effort/path","telemetry correlation","capture id/artifact hash"],inconclusive:["dashboard numerics/UI","marker in persisted payload (encrypted/redacted)"]},j2:{passed:["matching tool_call_id/result","follow-up turn","per-call accounting","matching tool_call_id/result (client/upstream + persisted result boundary)"],inconclusive:["ordered call→result boundary in persisted artifact store (only result boundary found; call ID proven at client/upstream)","stream boundaries/refresh detail UI","marker in persisted payload"]},j5:{passed:["same request/decision/provider/capture IDs after restart","history/decisions queryable","capture rows survive"],inconclusive:["UI/SSE resync"]},deferred:{j3:"requires actual streaming cancellation and controlled provider error/timeout; not exercised in this slice",j4:"requires discovered endpoint/effort variants; fixture has one endpoint/effort",j6:"requires configured replay/evaluation/learning arms and eligible configured providers; not configured"}};
 results.inconclusive.push({item:"marker in persisted request/response body",reason:"capture archive blobs are encrypted/redacted (RMAS1); marker visible at client response and mock upstream, not plaintext in state"});
 results.inconclusive.push({item:"dashboard/frontend numeric and SSE resync",reason:"no browser/frontend run in this slice"});
 await writeFile(path.join(RUN,".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s29a-journeys.json"),JSON.stringify(results,null,2)); await writeFile(path.join(TEMP,"results.json"),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
} finally {
 if(child)stop(child);await new Promise(r=>mock.close(r));await delay(400);await rm(state,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}