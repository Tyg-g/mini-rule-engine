import test from 'ava';

import { initializeRuleEngine } from './_re-setup.mjs';


test.before(t => {
  t.context.re = initializeRuleEngine();
});


test('pass-basic-conditions', async t => {

  const ruleset = {
    v0: {
      not: null,
      min: -.1e-10,
    },
    v1: {
      max: 2,
      min: 1,
      under: 2,
      over: -3,
      is: 1,
      not: 100
    },
    v3: {
      max: 3.01,
      min: 2.99,
      not: true
    },
    v2: {
      'OR': [
        { is: 10 },
        { over: 1.9999 }
      ]
    },
    'o.v1': { is: 1 },
    'o.v3': { not: 1 },
    'o.o.v1': { is: 1 },
    pass: { is: true },
    s: {
      is: 'string',
      not: 'sterling',
      max: 'tring',
      min: 'ring'
    },
    's.length': { is: 6 },
    n: {
      is: null,
      not: false
    }
  };

  const resultObj = await t.context.re.evaluateWithReason(ruleset);

  t.is(resultObj.value, true, `EvalResult.value\nEvaluation failed here: '${resultObj.parameterName}'`);
  t.is(resultObj.parameterName, undefined, 'EvalResult.parameterName should be undefined when succesful');
});


test('pass-failing-evaluation', async t => {
  // defineParameterAccessor(accessorName, getterFunction)
  const rulesets = [
    { v1: { under: 1 } },
    { v1: { over: 1 } },
    { v1: { max: 0 } },
    { v1: { min: 2 } },
    { v1: { 'OR': [{ is: 2 }, { not: 1 }]}},
    { 'OR': [
      { v1: { under: 1 } },
      { v1: { over: 1 } },
    ]},
  ];

  const promises = rulesets.map(async (ruleset) => [ruleset, await t.context.re.evaluateWithReason(ruleset)]);

  const resultTuples = await Promise.all(promises);

  const expectedResult = {
    value: false,
    parameterName: 'v1'
  };

  resultTuples.forEach(([ruleset, result]) => {
    t.like(result, expectedResult, `Did not fail for ruleset: ${JSON.stringify(ruleset)}`);
  });
});


test('pass-deep-nesting', async t => {

  const ruleset = {
    'OR': [ // deep nesting
      { v1: { min: 2 } },    // false
      { 'OR': [
        { v1: { max: 0 } },  // false
        { 'OR': [
          { v2: { max: 0 } },// false
          { v3: { is: 3 } },  // true
          { v2: { is: 0 } }, // false
        ]},
        { v1: { is: 0 } }    // false
      ]},
      { v1: { min: 4 } },    // false
    ],
    pass: {
      'OR': [  //deep nesting
        { is: false },       // false
        { 'OR': [
          { is: false },     // false
          { 'OR': [
            { is: false },   // false
            { is: true },     // true
            { is: false },   // false
          ]},
          { is: false },     // false
        ]},
        { is: false },       // false
      ]
    },
  };

  const resultObj = await t.context.re.evaluateWithReason(ruleset);

  t.is(resultObj.value, true, 'EvalResult.value should be true');
  t.is(resultObj.parameterName, undefined, 'EvalResult.parameterName should be undefined');
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


test('error-getter-not-defined', async t => {

  const ruleset1 = {
    xx: { is: 32000 }
  };

  const ruleset2 = {
    'yy.v1': { is: 32000 }
  };

  const f1 = async () => await t.context.re.evaluateWithReason(ruleset1);
  const f2 = async () => await t.context.re.evaluateWithReason(ruleset2);

  const expect = {
    name: 'RERuleSyntaxError'
  };

  await Promise.all([
    t.throwsAsync(f1, expect),
    t.throwsAsync(f2, expect),
  ]);
});


test('error-defineParameterAccessor', async t => {
  // defineParameterAccessor(accessorName, getterFunction)
  const f = (p) => 2*p;

  const specimens = [
    [{}, f],
    [11, f],
    [null, f],
    ['frosty', null ],
    ['frosty', [0] ],
    ['frosty', 'string'],
    ['OR', f]
  ];

  const tuples = specimens.map((specimen) => [specimen, () => t.context.re.defineParameterAccessor(...specimen)]);

  const expect = {
    name: 'REParameterError'
  };

  const text = (sp) => `Did not throw for: [${JSON.stringify(sp[0])}, ${typeof sp[1]}:${JSON.stringify(sp[1])}]`;

  const tests = tuples.map(
    ([specimen, fn]) => t.throws(fn, expect, text(specimen))
  );

  await Promise.all(tests);
});


test('error-ignore-parameter-invalid', async t => {

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


test('error-forbidden-object-keys', async t => {

  const testSpecimens = ['__proto__', 'constructor', 'prototype'];

  const rulesets = testSpecimens.map(
    (specimen) => {
      const ruleset = {};
      const key = `o.${specimen}`
      ruleset[key] = { is: 0 }
      return ruleset;
    }
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



test('pass-secondary-object-type', async t => {

  const ruleset = Object.create({
    v0: Object.create({
      not: null,
      min: -.1e-10,
    })
  });

  const resultObj = await t.context.re.evaluateWithReason(ruleset);

  t.is(resultObj.value, true, `Should pass`);
});


test('error-object-function-access', async t => {

  const ruleset = {
    'o.fn': { not: null }
  };

  const f = async () => await t.context.re.evaluateWithReason(ruleset);

  const expect = {
    name: 'RERuleSyntaxError'
  }

  await t.throwsAsync(f, expect);
});
