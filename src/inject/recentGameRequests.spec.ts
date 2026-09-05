import { ElvenarRequestResponseEntry } from '../model/elvenarRequestResponseEntry';
import { describeRecentBatches, noteBatchAnswered, noteBatchSent } from './recentGameRequests';

const request = (requestClass: string, requestMethod: string, requestData: unknown) =>
  ({ requestClass, requestMethod, requestData }) as ElvenarRequestResponseEntry;

describe('recentGameRequests', () => {
  it('lists what was sent, and which batch never got an answer', () => {
    const answered = noteBatchSent([request('CityProductionService', 'pickupProduction', [[12]])]);
    noteBatchAnswered(answered, 200);
    const sentAt = Date.now();
    noteBatchSent([request('RankingService', 'getRankingOverview', [2309878])]);

    const report = describeRecentBatches(sentAt + 120_000).split('\n');

    expect(report[report.length - 2]).toMatch(
      /HTTP 200 after \d+ms: CityProductionService\.pickupProduction\(\[\[12\]\]\)$/,
    );
    expect(report[report.length - 1]).toMatch(
      /NO ANSWER after 12\ds: RankingService\.getRankingOverview\(\[2309878\]\)$/,
    );
  });

  it('keeps only the latest fifteen batches and cuts long data short', () => {
    for (let i = 0; i < 20; i++) {
      noteBatchSent([request('S', 'm', ['x'.repeat(200)])]);
    }
    const report = describeRecentBatches().split('\n');
    expect(report).toHaveLength(15);
    expect(report[0]).toContain('…');
  });
});
