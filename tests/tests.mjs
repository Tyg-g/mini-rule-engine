import test from 'ava';

import { initializeRuleEngine } from './_re-setup.mjs';


test.before(t => {
  t.context.re = initializeRuleEngine();
});


test('pass-all-conditions', async t => {

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
    return t.fail(`Expected EvalResult.value to be 'true', but got '${JSON.stringify(resultObj.value)}'`);

  if (resultObj.parameterName)
    return t.fail(`EvalResult.parameterName should be nullish when the evaluaton passed, instead got: '${JSON.stringify(resultObj.value)}'`);

  t.pass();
});


test('pass-getter-custom-data', async t => {

  const ruleset = {
    g: { is: 32000 }
  };

  const resultObj = await t.context.re.evaluateWithReason(ruleset, { g: 32000});

  if (resultObj.value !== true)
    return t.fail(`Custom getter parameter NOT passed to the getter function`);

  t.pass();
});


test('error-constraint-list-not-object', async t => {

  const testSpecimens = [[1], 'x', 33, new Date(), ()=>55, null, undefined, Object.create(new String(''))];

  const rulesets = testSpecimens.map(
    (specimen) => ({ v1: specimen })
  );

  const promises = rulesets.map(
    async (ruleset) => [ruleset, await t.context.re.evaluateWithReason(ruleset)]
  )

  const resultsOfP = await Promise.allSettled(promises);

  resultsOfP.forEach( (resultOfP) => {

    if (resultOfP.value) // successful Promise
      return t.fail(`Didn't throw for ruleset ${JSON.stringify(resultOfP.value[0])}`);

    t.is(resultOfP.reason.name, 'RERuleSyntaxError');
  });

  t.pass();
});


test('error-constraint-primitive-invalid-operator', async t => {

  const ruleset = {
    v1: { foobars: 32000 }
  };

  let res;

  try {
    res = await t.context.re.evaluateWithReason(ruleset);
  }
  catch(err) {
    return t.is(err.name, 'RERuleSyntaxError');
  }

  t.fail(`Did not throw with result: ${JSON.stringify(res)}`);
});


test('error-constraint-primitive-invalid-limit', async t => {

  const testSpecimens = [[1], new Date(), {}, () => 55, Object.create(new String(''))];

  const rulesets = testSpecimens.map(
    (specimen) => ({ v1: { max: specimen } })
  );

  const promises = rulesets.map(
    async (ruleset) => [ruleset, await t.context.re.evaluateWithReason(ruleset)]
  )

  const resultsOfP = await Promise.allSettled(promises);

  resultsOfP.forEach( (resultOfP) => {

    if (resultOfP.value) // successful Promise
      return t.fail(`Didn't throw for ruleset ${JSON.stringify(resultOfP.value[0])}`);

    t.is(resultOfP.reason.name, 'RERuleSyntaxError');
  });

  t.pass();
});


test('error-constraint-primitive-invalid-value', async t => {

  const testSpecimens = [[1], new Date(), {}, () => 55, Object.create(new String(''))];

  const ruleset = {
    g: { max: 5 }
  };

  const paramData = testSpecimens.map(
    (specimen) => ({ g: specimen })
  );

  const promises = paramData.map(
    async (param) => [param, await t.context.re.evaluateWithReason(ruleset, param)]
  )

  const resultsOfP = await Promise.allSettled(promises);

  resultsOfP.forEach( (resultOfP) => {

    if (resultOfP.value) // successful Promise
      return t.fail(`Didn't throw for parameter data ${JSON.stringify(resultOfP.value[0])}`);

    t.is(resultOfP.reason.name, 'RETypeError');
  });

  t.pass();
});


test('error-constraint-or-not-array', async t => {

  const testSpecimens = [1, null, 'x', new Date(), {}, () => 55, Object.create(new String(''))];

  const rulesets = testSpecimens.map(
    (specimen) => ({ v1: { OR: specimen } })
  );

  const promises = rulesets.map(
    async (ruleset) => [ruleset, await t.context.re.evaluateWithReason(ruleset)]
  )

  const resultsOfP = await Promise.allSettled(promises);

  resultsOfP.forEach( (resultOfP) => {

    if (resultOfP.value) // successful Promise
      return t.fail(`Didn't throw for ruleset ${JSON.stringify(resultOfP.value[0])}`);

    t.is(resultOfP.reason.name, 'RERuleSyntaxError');
  });
});


test('error-defineParameterAccessor', async t => {
  // defineParameterAccessor(accessorName, getterFunction)
  const f = (p) => 2*p;

  const specimens = [
    ['frosty', null ],
    ['frosty', [0] ],
    ['frosty', 'string'],
    ['OR', f],
    [{}, f],
    [11, f],
    [null, f],
  ];

  for (const specimen of specimens) {
    try {
      t.context.re.defineParameterAccessor(...specimen);
    }
    catch(err) {
      return t.is(err.name, 'REParameterError');
    }
    return t.fail(`Did not throw with result: ${JSON.stringify(specimen[0])}, ${specimen[1]} ${typeof specimen[1]}`);
  }

  t.pass();
});


test('error-ignoreParameter', async t => {

  try {
    t.context.re.ignoreParameter('OR');
  }
  catch(err) {
    return t.is(err.name, 'REParameterError');
  }
  return t.fail(`Did not throw`);
});


test('pass-ignore-parameters', async t => {

  const ruleset = {
    ignored1: { is: 99 },
    v1: { max: 2 },
    'ig.nor.ed': { is: 99 },
    v3: { is: 3 }
  };

  t.context.re.ignoreParameter('ignored1');
  t.context.re.ignoreParameter('ig.nor.ed');

  let res;

  try {
    res = await t.context.re.evaluateWithReason(ruleset);
  }
  catch(err) {
    return t.fail(`Threw '${JSON.stringify(err.name)}': ${JSON.stringify(err.message)}`);
  }

  t.is(res.value, true);
});


test('pass-evaluate-wo-reason', async t => {

  const rulesetPass = {
    v1: { max: 2 },
    v3: { is: 3 }
  };

  const rulesetFail = {
    v1: { min: 2 },
    v3: { under: 3 }
  };

  const res = await Promise.all([
    t.context.re.evaluateWithReason(rulesetPass).then((r)=>r.value),
    t.context.re.evaluate(rulesetPass),
    t.context.re.evaluateWithReason(rulesetFail).then((r)=>r.value),
    t.context.re.evaluate(rulesetFail)
  ]);

  const expected = [true, true, false, false];

  const conv = (arr) => arr.map((item,i) => `[${i}] ${item}`).join(', ');

  t.is(conv(res), conv(expected));
});
