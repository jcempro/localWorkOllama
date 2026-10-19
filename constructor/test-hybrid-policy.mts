// Teste determinístico do contrato, sem Worker, repositório de exemplo ou avaliação automática de risco.
import assert from 'node:assert/strict';
import { scopeHashS4W, validateSupervisionS4W, checkActionS4W, normalizedEvidenceS4W } from '../localworker/delegation-policy.mjs';
const request:any = {repoPath:process.cwd(),task:'Unidade factual previamente delimitada.',mode:'write',commit_policy:'supervisor',required_change_paths:['unit.txt']};
const policy=(c:number,regime='junior')=>{const r={...request,maintenance_supervision:{version:1,criticality:c,regime,uncertainty_resolved:true,rationale:'Avaliação feita exclusivamente pelo supervisor.',evidence:'Evidência factual conferida pelo supervisor.',scope_paths:['unit.txt'],scope_sha256:'',...(regime==='intern'?{approved_action:{tool:'write_file',args:{path:'unit.txt',content:'one'}}}:{})}};r.maintenance_supervision.scope_sha256=scopeHashS4W(r);return r;};
for(const c of [0,5,5.01,7])assert.equal(validateSupervisionS4W(policy(c),true).regime,'junior');
for(const c of [5.01,7])assert.equal(validateSupervisionS4W(policy(c,'intern'),true).regime,'intern');
for(const c of [7.01,10,-1,NaN,Infinity])assert.throws(()=>validateSupervisionS4W(policy(c),true));
assert.throws(()=>validateSupervisionS4W(policy(5,'intern'),true));
assert.throws(()=>validateSupervisionS4W(policy(6,'exclusive'),true));
assert.throws(()=>validateSupervisionS4W(policy(3),false));
assert.throws(()=>validateSupervisionS4W(request,true));
assert.throws(()=>validateSupervisionS4W({...policy(3),task:'Escopo expandido'},true),/Escopo mudou/);
for(const field of ['task','mode','commit_policy','required_read_paths','authorized_commands','thread_id']){
  const changed={...policy(3),[field]:field==='authorized_commands'?[{id:'x',program:'arbitrary',args:[]}]:field==='required_read_paths'?['extra.txt']:'changed'};
  assert.throws(()=>validateSupervisionS4W(changed,true));
}
const uncertain=policy(3);uncertain.maintenance_supervision.uncertainty_resolved=false;
assert.throws(()=>validateSupervisionS4W(uncertain,true),/Incerteza/);
const expanded=policy(3);expanded.maintenance_supervision.scope_paths.push('extra.txt');assert.throws(()=>validateSupervisionS4W(expanded,true),/Escopo mudou/);
const readonly:any=policy(6,'intern');readonly.mode='read-only';readonly.expect_changes=false;readonly.required_change_paths=[];delete readonly.maintenance_supervision.approved_action;readonly.maintenance_supervision.scope_sha256=scopeHashS4W(readonly);assert.equal(validateSupervisionS4W(readonly,true).regime,'intern');
const s=validateSupervisionS4W(policy(6,'intern'),true);
assert.equal(checkActionS4W(s,'write_file',{path:'unit.txt',content:'one'},[],0),true);
assert.throws(()=>checkActionS4W(s,'write_file',{path:'unit.txt',content:'two'},[],0),/checkpoint/);
assert.throws(()=>checkActionS4W(s,'write_file',{path:'unit.txt',content:'one'},[],1),/checkpoint/);
assert.equal(checkActionS4W(s,'read_file',{path:'unit.txt'},[],1),false);
assert.equal(checkActionS4W(s,'run_authorized_command',{id:'verify'},[{id:'verify',mode:'read-only'}],1),false);
assert.throws(()=>checkActionS4W(s,'edit_file',{path:'other.txt',before:'a',after:'b'},[],0),/paths aprovados/);
assert.throws(()=>checkActionS4W(s,'run_command',{program:'node',args:[]},[],0),/comando exato/);
assert.equal(checkActionS4W(null,'run_command',{},[],0),false,'Demais projetos não recebem política de manutenção');
const evidenceRequest:any={...policy(3),mode:'read-only',expect_changes:false,required_change_paths:[],provided_evidence:{source:' \tbase\r\n',content:'\n dados internos  preservados \t',extra:'nao integra schema'}};
evidenceRequest.maintenance_supervision.scope_sha256=scopeHashS4W(evidenceRequest);
const evidenceSnapshot=structuredClone(evidenceRequest);
const normalized=normalizedEvidenceS4W(evidenceRequest.provided_evidence);
assert.deepEqual(normalized,{source:'base',content:'dados internos  preservados'});
const mcpProjection={...evidenceRequest,provided_evidence:normalized};
assert.equal(scopeHashS4W(evidenceRequest),scopeHashS4W(mcpProjection));
assert.equal(validateSupervisionS4W(mcpProjection,true).regime,'junior');
assert.deepEqual(evidenceRequest,evidenceSnapshot,'Normalização não muta o pedido original');
for(const change of [{source:'outra origem'},{content:'dados internos preservados'},{content:'outros dados'}]){
  assert.throws(()=>validateSupervisionS4W({...mcpProjection,provided_evidence:{...normalized,...change}},true),/Escopo mudou/);
}
for(const invalid of [null,[],1,{source:1,content:'x'},{source:'x',content:null}])assert.throws(()=>normalizedEvidenceS4W(invalid),/provided_evidence inválida/);
assert.equal(normalizedEvidenceS4W(undefined),undefined);
console.log('hybrid policy: limites 0/5/7/10, incerteza, vínculo, patentes, checkpoint e normalização MCP/contexto OK');
