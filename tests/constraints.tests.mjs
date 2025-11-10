import test from 'ava';

import { initializeRuleEngine } from './_re-setup.mjs';


test.before(t => {
  t.context.re = initializeRuleEngine();
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
