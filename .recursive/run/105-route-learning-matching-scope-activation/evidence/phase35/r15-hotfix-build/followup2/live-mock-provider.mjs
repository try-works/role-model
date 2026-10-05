import http from 'node:http';
import {writeFile,appendFile} from 'node:fs/promises';
const root="D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/r15-hotfix-build/followup2";
let mode='success'; let calls=0;
const server=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;res.setHeader('Content-Type','application/json');if(req.url==='/control'){mode=JSON.parse(raw).mode;res.end(JSON.stringify({mode}));return;}if(req.url==='/stats'){res.end(JSON.stringify({mode,calls}));return;}
const body=raw?JSON.parse(raw):{};calls++;await appendFile(root+'/live-mock-calls.jsonl',JSON.stringify({at:new Date().toISOString(),url:req.url,mode,requestId:req.headers['x-request-id']??null,model:body.model,messageChars:body.messages?.[0]?.content?.length??0})+'\n');
if(req.url?.endsWith('/models')){res.end(JSON.stringify({object:'list',data:[{id:'deepseek-v4-pro',object:'model'}]}));return;}
if(mode==='success'){res.end(JSON.stringify({id:'r15-mock-admission',object:'chat.completion',model:body.model,choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'ready'}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}));return;}
const message=mode==='ascii'?'R15_NONSECRET_ASCII_'+ 'A'.repeat(120000):'R15_NONSECRET_UTF8_'+'漢字🙂'.repeat(30000);res.statusCode=422;res.end(JSON.stringify({error:{message,type:'invalid_request_error',code:'r15_mock_contract_rejection'}}));});
server.listen(0,'127.0.0.1',async()=>{const port=server.address().port;await writeFile(root+'/live-mock-ready.json',JSON.stringify({port,pid:process.pid}));console.log('localhost mock ready port='+port);});
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));