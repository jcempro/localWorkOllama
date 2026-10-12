import fs from 'node:fs';
import assert from 'node:assert/strict';
const [inventoryPath,interactionPath,outputPath]=process.argv.slice(2);
if(!inventoryPath||!interactionPath||!outputPath)throw Error('Uso: render-interactions.mts <inventory> <interactions> <report.md>');
const inv=JSON.parse(fs.readFileSync(inventoryPath,'utf8')),links=JSON.parse(fs.readFileSync(interactionPath,'utf8'));
assert.equal(links.source_capture,inv.captured_at);
assert.equal(links.schema,3,'Captura exige turnos publicos e falhas anteriores ao job');
assert.equal(links.jobs.length,inv.jobs.length);
assert.deepEqual(new Set(links.jobs.map(j=>j.id)),new Set(inv.jobs.map(j=>j.id)));
const mocked=j=>['Somente leia o status Git.','FORCAR_FALHA: teste de classificação de infraestrutura.','Teste de órfão'].includes(j.request.task);
const rows=inv.jobs.map(j=>{
 const link=links.jobs.find(x=>x.id===j.id);assert.ok(link);
 const expected=mocked(j);
 const assessment=expected?'Fixture: nao exige conversa real':link.finding??(j.delivery.parse_error?'RECIBO_CORROMPIDO':'Sem desvio de transporte comprovado');
 return `| ${j.id} | ${j.state.status} | ${j.delivery.status??'corrompido'} | ${link.local_result_calls} / ${link.terminal_results_obtained} | ${link.linked_turns.length} | ${link.callback_turns.map(t=>t.status+(t.error_kind?':'+t.error_kind:'')+(t.final_response?' (resposta final)':' (sem resposta final)')).join(', ')||'sem callback retido'} | ${assessment} |`;
});
const op=inv.jobs.filter(j=>!mocked(j));
const sequence=op.filter(j=>j.request.command_sequence?.length);
const inference=op.filter(j=>!j.request.command_sequence?.length);
const stats=arr=>{
 const values=arr.map(j=>(Date.parse(j.state.completed_at)-Date.parse(j.state.started_at))/1000).filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);
 return {n:values.length,median:values.length?Math.round(values[Math.floor(values.length/2)]):null,completed:arr.filter(j=>j.state.status==='COMPLETED').length,total:arr.length};
};
const a=stats(sequence),b=stats(inference);
const quota=links.jobs.filter(j=>j.callback_turns.some(t=>t.error_kind==='usageLimitExceeded')).length;
const repeated=links.jobs.filter(j=>j.local_result_calls>1).length;
const missing=links.jobs.filter(j=>j.finding==='CALLBACK_EVIDENCE_NOT_FOUND');
const fixtureMissing=missing.filter(link=>mocked(inv.jobs.find(j=>j.id===link.id))).length;
assert.equal(missing.length,fixtureMissing,'Callback operacional sem evidencia requer nova avaliacao');
const stagnant=inv.jobs.filter(j=>/aus[eê]ncia de progresso/i.test(j.error??'')).length;
const treatments={NUL_JSON:'C11: indice recuperado; origem comum a Markdown/TTS',EMPTY_INDEX_LEGACY_MCP:'C14: indice vazio retrocompativel/ponte atualizada',DESCRIPTION_TOO_LONG:'C9: description <=240, preservar validador',ABSOLUTE_PROGRAM_REQUIRED:'C9: descobrir executavel real; preservar guarda',LEGACY_CYCLE_BUDGET:'C5: incompletude/segmentacao; teto configuravel',LEGACY_SYNC_TIMEOUT:'C10: persistencia assincrona; sem teto temporal do job',TRANSPORT_CLOSED:'C10: ponte instalada; reconciliar antes de nova unidade',QUOTA_REVIEW_NOT_EXECUTED:'C10/SR-001: aguardar cota; sem bypass'};
const prejob=links.failed_starts.map(f=>{
 assert.ok(treatments[f.diagnostic],`Falha anterior ao job exige avaliacao: ${f.item}`);
 return `| ${f.thread} | ${f.turn} | ${f.classification} | ${f.diagnostic} | ${f.final_response?'sim':'nao'} | ${treatments[f.diagnostic]} |`;
});
const out=`# Auditoria supervisor ↔ Worker — captura de ${inv.captured_at.slice(0,10)} UTC

Cobertura: **${inv.jobs.length} jobs nao cancelados**, ${op.length} operacionais e ${inv.jobs.length-op.length} fixtures, ${links.threads.length} identidades de conversa examinadas. Um CANCELLED excluido antes da leitura de seus demais artefatos. [Revisao individual](audit-report.md) e [manifesto de hashes](audit-manifest.json) preservam a evidencia da captura. Estados posteriores a ela nao sao retroativos.

Falhas de transporte/supervisao comprovadas: ${quota} jobs tiveram callback que terminou em usageLimitExceeded e ${repeated} unidades tiveram chamadas local_result repetidas. A tabela separa tentativas de chamadas que realmente retornaram resultado terminal; chamada falha ou RUNNING nao equivale a resultado obtido. Os ${fixtureMissing} callbacks nao encontrados marcados automaticamente sao fixtures, nao falhas de entrega operacional. Um recibo operacional estava corrompido; a recuperacao preservou bytes/hash e marcou AMBIGUOUS. Correlacao por ID distingue envio, recebimento, resposta e aceite; ausencia de historico nao permite inventar prova.

Gargalos: ${a.completed}/${a.total} unidades com sequencia deterministica chegaram a COMPLETED; mediana descritiva ${a.median}s (${a.n} duracoes retidas). Inferencia agentiva: ${b.completed}/${b.total}, mediana ${b.median}s (${b.n} duracoes). Tarefas/hardware/carga nao foram controlados: isto nao e benchmark causal nem prova de que sequencias arbitrarias sao corretas. Ha ${stagnant} jobs retidos cuja falha registra ausencia de progresso; os alvos/efeitos parciais e continuacoes corretivas constam da revisao por ID.

Correcoes aplicadas: C11 sincroniza persistencia e recupera indice ativo pelos estados integros; recibo corrompido fica ambiguo com original preservado. C12 orienta adaptacao apos duas acoes improdutivas, preservando bloqueio apos quatro e limites de autoridade. C13 descobre CLI apos atualizacao do Desktop, recuperando as duas tarefas SR-001 que estavam bloqueadas por ENOENT. C14 preserva indice vazio compativel com MCP legado; C15 restaura conversa nao carregada com fila exata, sem reenvio. [Causas e prova de retomada](audit-causes.md) distinguem ensaio real de fixtures. C1–C10 continuam vigentes; testes funcionais falhos, caminhos inferidos, exportacoes inventadas e formatos de modulo incorretos exigem a revisao/segmentacao ja descritas.

Windows: Kernel-Power41 e EventLog6008 registraram reinicio inesperado no intervalo do desaparecimento de 0636b4d3. Isso explica a perda de processo e e consistente com arquivos zerados; nao identifica o gatilho fisico do reinicio nem autoriza atribui-lo ao Ollama. Persistencia sincronizada reduz o risco, sem prometer integridade absoluta de energia/hardware. Nenhum job antigo foi reiniciado para fabricar evidencia.

## Todas as interacoes retidas, por job

Contagem de local_result usa referencias diretas ao ID. Candidatos a callback exigem mensagem publica com a formula de retomada do runner; mencao manual isolada nao conta como callback. Para cada turno vinculado por ID, foram cruzadas todas as mensagens/ferramentas publicas, inclusive a resposta final sem repetir o ID. Resposta final e identificada pela fase oficial final/final_answer, sem inferir aceite semantico. Nao le reasoning/chain-of-thought. IDs de fixtures sem chat real continuam na tabela para cobertura integral. COMPLETED abaixo e estado do Worker, nao conclusao da FT. Recuperacao pendente/ambigua permanece explicita. A captura dos jobs e de ${inv.captured_at}; a leitura do historico e de ${links.captured_at}.

| Job | Estado capturado | Entrega capturada | local_result tentativas / resultados terminais | Turnos publicos vinculados | Candidatos a callback | Avaliacao |
| --- | --- | --- | ---: | ---: | --- | --- |
${rows.join('\n')}

## Chamadas que falharam antes de retornar job

Descoberta por chamadas reais ao servidor localworker inclui conversas sem job persistido, evitando omissao por inventario baseado somente em IDs. ${prejob.length} chamadas publicas foram classificadas individualmente; validacao de entrada e revisao de aprovacao precedem o runtime. Resposta final humana aqui nao comprova implementacao. Causas iguais usam a mesma correcao, sem desligar guardas nem refazer tarefas de negocio.

| Conversa | Turno | Classe | Diagnostico verificavel | Resposta final retida | Tratamento |
| --- | --- | --- | --- | --- | --- |
${prejob.join('\n')}

## Reproducao

Capture jobs com audit-jobs.mjs, revise assessments e gere audit-report.md. Execute audit-interactions.mts com inventario, CODEX_HOME real e destino privado; depois render-interactions.mts com ambos os JSON e destino Markdown. Os argumentos sao paths absolutos ou relativos explicitos; dados brutos permanecem em audit-private/ ignorado no Git. Permissao SQLite/WAL exige execucao local autorizada. Falta de schema/historico interrompe com diagnostico, nao simula entrega. Ferramentas internas nao integram src nem o runtime consumidor.
`;
assert.ok(!/C:\\Users\\admin|D:\\trampo|caf0addf/.test(out),'Dado privado no relatorio');
fs.writeFileSync(outputPath,out);
console.log(JSON.stringify({coverage:rows.length,operational:op.length,fixtures:inv.jobs.length-op.length,sequence:a,inference:b}));
