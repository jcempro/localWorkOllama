import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {collectFailureEvidenceF8E, collectCompletionEvidenceF8E} from './audit-failure-evidence.mts';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const job = (id = A, status = 'FAILED') => ({id, state: {status}, request: {
	task: 'Preservar todos os requisitos; testar depois de editar.', required_command_ids: ['test']},
	events: [{line: 1, phase: 'tool_result', tool: 'write_file', outcome: 'ok', resource: 'alvo'},
		{line: 2, phase: 'model_thinking', private: 'NÃO INCLUIR'}, {line: 3, parse_error: true}],
	error: 'erro literal'});
const project = (jobs: any[], rows = jobs.map(j => ({id: j.id, source_status: j.state.status}))) =>
	collectFailureEvidenceF8E(JSON.stringify({jobs}), JSON.stringify({rows}));

test('join exato, tarefas/contratos integrais, filtro explícito, sem raciocínio privado ou aceite', () => {
	const jobs = [job(), job(B, 'COMPLETED')], before = JSON.stringify(jobs);
	const out = project(jobs);
	assert.equal(out.increment_jobs, 2); assert.equal(out.failed_jobs, 1);
	assert.equal(out.rows[0].request.task, jobs[0].request.task);
	assert.deepEqual(out.rows[0].request.required_command_ids, ['test']);
	assert.deepEqual(out.rows[0].events.map(e => e.line), [1, 3]);
	assert.equal(out.rows[0].events_omitted, 1);
	assert.equal(out.rows[0].semantic_acceptance, 'NOT_ASSESSED');
	assert.equal(JSON.stringify(out).includes('NÃO INCLUIR'), false);
	assert.equal(JSON.stringify(jobs), before);
	assert.deepEqual(out, project(jobs));
	assert.equal(out.source_sha256.capture, createHash('sha256').update(JSON.stringify({jobs})).digest('hex'));
});

test('IDs ausentes/duplicados/ambiguidades de status/cancelamento falham sem projeção parcial', () => {
	const jobs = [job(), job(B, 'COMPLETED')];
	for (const rows of [
		[{id: A, source_status: 'FAILED'}, {id: A.toUpperCase(), source_status: 'FAILED'}],
		[{id: '33333333-3333-4333-8333-333333333333', source_status: 'FAILED'}],
		[{id: A, source_status: 'COMPLETED'}], [{id: '../alvo', source_status: 'FAILED'}],
	]) assert.throws(() => project(jobs, rows), /MALFORMED/);
	assert.throws(() => project([job(A, 'CANCELLED')]), /MALFORMED/);
});

test('entradas malformadas e requisitos não textuais são recusados', () => {
	assert.throws(() => collectFailureEvidenceF8E('{', '{}'), /MALFORMED/);
	assert.throws(() => collectFailureEvidenceF8E('{"jobs":[]}', '{}'), /MALFORMED/);
	const j: any = job(); j.request.required_change_paths = [7];
	assert.throws(() => project([j]), /MALFORMED/);
	delete j.request;
	assert.throws(() => project([j]), /MALFORMED/);
});

test('COMPLETED separado preserva bloqueio anterior, recibo e limitações sem promover a aceite', () => {
	const j: any = job(B, 'COMPLETED');
	j.events.push({line: 4, phase: 'completion_blocked', reason: 'test pendente'},
		{line: 5, phase: 'completion_verified', reads: ['alvo'], commands: ['test'],
			evidence_basis: 'tools', mutations: 1, commits: 0, commit_policy: 'supervisor',
			verification: 'Aceite semântico pendente.'});
	const capture = JSON.stringify({jobs: [job(), j]});
	const profiles = JSON.stringify({rows: [{id: A, source_status: 'FAILED'}, {id: B, source_status: 'COMPLETED'}]});
	const out = collectCompletionEvidenceF8E(capture, profiles);
	assert.equal(out.schema, 'audit-completion-evidence/v1');
	assert.equal(out.completed_jobs, 1); assert.equal('failed_jobs' in out, false);
	assert.deepEqual(out.rows.map(r => r.id), [B]);
	assert.deepEqual(out.rows[0].events.map(e => e.line), [1, 3, 4, 5]);
	assert.deepEqual(out.rows[0].events.at(-1)?.commands, ['test']);
	assert.equal(out.rows[0].semantic_acceptance, 'NOT_ASSESSED');
	const legacy = collectFailureEvidenceF8E(JSON.stringify({jobs: [j]}),
		JSON.stringify({rows: [{id: B, source_status: 'COMPLETED'}]}));
	assert.equal(legacy.failed_jobs, 0); assert.equal('completed_jobs' in legacy, false);
	assert.equal(legacy.schema, 'audit-failure-evidence/v1');
	assert.throws(() => collectCompletionEvidenceF8E(capture,
		JSON.stringify({rows: [{id: B, source_status: 'FAILED'}]})), /MALFORMED/);
});
