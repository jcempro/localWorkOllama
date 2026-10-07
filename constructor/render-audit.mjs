import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assessmentsA7D} from './audit-assessments.mjs';
const dirA7D=path.dirname(fileURLToPath(import.meta.url));
const inputA7D=path.resolve(process.argv[2]||path.join(dirA7D,'audit-private/inventory.json'));
const inventoryA7D=JSON.parse(fs.readFileSync(inputA7D,'utf8'));
const jobsA7D=inventoryA7D.jobs;
assert.equal(new Set(jobsA7D.map(j=>j.id)).size,jobsA7D.length,'ID duplicado na captura');
assert.ok(jobsA7D.every(j=>j.state&&j.state.status!=='CANCELLED'&&!j.invalid_state),'Estado ausente ou cancelado indevidamente incluído');
const selectedA7D=new Map();
for(const row of assessmentsA7D){
  const matches=jobsA7D.filter(j=>j.id.startsWith(row[0]));
  assert.equal(matches.length,1,`Prefixo ausente/ambíguo: ${row[0]}`);
  assert.ok(!selectedA7D.has(matches[0].id),'Avaliação duplicada');
  selectedA7D.set(matches[0].id,row);
}
const safeA7D=value=>String(value).replaceAll('|','\\|').replace(/[\r\n]+/g,' ');
const manifestA7D=[];
const operationalA7D=[],fixturesA7D=[];
const statsA7D={};
for(const job of jobsA7D){
  statsA7D[job.state.status]=(statsA7D[job.state.status]||0)+1;
  const row=selectedA7D.get(job.id);
  const artifactIndex=job.artifacts.map(a=>({path:a.path,bytes:a.bytes,sha256:a.sha256,skipped:a.skipped}));
  const fingerprint=createHash('sha256').update(JSON.stringify(artifactIndex)).digest('hex');
  manifestA7D.push({job_id:job.id,status:job.state.status,captured_at:inventoryA7D.captured_at,artifact_set_sha256:fingerprint,artifacts:artifactIndex});
  const tools=job.events.filter(e=>e.phase==='tool_result');
  const counts=Object.entries(tools.reduce((a,e)=>(a[e.tool]=(a[e.tool]||0)+1,a),{})).map(([k,v])=>`${k}=${v}`).join(', ')||'sem eventos de ferramenta retidos';
  const evidence=`${job.events.length} eventos; ${job.checkpoints.length} checkpoints; ${counts}. Manifesto ${fingerprint.slice(0,12)}.`;
  if(row){
    operationalA7D.push(`### ${job.id}\n\n- **Estado persistido:** ${job.state.status}; entrega: ${job.delivery.status||'ausente'}.\n- **Unidade delegada:** ${row[1]}.\n- **Execução, retorno e avaliação:** ${row[2]}\n- **Causa/impacto:** ${row[3]}\n- **Correções generalizadas:** ${row[4]} (tabela do relatório de causas).\n- **Evidência:** ${evidence}\n`);
    continue;
  }
  let finding;
  if(job.request.task==='Somente leia o status Git.'){
    assert.equal(job.state.status,'COMPLETED');
    finding='Fixture de leitura com modelo simulado; resultado/Git persistidos, não comprova inferência real. Recusas de escrita, quando presentes, são esperadas em read-only.';
    assert.ok(job.result,'Fixture sem resultado');
  }else if(job.request.task==='FORCAR_FALHA: teste de classificação de infraestrutura.'){
    assert.equal(job.state.status,'FAILED');
    if(job.id==='d7a33055-7b9c-4fb8-b2e9-efb572e172ec'){
      assert.match(job.error+' '+job.stderr,/ECONNREFUSED/);
      finding='Falha de transporte ECONNREFUSED do servidor simulado após retries, não prova a variante HTTP500 desejada. Integração atual revalidada com mock vivo; artefato antigo preservado como evidência limitada.';
    }else{
      assert.match(job.error,/500/);
      finding='HTTP500 simulado: falha esperada de infraestrutura; retries limitados e estado terminal coerente. Não é defeito produtivo do modelo.';
    }
  }else if(job.request.task==='Teste de órfão'){
    assert.equal(job.state.status,'FAILED');
    assert.match(job.error,/órfão|heartbeat|processo/i);
    finding='Runner/heartbeat inválido simulado; reconciliação para FAILED era o resultado esperado, sem sucesso fictício.';
  }else throw Error(`Job sem avaliação explícita: ${job.id}`);
  const gaps=[];
  if(!job.events.length)gaps.push('timeline ausente');
  if(!(job.result+job.error).includes('ESTADO GIT DETERMINÍSTICO'))gaps.push('seção Git ausente');
  fixturesA7D.push(`| ${job.id} | ${job.state.status} | ${safeA7D(finding)} | ${job.events.length} eventos; ${fingerprint.slice(0,12)}; ${gaps.join(', ')||'resultado/erro e Git retidos'} |`);
}
const outA7D=`# Auditoria individual dos jobs\n\n[Diagnóstico, causas e correções](audit-causes.md) · [Manifesto de evidências](audit-manifest.json)\n\nCaptura: ${inventoryA7D.captured_at}. **${jobsA7D.length} jobs examinados**, ${inventoryA7D.excluded.length} cancelado(s) excluído(s). Estados originais: ${Object.entries(statsA7D).map(([k,v])=>`${v} ${k}`).join(', ')}. ${operationalA7D.length} operacionais e ${fixturesA7D.length} fixtures. Não confundir estes estados com o aceite da entrega.\n\n## Jobs operacionais\n\n${operationalA7D.join('\n')}\n## Fixtures de integração, individualmente\n\nEstes pedidos pediam deliberadamente leitura simulada, falha HTTP ou reconciliação de órfão. Cada linha foi reconciliada com seu pedido, resultado/erro e artefatos, sem atribuir sucesso de negócio a fixtures. Ausência de logs antigos limita a prova histórica; novos recibos não são retroativos. C8 trata a acumulação de fixtures; os históricos auditados não foram apagados.\n\n| Job | Estado | Avaliação do objetivo real | Evidência e lacunas |\n| --- | --- | --- | --- |\n${fixturesA7D.join('\n')}\n`;
fs.writeFileSync(path.join(dirA7D,'audit-report.md'),outA7D);
fs.writeFileSync(path.join(dirA7D,'audit-manifest.json'),JSON.stringify({schema:1,captured_at:inventoryA7D.captured_at,jobs:manifestA7D},null,2)+'\n');
console.log(JSON.stringify({audited:jobsA7D.length,operational:operationalA7D.length,fixtures:fixturesA7D.length,excluded:inventoryA7D.excluded.length}));
