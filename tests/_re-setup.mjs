import { RuleEngine } from '../src/index.mjs';


const defaultData = {
  v1: 1,
  v2: 2,
  v3: 3,
  o: {
    v1: 1,
    v2: 2,
    v3: 3,
    o: { v1: 1 }
  },
  s: 'string',
};


function dataGetter (_,meta) {
  return defaultData[meta.accessorName];
}


export function initializeRuleEngine() {
 const re = new RuleEngine();

 const accessorNames = Object.keys(defaultData);
 re.defineParameterAccessor(accessorNames, dataGetter);
 re.defineParameterAccessor('g', (p) => p?.g);

 return re;
}
