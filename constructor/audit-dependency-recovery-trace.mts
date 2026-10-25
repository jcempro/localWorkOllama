// D6V: compara aquisição/pinning congelados; sem downloads, instalação ou execução de pacotes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [packetPathD6V,packetHashD6V]=process.argv.slice(2);
const shaD6V=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const bytes=fs.readFileSync(packetPathD6V);assert.equal(shaD6V(bytes),packetHashD6V);
const p=JSON.parse(bytes.toString('utf8'));assert.equal(p.schema,'dependency-recovery-d6v/v1');
assert.equal(p.origin.sha256,'abd15bcf53429632b07c6d59158fa9bcc614c216378a29411a026256221fe676');
assert.deepEqual(p.jobs.map((j:any)=>j.id),['734295de-5ac4-41a9-bb30-81c68c72c87f','eeb3bcf5-17b7-415e-ba70-323f517022e5','2f865db2-84d3-4bde-9f62-a290c489a500']);
const [failed,recovered,vendored]=p.jobs;
const argsD6V=(j:any,id:string)=>{const c=j.commands.find((c:any)=>c.id===id);assert(c);assert.equal(shaD6V(JSON.stringify(c.args)),c.args_sha256);return c.args;};
const sourceD6V=(j:any,id:string)=>{const a=argsD6V(j,id);assert.equal(a[0],'-e');assert.equal(a.length,2);return a[1] as string;};
const onceD6V=(s:string,t:string)=>{
 const offsets:number[]=[];for(let i=s.indexOf(t);i>=0;i=s.indexOf(t,i+1))offsets.push(i);
 assert.equal(offsets.length,1,'D6V_FRAGMENT '+JSON.stringify({sha256:shaD6V(t),length:t.length,count:offsets.length,offsets:offsets.slice(0,4)}));
 return offsets[0];
};
const original=sourceD6V(failed,'acquire'),corrected=sourceD6V(recovered,'complete-acquisition'),vendor=sourceD6V(vendored,'vendor');
for(const s of [original,corrected]){
 for(const t of ["redirect:'error'",'AbortSignal.timeout(20000)','if(b.length>2097152)',"if(sri!==meta.dist.integrity)throw Error('integrity')",String.raw`maxBuffer:1048576}).split(/\r?\n/)`])onceD6V(s,t);
}
onceD6V(original,"if(!license)throw Error('license absent '+name)");
onceD6V(corrected,"if(!fs.existsSync(path.join(root,'qrcode-generator/package.tgz')))throw Error('checkpoint absent')");
onceD6V(corrected,'const archive=reused?fs.readFileSync(tgz):await get(meta.dist.tarball)');
onceD6V(corrected,"if(!reused)fs.writeFileSync(tgz,archive,{flag:'wx'})");
const licenseUrl='https://raw.githubusercontent.com/kazuhikoarase/qrcode-generator/js2.0.4/LICENSE';
onceD6V(corrected,"if(u.hostname!=='registry.npmjs.org'&&url!=='"+licenseUrl+"')throw Error('host/path')");
onceD6V(corrected,"licenseSource='"+licenseUrl+"';licenseBytes=await get(licenseSource)");
onceD6V(corrected,"includes('Copyright (c) 2009 Kazuhiko Arase')");onceD6V(corrected,"includes('MIT License')");
console.log('D6V_CHECKPOINT source_definitions=verified historical_execution=false');
const reports=recovered.body.split('\n').filter((s:string)=>s.startsWith('{"name":')).map((s:string)=>JSON.parse(s));
assert.equal(reports.length,2);const [qr,decoder]=reports;
assert.equal(qr.name,'qrcode-generator');assert.equal(qr.version,'2.0.4');assert.equal(qr.reusedArchive,true);assert.equal(qr.licenseSource,licenseUrl);
assert.equal(decoder.name,'jsqr');assert.equal(decoder.version,'1.4.0');assert.equal(decoder.reusedArchive,false);assert.equal(decoder.licenseSource,'package/LICENSE');
assert.deepEqual(qr.files.map((f:any)=>f.file),['qrcode.mjs','qrcode.d.ts','qrcode_UTF8.mjs','LICENSE.txt']);
assert.deepEqual(decoder.files.map((f:any)=>f.file),['jsQR.js','LICENSE.txt']);
for(const r of reports){assert(r.integrity.startsWith('sha512-'));assert(r.tarball.startsWith('https://registry.npmjs.org/'));assert(r.files.every((f:any)=>/^[a-f0-9]{64}$/.test(f.sha256)&&Number.isInteger(f.bytes)&&f.bytes>0));}
const start=onceD6V(vendor,'const expected=')+'const expected='.length,end=onceD6V(vendor,';const targets=');assert(end>start);
const pinned=JSON.parse(vendor.slice(start,end));assert.equal(Object.keys(pinned).length,5);
const mapping=[['qrcode.mjs',qr,'qrcode.mjs'],['qrcode_UTF8.mjs',qr,'qrcode_UTF8.mjs'],['qrLicense',qr,'LICENSE.txt'],['jsQR.js',decoder,'jsQR.js'],['jsLicense',decoder,'LICENSE.txt']] as const;
const matched=mapping.map(([key,r,file])=>{const f=r.files.find((f:any)=>f.file===file);assert(f);assert.equal(pinned[key],f.sha256);return {package:r.name,file,pinned_sha256_matches_report:true};});
const targets="const targets=[['qrcode-generator','assets/jcem/lib/qrcode-generator/2.0.4',[['qrcode.mjs','qrcode.mjs','qrcode.mjs'],['qrcode_UTF8.mjs','qrcode_UTF8.mjs','qrcode_UTF8.mjs'],['LICENSE.txt','LICENSE.txt','qrLicense']]],['jsqr','scripts/vendor/jsqr/1.4.0',[['jsQR.js','jsQR.cjs','jsQR.js'],['LICENSE.txt','LICENSE.txt','jsLicense']]]];";
onceD6V(vendor,targets);onceD6V(vendor,"assert.equal(crypto.createHash('sha256').update(b).digest('hex'),expected[key])");
onceD6V(vendor,"fs.writeFileSync(dest+'/'+out,b,{flag:'wx'})");onceD6V(vendor,"licenseSource:meta.licenseSource");onceD6V(vendor,'notice_ref: mit');
const smoke=argsD6V(vendored,'smoke');assert.equal(smoke[0],'--input-type=module');assert.equal(smoke[1],'-e');
onceD6V(smoke[2],"assert.equal(result?.data,'FT107')");assert.deepEqual(argsD6V(vendored,'attributions'),['scripts/test_attributions.rb']);
console.log('D6V_CHECKPOINT pinning_definition=verified matched_digests=5 historical_execution=false');
const wanted=[['error'],['ok'],['ok','ok','ok']];
const receipts=p.jobs.map((j:any,i:number)=>{
 assert.equal(j.prompt_tokens,0);assert.equal(j.output_tokens,0);assert.equal(j.status,i===0?'FAILED':'COMPLETED');
 const outcomes=j.events.filter((e:any)=>e.phase==='tool_result').map((e:any)=>e.outcome);assert.deepEqual(outcomes,wanted[i]);assert.equal(j.sequence.length,outcomes.length);
 const done=j.events.find((e:any)=>e.phase==='completion_verified');
 if(i===0){assert(!done);assert.equal(j.error_kind,'WORKER_INCOMPLETE');assert(j.body.includes('license absent qrcode-generator'));}
 else {assert(done);assert.deepEqual(done.commands,j.sequence);assert.equal(done.commits,0);assert.equal(done.mutations,i===2?1:0);}
 assert.equal(j.git_header[1],'## dev...origin/dev [ahead 23]');
 return {id:j.id,status:j.status,commands:j.sequence.map((id:string,n:number)=>({id,outcome:outcomes[n]})),runtime_mutations:done?.mutations??null,git_header:j.git_header};
});
assert(recovered.body.includes('QR_PACKAGES_ACQUIRED_VERIFIED_NOT_INSTALLED'));
for(const marker of ['PINNED_QR_VENDOR_AND_ATTRIBUTION_INSTALLED','LOCAL_QR_ENCODE_DECODE_SMOKE_OK','attributions=ok entries=5'])assert(vendored.body.includes(marker));
console.log('D6V_DEPENDENCY_TRACE '+JSON.stringify({packet_sha256:packetHashD6V,archive_reuse_and_sri_guard_defined:true,fixed_license_source_and_identity_checks_defined:true,
 pinned_files:matched,public_generator_and_development_decoder_targets_recognized:true,declaration_acquired_not_vendored:true,decoder_extension_mapping:'jsQR.js→jsQR.cjs',receipts,
 license_file_absence_independently_proved:false,bytes_rehashed_now:false,licensing_compliance_proved:false,packages_executed_now:false,network_used:false,historical_commands_executed:false,
 scope:'frozen_definition_receipt_and_digest_coherence_only',full_feature_validated:false}));
