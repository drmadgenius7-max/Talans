/** Job names and payloads shared by the enqueuer and the worker. */

export const QUEUE_NAME = 'athar-media';

export const JobName = {
  ProcessDocumentation: 'process-documentation',
  RunVerification: 'run-verification',
} as const;

export type JobName = (typeof JobName)[keyof typeof JobName];

export type JobPayloads = {
  [JobName.ProcessDocumentation]: { documentationId: string };
  [JobName.RunVerification]: { checkId: string };
};

export type AnyJob = {
  [K in JobName]: { name: K; data: JobPayloads[K] };
}[JobName];
