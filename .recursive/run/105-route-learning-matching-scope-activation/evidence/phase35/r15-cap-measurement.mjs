import { readFileSync, writeFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import os from 'node:os'; import path from 'node:path'; import { DatabaseSync } from 'node:sqlite'; import { performance } from 'node:perf_hooks';
const actual = JSON.parse(readFileSync(new URL('./r15-hotfix-build/diagnostic-actual-observation.json', import.meta.url), 'utf8'));
const bytes = x => Buffer.byteLength(JSON.stringify(x), 'utf8');
const leaves=[]; function walk(x,p=''){ if(typeof x==='string') leaves.push({field:p,jsonBytes:bytes(x),utf8Bytes:Buffer.byteLength(x)}); else if(x&&typeof x==='object') for(const [k,v] of Object.entries(x)) walk(v,p?p+'.'+k:k); } walk(actual.dimensions);
const metadata=structuredClone(actual.dimensions); delete metadata.errorContext.message; delete metadata.errorContext.errorPreview.message;
const rows=[];
for(const cap of [16384,262144,1048576]) for(const shape of ['actual-policy','at-cap']) {
 const candidate=shape==='actual-policy'?(bytes(actual.dimensions)<=cap?actual.dimensions:metadata):{...metadata,padding:'x'.repeat(cap-bytes({...metadata,padding:''}))};
 const payload=JSON.stringify(candidate); const root=mkdtempSync(path.join(os.tmpdir(),'r15-budget-')); const file=path.join(root,'measure.sqlite'); const db=new DatabaseSync(file); db.exec('PRAGMA journal_mode=WAL; CREATE TABLE telemetry(id INTEGER PRIMARY KEY, dimensions_json TEXT)'); const insert=db.prepare('INSERT INTO telemetry VALUES (?,?)');
 let start=performance.now(); db.exec('BEGIN'); for(let i=0;i<200;i++)insert.run(i,payload); db.exec('COMMIT'); const writeMs=performance.now()-start;
 start=performance.now(); const data=db.prepare('SELECT dimensions_json FROM telemetry LIMIT 100').all().map(r=>JSON.parse(r.dimensions_json)); const readParseMs=performance.now()-start;
 start=performance.now(); const pageJson=JSON.stringify({records:data}); const serializeMs=performance.now()-start;
 const pageBytes=Buffer.byteLength(pageJson); const checkpoint=db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').all(); db.close(); const fileBytes=statSync(file).size;
 rows.push({cap,shape,rowBytes:Buffer.byteLength(payload),write200Ms:writeMs,readParse100Ms:readParseMs,serialize100Ms:serializeMs,page100Bytes:pageBytes,rowsPer1MiBFrame:Math.floor((1048576-100)/Buffer.byteLength(payload)),sqlite200RowsBytes:fileBytes,checkpoint}); rmSync(root,{recursive:true,force:true});
}
const result={actualDimensionsBytes:bytes(actual.dimensions),metadataWithoutMessagesBytes:bytes(metadata),richMessageBytes:bytes(actual.dimensions)-bytes(metadata),actualLeaves:leaves.sort((a,b)=>b.jsonBytes-a.jsonBytes),histogram:{under512:leaves.filter(x=>x.jsonBytes<=512).length,over512:leaves.filter(x=>x.jsonBytes>512).length,over16KiB:leaves.filter(x=>x.jsonBytes>16384).length},benchmarks:rows,note:'Single host synthetic isolated SQLite measurement; at-cap padding measures capacity cost, not approved content policy. No production cap edits.'};
writeFileSync(new URL('./r15-cap-measurement.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
