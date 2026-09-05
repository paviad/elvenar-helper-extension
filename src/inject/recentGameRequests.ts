import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';

/**
 * The last few batches the game sent to its server, when, and how each was answered. Kept so
 * that when the connection fails ("Stream Error"), what was on the wire at the time can be
 * written down: the game keeps a similar list for its own error log, but without any times.
 * Page-world code, so it never throws into the game's own call.
 */
export interface SentBatch {
  sentAt: number;
  /** `Service.method(data…)`, one per request in the batch. */
  requests: string[];
  answeredAt?: number;
  /** The HTTP status, once answered; 0 when the request failed without one. */
  status?: number;
}

const MAX_BATCHES = 15;
const MAX_DATA_CHARS = 80;

const recent: SentBatch[] = [];

const describeRequest = (request: ElvenarRequestResponseEntry) => {
  let data: string;
  try {
    data = JSON.stringify(request.requestData ?? []);
  } catch {
    data = '?';
  }
  if (data.length > MAX_DATA_CHARS) {
    data = `${data.slice(0, MAX_DATA_CHARS)}…`;
  }
  return `${request.requestClass}.${request.requestMethod}(${data})`;
};

/** Notes a batch as it goes out, and hands back the entry to complete once it is answered. */
export const noteBatchSent = (requests: ElvenarRequestResponseEntry[]): SentBatch | undefined => {
  try {
    const batch: SentBatch = { sentAt: Date.now(), requests: requests.map(describeRequest) };
    recent.push(batch);
    if (recent.length > MAX_BATCHES) {
      recent.splice(0, recent.length - MAX_BATCHES);
    }
    return batch;
  } catch {
    return undefined;
  }
};

export const noteBatchAnswered = (batch: SentBatch | undefined, status: number) => {
  if (batch) {
    batch.answeredAt = Date.now();
    batch.status = status;
  }
};

/** The batches, oldest first, one per line, for a diagnostic. */
export const describeRecentBatches = (now = Date.now()) =>
  recent
    .map((batch) => {
      const sent = new Date(batch.sentAt).toISOString().slice(11, 23);
      const answer =
        batch.answeredAt === undefined
          ? `NO ANSWER after ${Math.round((now - batch.sentAt) / 1000)}s`
          : `HTTP ${batch.status} after ${batch.answeredAt - batch.sentAt}ms`;
      return `${sent}Z ${answer}: ${batch.requests.join(', ')}`;
    })
    .join('\n');
