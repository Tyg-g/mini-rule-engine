import { ParameterListObject, illegalAccessorNames } from './parameter-manager.mjs';
import { ParameterDefinitions } from './utils.mjs';
import { REParameterError } from './errors.mjs';


export { EvalResult } from './utils.mjs';


export class RuleEngine {
  #parameterDefinitions;
  #parameterIgnoreList;

  constructor() {
    this.#parameterDefinitions = new ParameterDefinitions();
    this.#parameterIgnoreList = new Set();
    this.defineParameter('pass', ()=>true);
  }

  defineParameter(parameterName, getterFunction) {
    if (Array.isArray(parameterName)) {
      parameterName.forEach( name => this.defineParameter(name, getterFunction) );
    } else {
        this.#parameterDefinitions.defineParameter(parameterName, getterFunction);
    }
  }

  ignoreParameter(parameterName) {
    if (illegalAccessorNames.has(parameterName))
      throw new REParameterError(`defineParameter(): Illegal parameter name: '${parameterName}'`);
    else
      this.#parameterIgnoreList.add(parameterName);
  }

  async evaluateWithReason(parameterConstraintsObject, getterParams = {}) {
    const parameters = new ParameterListObject(parameterConstraintsObject, this.#parameterIgnoreList);

    const parameterDataCollector = parameters.collectParameterData();

    const parameterValues = await this.#parameterDefinitions.getCurrentValues(parameterDataCollector, getterParams);

    return parameters.evaluate(parameterValues);
  }

  async evaluate(parameterConstraintsObject, getterParams) {
    return this.evaluateWithReason(parameterConstraintsObject, getterParams)
           .then(evalResult => evalResult.value);
  }
}

export default RuleEngine;
