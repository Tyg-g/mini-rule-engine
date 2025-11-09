import test from 'ava';

import { initializeRuleEngine } from './_re-setup.mjs';


test.before(t => {
  t.context.re = initializeRuleEngine();
});


test('all-conditions-pass', async t => {

  const ruleset = {
    v1: {
      max: 2,
      min: 1,
      under: 2,
      over: 0,
      is: 1,
      not: 100
    },
    v3: {
      max: 4,
      min: 3,
    },
    'OR': [
      { v1: { min: 2 } },
      { v3: { min: 2 } },
    ],
    v2: {
      'OR': [
        { is: 10 },
        { under: 8 }
      ]
    },
    'o.v1' : { is: 1 },
    'o.v3' : { not: 1 },
    'o.o.v1' : { is: 1 }
  };

  const resultObj = await t.context.re.evaluateWithReason(ruleset);

  if (resultObj.value !== true)
    t.fail(`Expected EvalResult.value to be 'true', but got '${JSON.stringify(resultObj.value)}'`);

  if (resultObj.parameterName)
    t.fail(`EvalResult.parameterName should be nullish when the evaluaton passed, instead got: '${JSON.stringify(resultObj.value)}'`);

  t.pass();
});


test('getter-custom-parameters', async t => {

  const ruleset = {
    g: { is: 32000 }
  };

  const resultObj = await t.context.re.evaluateWithReason(ruleset, { g: 32000});

  if (resultObj.value !== true)
    t.fail(`Custom getter parameter NOT passed to the getter function`);

  t.pass();
});
