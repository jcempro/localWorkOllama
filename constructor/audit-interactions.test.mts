import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const cli = fileURLToPath(new URL('./audit-interactions.mts', import.meta.url));
test('SQLite real: atribuição, captura congelada, integridade e saída exclusiva', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-a7r-'));
	const a = 'bd98a7c5-1785-46c9-8267-0048dd9ade26';
	const b = 'bec20b0f-ceeb-4de1-a353-6b0028630f4e';
	const cancelled = '33333333-3333-4333-8333-333333333333';
	const thread = '11111111-1111-4111-8111-111111111111';
	const turn = '22222222-2222-4222-8222-222222222222';
	const db = new DatabaseSync(path.join(root, 'thread_history_1.sqlite'));
	try {
		db.exec('CREATE TABLE thread_turns(thread_id TEXT,turn_id TEXT,status TEXT,error_json TEXT,started_at INTEGER); CREATE TABLE thread_items(thread_id TEXT,turn_id TEXT,item_id TEXT,item_type TEXT,item_json TEXT,rollout_ordinal INTEGER)');
		db.prepare('INSERT INTO thread_turns VALUES(?,?,?,?,?)').run(thread, turn, 'inProgress', null, 1);
		const put = (id: string, jobId: string, ordinal: number, change: any = {}) => {
			const item = {type: 'mcpToolCall', server: 'localworker', tool: 'local_result',
				status: 'completed', arguments: {job_id: jobId}, result: {structuredContent:
					{job_id: jobId, status: 'COMPLETED', result: `referência ${a}`}}, ...change};
			db.prepare('INSERT INTO thread_items VALUES(?,?,?,?,?,?)').run(thread, turn, id, item.type, JSON.stringify(item), ordinal);
		};
		put('read-a', a, 1); put('read-b', b, 2); put('cancelled', cancelled, 3,
			{result: {structuredContent: {job_id: cancelled, status: 'CANCELLED'}}});
		const inventory = path.join(root, 'inventory.json'), first = path.join(root, 'first.json');
		fs.writeFileSync(inventory, JSON.stringify({captured_at: 'snapshot', excluded: [{id: cancelled}],
			jobs: [a,b].map(id => ({id, state: {status:'COMPLETED'}, request: {thread_id:thread}, delivery: {status:'QUEUED_TO_CHAT'}}))}));
		const run = (output: string, frozen?: string) => spawnSync(process.execPath,
			['--experimental-strip-types', cli, inventory, root, output, ...(frozen?[frozen]:[])],
			{encoding:'utf8', windowsHide:true, timeout:10000});
		let receipt = run(first); assert.equal(receipt.status, 0, receipt.stderr);
		const snapshot = JSON.parse(fs.readFileSync(first,'utf8'));
		assert.equal(snapshot.schema, 4); assert.equal(snapshot.jobs.length, 2);
		for(const job of snapshot.jobs) {
			assert.equal(job.local_result_calls, 1); assert.equal(job.terminal_results_obtained, 1);
		}
		assert.equal(snapshot.jobs[0].references.length, 2, 'menção preservada');
		put('later-read-a', a, 4);
		db.exec("UPDATE thread_turns SET status='completed'");
		const second = path.join(root, 'frozen.json'); receipt = run(second, first);
		assert.equal(receipt.status,0,receipt.stderr);
		const fixed = JSON.parse(fs.readFileSync(second,'utf8'));
		assert.equal(fixed.reconciled_from.items, 2);
		assert.equal(fixed.jobs[0].local_result_calls,1,'não incorporar consulta posterior');
		assert.equal(fixed.jobs[0].linked_turns[0].status,'inProgress','preservar estado histórico');
		assert.notEqual(run(second,first).status,0,'não sobrescrever saída');
		db.exec("DELETE FROM thread_items WHERE item_id='read-b'");
		const missing = path.join(root,'missing.json');
		assert.notEqual(run(missing,first).status,0); assert.equal(fs.existsSync(missing),false);
		put('read-b',b,2,{result:{structuredContent:{job_id:b,status:'FAILED'}}});
		const divergent = path.join(root,'divergent.json');
		assert.notEqual(run(divergent,first).status,0); assert.equal(fs.existsSync(divergent),false);
	} finally {
		db.close(); fs.rmSync(root,{recursive:true,force:true});
	}
});
