import { extractCultureHelpState } from './extractCultureHelpState';

const effect = (actionId: string, ownerId: string) => ({ actionId, ownerId });

describe('extractCultureHelpState', () => {
  it('lists the buildings helped for culture and the ones enchanted', () => {
    const effects = [
      effect('time_limited_help', '1'),
      effect('time_limited_help', '3'),
      effect('neighbourly_help_boost_spell', '1'),
      // Help on the builders' hut and main hall is not culture help.
      effect('limited_help', '7'),
      effect('unlimited_help', '8'),
    ];
    expect(extractCultureHelpState(effects)).toEqual({ helped: ['1', '3'], enchanted: ['1'] });
  });

  it('names a building once however many effects it carries', () => {
    const effects = [effect('time_limited_help', '1'), effect('time_limited_help', '1')];
    expect(extractCultureHelpState(effects).helped).toEqual(['1']);
  });
});
