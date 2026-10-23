import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {excerptAuditFieldE6T, hasAuditQuoteE6T} from './audit-evidence-excerpt.mts';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

test('texto curto e vazio são preservados integralmente, com hash exato', () => {
	for (const text of ['', 'ação\r\n😀']) {
		const out = excerptAuditFieldE6T(A, 'error', text);
		assert.equal(out.captured_sha256, sha(text));
		assert.equal(out.captured_chars, text.length);
		assert.deepEqual(out.body.slices, [{start: 0, end: text.length, text}]);
		assert.equal(out.body.omitted, null);
		assert.equal(out.git_footer_candidate, null);
	}
});

test('exceção no fim não é ocultada por fonte ecoada ou grande rodapé Git', () => {
	const body = '[eval1]:1\n' + 'fonte '.repeat(1000) + '\nSyntaxError: Unexpected string\n';
	const text = body + 'ESTADO GIT DETERMINÍSTICO (histórico)\n## dev\n' + ' M arquivo\n'.repeat(1000);
	const out = excerptAuditFieldE6T(A, 'error', text, {bodyChars: 100, gitChars: 80});
	assert.equal(out.captured_sha256, sha(text));
	assert.equal(out.body.captured_sha256, sha(body));
	assert.equal(out.body.end, body.length);
	assert.equal(out.body.truncated, true);
	assert.equal(out.body.slices.reduce((n, s) => n + s.text.length, 0), 100);
	assert.equal(out.git_footer_candidate!.slices.reduce((n, s) => n + s.text.length, 0), 80);
	assert.equal(hasAuditQuoteE6T(out, A, 'error', 'SyntaxError: Unexpected string'), true);
	for (const section of [out.body, out.git_footer_candidate!]) {
		for (const slice of section.slices) assert.equal(slice.text, text.slice(slice.start, slice.end));
		assert.deepEqual(section.omitted, {start: section.slices[0].end, end: section.slices[1].start});
	}
});

test('citação não atravessa lacuna, job ou campo; nenhuma ausência é inferida', () => {
	const out = excerptAuditFieldE6T(A, 'error', 'abc' + 'x'.repeat(40) + 'def', {bodyChars: 6});
	assert.equal(hasAuditQuoteE6T(out, A, 'error', 'abcdef'), false);
	assert.equal(hasAuditQuoteE6T(out, B, 'error', 'abc'), false);
	assert.equal(hasAuditQuoteE6T(out, A, 'result', 'abc'), false);
	assert.equal(hasAuditQuoteE6T(out, A, 'error', ''), false);
	assert.equal(hasAuditQuoteE6T(out, A, 'error', 'abc'), true);
});

test('último marcador em início de linha; chamadas independentes, sem autenticação implícita', () => {
	const text = 'menção ESTADO GIT DETERMINÍSTICO (não rodapé)\n' +
		'ESTADO GIT DETERMINÍSTICO (antigo)\nx\nESTADO GIT DETERMINÍSTICO (último)\ny';
	const out = excerptAuditFieldE6T(A, 'result', text);
	assert.equal(out.git_footer_candidate!.start, text.lastIndexOf('ESTADO GIT'));
	assert.equal(excerptAuditFieldE6T(B, 'error', 'sem rodapé').git_footer_candidate, null);
	assert.equal(excerptAuditFieldE6T(A, 'result', text).body.end, out.body.end);
});

test('limites pares/ímpares/exatos mantêm offsets e total visível; entradas inválidas recusadas', () => {
	for (const size of [2, 3, 9, 10]) {
		const text = '0123456789';
		const out = excerptAuditFieldE6T(A, 'error', text, {bodyChars: size});
		assert.equal(out.body.slices.reduce((n, s) => n + s.text.length, 0), size);
		assert.equal(out.body.truncated, size < text.length);
	}
	for (const size of [0, 1, -1, 1.5, NaN, Infinity])
		assert.throws(() => excerptAuditFieldE6T(A, 'error', 'x', {bodyChars: size}), /BUDGET/);
	assert.throws(() => excerptAuditFieldE6T('inválido', 'error', 'x'), /MALFORMED/);
	assert.throws(() => excerptAuditFieldE6T(A, 'task' as any, 'x'), /MALFORMED/);
});
