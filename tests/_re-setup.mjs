import { RuleEngine } from '../src/index.mjs';
import delay from 'delay';


const defaultData = {
  v0: 0,
  v1: 1,
  v2: 2,
  v3: 3,
  o: {
    v1: 1,
    v2: 2,
    v3: 3,
    o: { v1: 1 },
    fn: () => ''
  },
  s: 'string',
  n: null,
};


async function dataGetter (_,meta) {
  return defaultData[meta.accessorName];
}

export function initializeRuleEngine() {
 const re = new RuleEngine();

 const accessorNames = Object.keys(defaultData);
 re.defineParameterAccessor(accessorNames, dataGetter);
 re.defineParameterAccessor('g', (p) => p?.g);

 return re;
}


async function delayedDataGetter (_,meta) {
  const d = 200 * (1 + Math.random());
  return delay(d,{
    value: defaultData[meta.accessorName]
  });
}

export function initializeRuleEngineWDelay() {
 const re = new RuleEngine();

 const accessorNames = Object.keys(defaultData);
  re.defineParameterAccessor(accessorNames, delayedDataGetter);

 return re;
}
