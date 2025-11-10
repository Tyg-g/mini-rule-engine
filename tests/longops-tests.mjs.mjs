import test from 'ava';

import { initializeRuleEngineWDelay } from './_re-setup.mjs';


test('pass-delayed', async t => {
  const a = [], n = 10;
  a.length = n;
  a.fill(0);

  const promises = a.map(async () => await runSingleTest() );

  const results = await Promise.all(promises);

  const successCount = results.reduce((acc, result) => (result.value) ? acc + 1 : acc, 0);

  if (successCount === n) {
    t.pass();
  } else {
    t.fail(`${n-successCount} instances failed (of ${n}).`);
  }


});


async function runSingleTest() {
  const re = initializeRuleEngineWDelay();

  const ruleset = {
    v0: { not: null },
    v1: { max: 2,  },
    v3: { max: 3, },
    'o.v1': { is: 1 },
    'o.v3': { not: 1 },
    'o.o.v1': { is: 1 },
    pass: { is: true },
    s: { is: 'string' },
    n: { is: null }
  };

  return await re.evaluateWithReason(ruleset);
}
