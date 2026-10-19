// @ts-check
/**
 * Validação estrita de entrada de jobs para auditoria.
 * Não muta entrada, não descarta inválidos, não usa IO/rede/dependências.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {void}
 */
export function assertAuditJobsA3F(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error('MALFORMED_AUDIT_INPUT');
  }

  const seenIds = new Set();

  for (const job of value) {
    if (job === null || Array.isArray(job)) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    if (typeof job !== 'object') {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    const jobId = job.id;
    if (typeof jobId !== 'string' || !UUID_REGEX.test(jobId)) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    const jobIdLower = jobId.toLowerCase();
    if (seenIds.has(jobIdLower)) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }
    seenIds.add(jobIdLower);

    if (job.state === null || Array.isArray(job.state)) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    if (typeof job.state !== 'object' || job.state === undefined) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    const status = job.state.status;
    if (
      status !== 'QUEUED' &&
      status !== 'RUNNING' &&
      status !== 'COMPLETED' &&
      status !== 'FAILED' &&
      status !== 'CANCELLED'
    ) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    if (job.state.step !== undefined) {
      if (typeof job.state.step !== 'number' || !Number.isSafeInteger(job.state.step) || job.state.step < 0) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }
    }

    if (job.state.context_compactions !== undefined) {
      if (
        typeof job.state.context_compactions !== 'number' ||
        !Number.isSafeInteger(job.state.context_compactions) ||
        job.state.context_compactions < 0
      ) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }
    }

    if (job.state.error_kind !== undefined) {
      if (typeof job.state.error_kind !== 'string') {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }
    }

    if (!Array.isArray(job.events)) {
      throw new Error('MALFORMED_AUDIT_INPUT');
    }

    for (const event of job.events) {
      if (event === null || Array.isArray(event)) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }

      if (typeof event !== 'object' || event === undefined) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }

      const line = event.line;
      if (typeof line !== 'number' || !Number.isSafeInteger(line) || line <= 0) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }

      const phase = event.phase;
      if (typeof phase !== 'string' || phase.trim() === '') {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }

      if (event.step !== undefined) {
        if (typeof event.step !== 'number' || !Number.isSafeInteger(event.step) || event.step < 0) {
          throw new Error('MALFORMED_AUDIT_INPUT');
        }
      }

      if (event.tool !== undefined) {
        if (typeof event.tool !== 'string') {
          throw new Error('MALFORMED_AUDIT_INPUT');
        }
      }

      if (event.outcome !== undefined) {
        if (typeof event.outcome !== 'string') {
          throw new Error('MALFORMED_AUDIT_INPUT');
        }
      }
    }

    if (job.request !== undefined) {
      if (job.request === null || Array.isArray(job.request)) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }

      if (typeof job.request !== 'object' || job.request === undefined) {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }

      if (job.request.required_read_paths !== undefined) {
        if (!Array.isArray(job.request.required_read_paths)) {
          throw new Error('MALFORMED_AUDIT_INPUT');
        }
        for (const item of job.request.required_read_paths) {
          if (typeof item !== 'string') {
            throw new Error('MALFORMED_AUDIT_INPUT');
          }
        }
      }

      if (job.request.required_command_ids !== undefined) {
        if (!Array.isArray(job.request.required_command_ids)) {
          throw new Error('MALFORMED_AUDIT_INPUT');
        }
        for (const item of job.request.required_command_ids) {
          if (typeof item !== 'string') {
            throw new Error('MALFORMED_AUDIT_INPUT');
          }
        }
      }

      if (job.request.command_sequence !== undefined) {
        if (!Array.isArray(job.request.command_sequence)) {
          throw new Error('MALFORMED_AUDIT_INPUT');
        }
        for (const item of job.request.command_sequence) {
          if (typeof item !== 'string') {
            throw new Error('MALFORMED_AUDIT_INPUT');
          }
        }
      }
    }

    if (job.result !== undefined) {
      if (typeof job.result !== 'string') {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }
    }

    if (job.error !== undefined) {
      if (typeof job.error !== 'string') {
        throw new Error('MALFORMED_AUDIT_INPUT');
      }
    }
  }
}
