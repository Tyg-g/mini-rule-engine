import test from 'ava';

import { initializeRuleEngine } from './_re-setup.mjs';


test.before(t => {
  t.context.re = initializeRuleEngine();
});


test('error-param-object-key-undefined', async t => {

  const ruleset1 = {
    'o.undef': { is: null },
  };

  const ruleset2 = {
    'o.o.undef': { is: null },
  };

  const p1 = async () => await t.context.re.evaluateWithReason(ruleset1);
  const p2 = async () => await t.context.re.evaluateWithReason(ruleset2);

  const expect = {
    name: 'RERuleSyntaxError',
  }

  await Promise.all([
    t.throwsAsync(p1, expect),
    t.throwsAsync(p2, expect),
  ]);

});


test('error-param-or-not-array', async t => {

  const testSpecimens = ['x', 33, new Date(), ()=>55, null, Object.create(new String('')), new Set([1])];

  const rulesets = testSpecimens.map(
    (specimen) => ({ 'OR': specimen })
  );

  const promises = rulesets.map(
    (ruleset) => [ruleset, async () => t.context.re.evaluateWithReason(ruleset)]
  )

  const expect = {
    name: 'RERuleSyntaxError',
  }

  const pTests = promises.map(
    ([ruleset, fn]) => t.throwsAsync(fn, expect, `Did not throw for '${JSON.stringify(ruleset)}'`)
  );

  await Promise.all(pTests);

});


test('pass-param-or-fail', async t => {

  const ruleset = {
    'OR': [
      { v1: { is: 0 } },
      { v2: { is: 0 } },
      { v3: { is: 0 } },
    ]
  };

  const resultObj = await t.context.re.evaluateWithReason(ruleset);

  t.is(resultObj.value, false, 'EvalResult.value should be false');
  t.is(typeof resultObj.parameterName, 'string', 'EvalResult.parameterName should be a string');
});


test('pass-param-list-not-object', async t => {
  const testSpecimens = [[], 'x', 33, new Date(), ()=>55, null, new Map([['a',{}]])];

  const rulesets = testSpecimens.map(
    (specimen) => ({ 'OR': [specimen] })
  );

  const promises = rulesets.map(
    (ruleset) => [ruleset, async () => t.context.re.evaluateWithReason(ruleset)]
  )

  const expect = {
    name: 'RERuleSyntaxError',
  }

  const pTests = promises.map(
    ([ruleset, fn]) => t.throwsAsync(fn, expect, `Did not throw for '${JSON.stringify(ruleset)}'`)
  );

  await Promise.all(pTests);
});
