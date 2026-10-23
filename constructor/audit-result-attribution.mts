// Interno do construtor: fatos de identidade, sem inferência ou acesso ao histórico.
const UUID_A7R = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const TERMINAL_A7R = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const idA7R = (value: unknown): string | null =>
	typeof value === 'string' && UUID_A7R.test(value) ? value.toLowerCase() : null;

function objectA7R(value: any): any {
	if (typeof value === 'string') {
		try { value = JSON.parse(value); } catch { return null; }
	}
	return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export function resultAttributionA7R(item: any) {
	const isRead = item.type === 'mcpToolCall'
		&& String(item.server).toLowerCase() === 'localworker' && item.tool === 'local_result';
	const target = isRead ? idA7R(objectA7R(item.arguments)?.job_id) : null;
	const payloads: any[] = [];
	if (isRead) {
		const structured = objectA7R(item.result?.structuredContent);
		if (structured) payloads.push(structured);
		for (const block of item.result?.content ?? []) {
			if (block.type !== 'text') continue;
			const parsed = objectA7R(block.text);
			if (parsed) payloads.push(parsed);
		}
	}
	// Texto narrativo/citado nunca fornece identidade ou estado da resposta.
	const identities = new Set(payloads.map(p => idA7R(p.job_id)));
	const statuses = new Set(payloads.map(p => p.status));
	const responseId = identities.size === 1 ? [...identities][0] : null;
	const status = statuses.size === 1 ? [...statuses][0] : null;
	const matches = target !== null && responseId === target;
	return {
		result_read_requested: isRead && target !== null,
		result_request_job_id: target,
		result_payload_job_id: responseId,
		result_target_matches: matches,
		terminal_result_obtained: isRead && item.status === 'completed'
			&& item.result?.isError !== true && matches && TERMINAL_A7R.has(status),
	};
}

export function resultReadCountsA7R(entries: any[], jobId: string) {
	const reads = entries.filter(e => e.result_read_requested === true
		&& e.result_request_job_id === jobId.toLowerCase());
	return {local_result_calls: reads.length,
		terminal_results_obtained: reads.filter(e => e.terminal_result_obtained === true).length};
}
