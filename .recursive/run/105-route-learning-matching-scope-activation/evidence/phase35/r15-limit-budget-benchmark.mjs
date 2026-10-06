import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,writeFileSync,statSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {performance} from "node:perf_hooks";
const root=mkdtempSync(path.join(os.tmpdir(),"r15-size-budget-"));
const results=[];
for(const bytes of [16*1024,256*1024,1024*1024]) {
 const file=path.join(root,bytes+".sqlite"); const db=new DatabaseSync(file);
 db.exec("PRAGMA journal_mode=WAL;PRAGMA synchronous=NORMAL;CREATE TABLE t(id INTEGER PRIMARY KEY,payload TEXT NOT NULL)");
 const payload=JSON.stringify({message:"x".repeat(bytes-14)});const n=200;const insert=db.prepare("INSERT INTO t VALUES(?,?)");
 const t0=performance.now();db.exec("BEGIN");for(let i=0;i<n;i++)insert.run(i,payload);db.exec("COMMIT");const writeMs=performance.now()-t0;
 const t1=performance.now();const rows=db.prepare("SELECT payload FROM t").all();const readMs=performance.now()-t1;
 const t2=performance.now();for(const row of rows)JSON.parse(row.payload);const parseMs=performance.now()-t2;
 db.exec("PRAGMA wal_checkpoint(TRUNCATE)");const pageCount=db.prepare("PRAGMA page_count").get().page_count;db.close();
 results.push({payloadBytes:Buffer.byteLength(payload),rows:n,batchedWriteMs:writeMs,readAllMs:readMs,jsonParseAllMs:parseMs,sqliteBytes:statSync(file).size,pageCount});
}
console.log(JSON.stringify({note:"isolated single-process synthetic SQLite WAL NORMAL; NOT runtime p95/concurrency/privacy benchmark",root,results},null,2));
