// constructor/audit-facts.mts
// Implementação de extractAuditFactsA3F: pura, sem fs/rede/inferência/causas/risco.

import { createHash } from 'node:crypto';
import { assertAuditJobsA3F } from './audit-input-validation.mts';

type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface JobEvent {
  line: number;
  phase: string;
  step?: number;
  tool?: string;
  outcome?: string;
}

interface JobRequest {
  required_read_paths?: string[];
  required_command_ids?: string[];
  command_sequence?: string[];
}

interface Job {
  id: string;
  state: {
    status: JobStatus;
    step?: number;
    error_kind?: string;
    context_compactions?: number;
  };
  events: JobEvent[];
  request?: JobRequest;
  result?: string;
  error?: string;
}

interface Row {
  id: string;
  status: string;
  error_kind: string | null;
  reported_step: number | null;
  max_logged_step: number | null;
  context_compactions: number | null;
  tool_counts: {
    read_file_ok: number;
    direct_mutation_ok: number;
    authorized_command_ok: number;
    errors: number;
    rejected: number;
  };
  success_lines: number[];
  error_lines: number[];
  rejected_lines: number[];
  required_reads_count: number | null;
  required_commands_count: number | null;
  sequence_length: number | null;
  result_present: boolean;
  git_section_present: boolean;
  semantic_acceptance: 'NOT_ASSESSED';
}

interface Output {
  schema: 1;
  hashes: {
    current: string;
    baseline: string;
  };
  counts: {
    current: number;
    baseline: number;
    new: number;
  };
  rows: Row[];
}

function normalizeUUID(id: string): string {
  return id.toLowerCase();
}

function extractStepNumber(step?: number): number | null {
  if (step === undefined) return null;
  return Number.isSafeInteger(step) && step >= 0 ? step : null;
}

function extractAuditFactsA3F(currentText: string, baselineText: string): Output {
  const currentHash = createHash('sha256').update(currentText, 'utf8').digest('hex');
  const baselineHash = createHash('sha256').update(baselineText, 'utf8').digest('hex');

  let currentJobs: Job[] = [];
  let baselineJobs: Job[] = [];

  try {
    const currentParsed = JSON.parse(currentText);
    const baselineParsed = JSON.parse(baselineText);

    if (!Array.isArray(currentParsed.jobs) || !Array.isArray(baselineParsed.jobs)) {
      throw new Error('MALFORMED_JOBS_ARRAY');
    }

    currentJobs = currentParsed.jobs;
    baselineJobs = baselineParsed.jobs;
  } catch {
    throw new Error('MALFORMED_JSON');
  }

  assertAuditJobsA3F(currentJobs);
  assertAuditJobsA3F(baselineJobs);
  const validCurrent = currentJobs;
  const validBaseline = baselineJobs;

  const normalizedCurrent = validCurrent.map(job => ({
    ...job,
    id: normalizeUUID(job.id),
    events: job.events.map(e => ({ ...e, step: e.step ?? undefined })),
  }));

  const normalizedBaseline = validBaseline.map(job => ({
    ...job,
    id: normalizeUUID(job.id),
    events: job.events.map(e => ({ ...e, step: e.step ?? undefined })),
  }));

  const filteredCurrent = normalizedCurrent.filter(job => job.state.status !== 'CANCELLED');
  const filteredBaseline = normalizedBaseline.filter(job => job.state.status !== 'CANCELLED');

  const baselineIds = new Set(filteredBaseline.map(job => job.id));
  const newJobs = filteredCurrent.filter(job => !baselineIds.has(job.id)).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

  const rows: Row[] = newJobs.map(job => {
    let maxLoggedStep: number | null = null;
    let readFileOk = 0;
    let directMutationOk = 0;
    let authorizedCommandOk = 0;
    let errors = 0;
    let rejected = 0;
    let successLines: number[] = [];
    let errorLines: number[] = [];
    let rejectedLines: number[] = [];

    for (const event of job.events) {
      const stepNum = extractStepNumber(event.step);
      if (stepNum !== null && (maxLoggedStep === null || stepNum > maxLoggedStep)) {
        maxLoggedStep = stepNum;
      }

      if (event.phase === 'tool_result') {
        if (event.outcome === 'ok') {
          successLines.push(event.line);
          if (event.tool === 'read_file') {
            readFileOk++;
          } else if (event.tool === 'write_file' || event.tool === 'edit_file') {
            directMutationOk++;
          } else if (event.tool === 'run_authorized_command') {
            authorizedCommandOk++;
          }
        } else if (event.outcome === 'error') {
          errors++;
          errorLines.push(event.line);
        } else if (event.outcome === 'rejected') {
          rejected++;
          rejectedLines.push(event.line);
        }
      }
    }

    const requiredReadsCount = job.request?.required_read_paths?.length ?? null;
    const requiredCommandsCount = job.request?.required_command_ids?.length ?? null;
    const sequenceLength = job.request?.command_sequence?.length ?? null;

    const result_present = typeof job.result === 'string' && job.result.length > 0;
    const git_section_present = (job.result ?? '').includes('ESTADO GIT DETERMINÍSTICO') || (job.error ?? '').includes('ESTADO GIT DETERMINÍSTICO');

    let errorKind: string | null = job.state.error_kind ?? null;
    if (errorKind !== null) {
      const allowedKinds = ['WORKER_INCOMPLETE', 'WORKER_INFRA_ERROR', 'NEEDS_SUPERVISOR'];
      if (!allowedKinds.includes(errorKind)) {
        errorKind = 'OTHER';
      }
    }

    return {
      id: job.id,
      status: job.state.status,
      error_kind: errorKind,
      reported_step: job.state.step ?? null,
      max_logged_step: maxLoggedStep,
      context_compactions: job.state.context_compactions ?? null,
      tool_counts: {
        read_file_ok: readFileOk,
        direct_mutation_ok: directMutationOk,
        authorized_command_ok: authorizedCommandOk,
        errors,
        rejected,
      },
      success_lines: successLines,
      error_lines: errorLines,
      rejected_lines: rejectedLines,
      required_reads_count: requiredReadsCount,
      required_commands_count: requiredCommandsCount,
      sequence_length: sequenceLength,
      result_present,
      git_section_present,
      semantic_acceptance: 'NOT_ASSESSED',
    };
  });

  const counts = {
    current: filteredCurrent.length,
    baseline: filteredBaseline.length,
    new: newJobs.length,
  };

  return {
    schema: 1,
    hashes: {
      current: currentHash,
      baseline: baselineHash,
    },
    counts,
    rows,
  };
}

export { extractAuditFactsA3F };
