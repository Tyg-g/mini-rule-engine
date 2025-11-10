import test from 'ava';

import { EvalResult } from '../src/utils.mjs';


test('utils-evalresult', t => {

  const tr =  new EvalResult(true, 'PARAM');
  const fls = new EvalResult(false, 'PARAM');

  t.is(tr.value, true, 'EvalResult value not passed');
  t.is(fls.value, false, 'EvalResult value not passed');

  const tStr = tr + '';
  const fStr = fls + '';

  t.regex(tStr, /true/, 'Should contain true');
  t.notRegex(tStr, /PARAM/, 'Should not contain parameter name');
  t.regex(fStr, /false/, 'Should contain false');
  t.regex(fStr, /PARAM/, 'Should contain parameter name');
});
