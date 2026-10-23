/** Interno do construtor: recortes verificáveis; sem IO, inferência ou classificação. */
import {createHash} from 'node:crypto';

const DEFAULT_BODY_CHARS_E6T = 2400;
const DEFAULT_GIT_CHARS_E6T = 600;
const MIN_SECTION_CHARS_E6T = 2;
const GIT_FOOTER_MARKER_E6T = /^ESTADO GIT DETERMINÍSTICO \(/gm;

export interface AuditSliceE6T {start: number; end: number; text: string}
export interface AuditSectionE6T {
	start: number; end: number; captured_chars: number; captured_sha256: string;
	truncated: boolean; slices: AuditSliceE6T[];
	omitted: {start: number; end: number} | null;
}
export interface AuditExcerptE6T {
	job_id: string; field: 'error' | 'result'; captured_chars: number;
	captured_sha256: string; offsets: 'UTF-16';
	body: AuditSectionE6T; git_footer_candidate: AuditSectionE6T | null;
}

function shaE6T(text: string): string {
	return createHash('sha256').update(text, 'utf8').digest('hex');
}
function sectionE6T(text: string, start: number, end: number, budget: number): AuditSectionE6T {
	const length = end - start;
	const ranges = length <= budget ? [[start, end]] :
		[[start, start + Math.ceil(budget / 2)], [end - Math.floor(budget / 2), end]];
	return {start, end, captured_chars: length, captured_sha256: shaE6T(text.slice(start, end)),
		truncated: length > budget,
		slices: ranges.map(([a, b]) => ({start: a, end: b, text: text.slice(a, b)})),
		omitted: length > budget ? {start: ranges[0][1], end: ranges[1][0]} : null};
}

/** Hashes referem-se ao texto capturado fornecido, que pode já conter truncamento anterior.
 * O marcador é apenas candidato a rodapé; não autentica Git, autoria ou integridade da origem.
 * Normas, tarefas e contratos não são entradas deste redutor.
 */
export function excerptAuditFieldE6T(jobId: string, field: 'error' | 'result', text: string,
	options: {bodyChars?: number; gitChars?: number} = {}): AuditExcerptE6T {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId) ||
		(field !== 'error' && field !== 'result') || typeof text !== 'string')
		throw new Error('MALFORMED_AUDIT_EXCERPT');
	const bodyChars = options.bodyChars ?? DEFAULT_BODY_CHARS_E6T;
	const gitChars = options.gitChars ?? DEFAULT_GIT_CHARS_E6T;
	for (const budget of [bodyChars, gitChars]) {
		if (!Number.isSafeInteger(budget) || budget < MIN_SECTION_CHARS_E6T)
			throw new Error('MALFORMED_AUDIT_EXCERPT_BUDGET');
	}
	// Regex local: nenhuma posição de busca é compartilhada entre jobs/chamadas.
	const matches = [...text.matchAll(new RegExp(GIT_FOOTER_MARKER_E6T))];
	const footerStart = matches.length ? matches[matches.length - 1].index! : text.length;
	return {job_id: jobId, field, captured_chars: text.length, captured_sha256: shaE6T(text),
		offsets: 'UTF-16', body: sectionE6T(text, 0, footerStart, bodyChars),
		git_footer_candidate: footerStart === text.length ? null :
			sectionE6T(text, footerStart, text.length, gitChars)};
}

/** Checagem mecânica de citação exata na parte visível do mesmo job/campo.
 * Não valida paráfrase, causalidade ou ausência de efeitos; isso cabe à revisão.
 */
export function hasAuditQuoteE6T(excerpt: AuditExcerptE6T, jobId: string,
	field: 'error' | 'result', quote: string): boolean {
	if (excerpt.job_id.toLowerCase() !== jobId.toLowerCase() || excerpt.field !== field || !quote)
		return false;
	return [excerpt.body, excerpt.git_footer_candidate].some(section =>
		section?.slices.some(slice => slice.text.includes(quote)));
}
