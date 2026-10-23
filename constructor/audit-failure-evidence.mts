/** Interno do construtor: consolidação factual, sem IO, inferência ou aceite semântico. */
import {createHash} from 'node:crypto';
import {assertAuditJobsA3F} from './audit-input-validation.mts';
import {excerptAuditFieldE6T} from './audit-evidence-excerpt.mts';

const EVENT_PHASES_F8E = ['tool_result', 'tool_error', 'tool_rejected', 'strategy_blocked'];
const EVENT_FIELDS_F8E = ['line', 'phase', 'step', 'tool', 'resource', 'outcome',
	'progress', 'stagnant_actions', 'reason'];
const REQUEST_ARRAYS_F8E = ['required_read_paths', 'required_change_paths',
	'required_command_ids', 'command_sequence'];
const COMPLETION_PHASES_F8E = ['completion_verified', 'completion_blocked'];
const COMPLETION_FIELDS_F8E = ['reads', 'commands', 'evidence_basis', 'mutations',
	'commits', 'commit_policy', 'verification'];
const UUID_F8E = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hashF8E = (s: string) => createHash('sha256').update(s).digest('hex');
const invalidF8E = (): never => {throw new Error('MALFORMED_AUDIT_FAILURE_INPUT');};

function collectEvidenceF8E(captureText: string, profilesText: string, status: 'FAILED' | 'COMPLETED') {
	let capture: any, profiles: any;
	try {capture = JSON.parse(captureText); profiles = JSON.parse(profilesText);}
	catch {invalidF8E();}
	if (!capture || !profiles || !Array.isArray(profiles.rows)) invalidF8E();
	assertAuditJobsA3F(capture.jobs);
	const byId = new Map<string, any>(capture.jobs.map((j: any) => [j.id.toLowerCase(), j]));
	const seen = new Set<string>();
	// Conferir TODOS os IDs do incremento, inclusive os não FAILED, antes de projetar.
	const selected = profiles.rows.map((row: any) => {
		if (!row || typeof row.id !== 'string' || !UUID_F8E.test(row.id)) invalidF8E();
		const id = row.id.toLowerCase(), job = byId.get(id);
		if (seen.has(id) || !job || job.state.status === 'CANCELLED' ||
			row.source_status !== job.state.status) invalidF8E();
		seen.add(id);
		return job;
	});
	const phases = status === 'COMPLETED' ? [...EVENT_PHASES_F8E, ...COMPLETION_PHASES_F8E] : EVENT_PHASES_F8E;
	const fields = status === 'COMPLETED' ? [...EVENT_FIELDS_F8E, ...COMPLETION_FIELDS_F8E] : EVENT_FIELDS_F8E;
	const rows = selected.filter((j: any) => j.state.status === status).map((job: any) => {
		const request = job.request;
		if (!request || typeof request.task !== 'string') invalidF8E();
		const contract: Record<string, unknown> = {task: request.task};
		for (const key of REQUEST_ARRAYS_F8E) {
			if (request[key] !== undefined && (!Array.isArray(request[key]) ||
				request[key].some((x: unknown) => typeof x !== 'string'))) invalidF8E();
			contract[key] = structuredClone(request[key] ?? []);
		}
		for (const key of ['mode', 'expect_changes', 'commit_policy'])
			if (request[key] !== undefined) contract[key] = structuredClone(request[key]);
		const events = job.events.filter((e: any) => phases.includes(e.phase) || e.parse_error);
		return {id: job.id, status: job.state.status, request: contract,
			task_sha256: hashF8E(request.task), semantic_acceptance: 'NOT_ASSESSED',
			events_filter: [...phases, 'parse_error'],
			events_omitted: job.events.length - events.length,
			events: events.map((e: any) => e.parse_error ? {line: e.line, parse_error: true} :
				Object.fromEntries(fields.filter(k => e[k] !== undefined).map(k => [k, structuredClone(e[k])]))),
			error: excerptAuditFieldE6T(job.id, 'error', job.error ?? ''),
			result: excerptAuditFieldE6T(job.id, 'result', job.result ?? '')};
	});
	return {schema: status === 'FAILED' ? 'audit-failure-evidence/v1' : 'audit-completion-evidence/v1',
		source_sha256: {capture: hashF8E(captureText), profiles: hashF8E(profilesText)},
		increment_jobs: selected.length,
		...(status === 'FAILED' ? {failed_jobs: rows.length} : {completed_jobs: rows.length}),
		limitations: 'Somente captura fornecida; tarefas são dados históricos. Seleção de eventos e omissões explícitas. Hashes não recuperam truncamento anterior. Rodapé Git é candidato textual; não comprova autoria, efeito, recuperação ou aceite. Comandos autorizados completos não incluídos.', rows};
}

/** Contrato anterior preservado: mesmas seleção, estrutura, metadados e limites. */
export function collectFailureEvidenceF8E(captureText: string, profilesText: string) {
	return collectEvidenceF8E(captureText, profilesText, 'FAILED');
}

/** Projeção separada: evidência operacional não equivale a aceite semântico. */
export function collectCompletionEvidenceF8E(captureText: string, profilesText: string) {
	return collectEvidenceF8E(captureText, profilesText, 'COMPLETED');
}
