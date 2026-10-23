import assert from 'node:assert/strict';
import test from 'node:test';
import {resultAttributionA7R, resultReadCountsA7R} from './audit-result-attribution.mts';

const oldId = 'bd98a7c5-1785-46c9-8267-0048dd9ade26';
const nextId = 'bec20b0f-ceeb-4de1-a353-6b0028630f4e';
function call(id = oldId, payload: any = {job_id: id, status: 'COMPLETED'}) {
	return {type: 'mcpToolCall', server: 'localworker', tool: 'local_result',
		arguments: {job_id: id}, status: 'completed', result: {structuredContent: payload}};
}

test('menção histórica permanece referência, sem multiplicar consultas ao job antigo', () => {
	const first = resultAttributionA7R(call());
	const second = resultAttributionA7R(call(nextId,
		{job_id: nextId, status: 'COMPLETED', result: `Continuação de ${oldId}`}));
	assert.deepEqual(resultReadCountsA7R([first, second], oldId),
		{local_result_calls: 1, terminal_results_obtained: 1});
	assert.deepEqual(resultReadCountsA7R([second], nextId),
		{local_result_calls: 1, terminal_results_obtained: 1});
});

test('duplicação verdadeira e chamada falha continuam observáveis', () => {
	const failed = {...call(), status: 'failed'};
	assert.deepEqual(resultReadCountsA7R([resultAttributionA7R(call()),
		resultAttributionA7R(call()), resultAttributionA7R(failed)], oldId),
		{local_result_calls: 3, terminal_results_obtained: 2});
});

test('argv JSON e resposta text JSON; UUID normalizado', () => {
	const item: any = call(oldId.toUpperCase());
	item.arguments = JSON.stringify(item.arguments);
	item.result = {content: [{type: 'text', text: 'texto não JSON'},
		{type: 'text', text: JSON.stringify({job_id: oldId, status: 'FAILED'})}]};
	assert.equal(resultAttributionA7R(item).terminal_result_obtained, true);
});

test('identidade ausente/divergente/ambígua não comprova resultado terminal', () => {
	for (const payload of [{status: 'COMPLETED'}, {job_id: nextId, status: 'COMPLETED'},
		{job_id: oldId, status: 'RUNNING'}, {job_id: oldId, status: 'QUEUED_TO_CHAT'}]) {
		assert.equal(resultAttributionA7R(call(oldId, payload)).terminal_result_obtained, false);
	}
	const ambiguous: any = call();
	ambiguous.result.content = [{type: 'text', text: JSON.stringify({job_id: nextId, status: 'COMPLETED'})}];
	assert.equal(resultAttributionA7R(ambiguous).terminal_result_obtained, false);
	const error: any = call(); error.result.isError = true;
	assert.equal(resultAttributionA7R(error).terminal_result_obtained, false);
});

test('servidor homônimo, ferramentas diversas e texto malformado não são consultas', () => {
	for (const change of [{server: 'thirdparty'}, {tool: 'local_analyze'},
		{type: 'agentMessage'}, {arguments: '{bad'}, {arguments: {job_id: '../x'}}]) {
		const facts = resultAttributionA7R({...call(), ...change});
		assert.equal(facts.result_read_requested, false);
		assert.equal(facts.terminal_result_obtained, false);
	}
});
