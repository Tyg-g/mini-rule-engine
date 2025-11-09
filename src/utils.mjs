import MultiMap from '@github/multimap';

import { illegalAccessorNames } from './parameter-manager.mjs';
import { REParameterError, RERuleSyntaxError } from './errors.mjs';


export class EvalResult {
  constructor(result, parameterName) {
    this.value = result;
    this.parameterName = parameterName;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === 'string')
      return this.toString();
    else
      return this.value;
  }

  toString() {
    return this.value ?
      'true' :
      `false (reason: ${this.parameterName})`;
  }
}


export class ParameterDataCollector {
  constructor() {
    this.parameterConstraints = new MultiMap();
    this.accessorChildren = new MultiMap();
  }

  addData({
    parameterName,
    parameterAccessor,
    constraintValueSet,
    accessedChild,
  }) {

    const oldSet = this.parameterConstraints.get(parameterName);
    const newSet = constraintValueSet.union(oldSet);
    this.parameterConstraints.map.set(parameterName, newSet);

    this.accessorChildren.set(parameterAccessor, accessedChild);
    // This will insert an empty string for parameters without a '.' (not object),
    // so a direct access will still figure in this list
  }

  getAccessorDataIterator() {
    const iterator = this.accessorChildren.entries().map(([accessorName, childrenSet]) => {
      const constraintValues = Array.from(this.parameterConstraints.get(accessorName));
      const childrenPathIterator = skipEmpty(childrenSet.values());
      const childrenConstraintValues = Object.fromEntries(childrenPathIterator.map(
        (childPath) => [
          childPath,
          Array.from(this.parameterConstraints.get(`${accessorName}.${childPath}`))
        ]
      ));
      return {
        accessorName,
        constraintValues,
        childrenConstraintValues
      }
    });
    const items = Array.from(iterator);
    return items.values();
  }

  getConstraintsArrayfor(parameterName) {
    return Array.from(this.parameterConstraints.get(parameterName));
  }
}


function* skipEmpty(iterator) {
  for (const value of iterator) {
    if (value?.length===0) continue; // skip this
    yield value;
  }
}


export class ParameterDefinitions {
  constructor(){
    this.parameterDefinitions = new Map();
  }

  defineParameterAccessor(accessorName, getterFunction) {
    if (typeof accessorName !== 'string' || accessorName.length==0) {
      throw new REParameterError('defineParameter() expects a string for parameterName');
    }

    if (illegalAccessorNames.has(accessorName)) {
      throw new REParameterError(`defineParameter() parameter name '${accessorName}' is reserved`);
    }

    if (typeof getterFunction !== 'function') {
      throw new REParameterError('defineParameter() expects a function for getterFunction');
    }

    this.parameterDefinitions.set(accessorName, { getterFunction });
  }

  async #getValueByName(accessorName, getterParameter, meta) {
    const getter = this.parameterDefinitions.get(accessorName)?.getterFunction;

    if (!getter) {
      const parameters = Object.keys(meta.childrenConstraintValues);
      const parametersStr = parameters.map(key=>`'${key}'`).join(', ');
      const parametersText = (parametersStr.length === 0) ? '' :
        `, accessed by: ${parametersStr}`;
      if (parameters.length === 0) {
        parameters.push(`'${accessorName}'`);
      }
      throw new RERuleSyntaxError(
        `missing accessor definition for '${accessorName}'${parametersText}`,
        {accessorName, parameters});
    }

    return await getter(getterParameter, meta);
  }

  async getCurrentValues(parameterDataCollector, getterParameter = {}) {
    const parameterMetaIterator = parameterDataCollector.getAccessorDataIterator();

    const parameterValuePromiseIterator = parameterMetaIterator.map(
      async (meta) => [
          meta.accessorName,
          await this.#getValueByName(meta.accessorName, getterParameter, meta)
      ]
    );

    const parameterValues = new Map( await Promise.all([...parameterValuePromiseIterator]) );

    return parameterValues;
  }
}


export function safeKeyAccess(obj, key) {
  if (['__proto__', 'constructor', 'prototype'].includes(key))
    return undefined;

  if (!Object.hasOwn(obj, key))
    return undefined;

  return obj?.[key];
}
