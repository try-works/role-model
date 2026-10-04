import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync('E:/tmp/run105-r15-verification-state/standalone-runtime-dev/memory/memory.sqlite',{readOnly:true});
console.log(JSON.stringify(db.prepare("SELECT request_id,client_request_id,length(CAST(observation_json AS BLOB)) AS bytes,observation_json FROM runtime_observations WHERE client_request_id LIKE 'r15-live-%'").all(),null,2));
db.close();
