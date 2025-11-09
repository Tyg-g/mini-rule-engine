import { RETypeError, RERuleSyntaxError } from './errors.mjs';


const primitiveOperators = new Map( Object.entries( {
  'max':   (v, c) => v <= c,
  'min':   (v, c) => v >= c,
  'is':    (v, c) => v === c,
  'not':   (v, c) => v !== c,
  'under': (v, c) => v < c,
  'over':  (v, c) => v > c,
}));

const operatorDispatcher = new Map( Object.entries( {
  'OR':    ()=>ConstraintOr,
  //TODO: basic array operators
}));


export class ConstraintList {
  constructor(constraintsObj) {
    if (typeof constraintsObj !== 'object' || constraintsObj == null) {
      throw new RERuleSyntaxError(`Constraints object expected, instead got '${typeof constraintsObj}':\n${JSON.stringify(constraintsObj,null,2)}`);
    }

    this.constraints = Object.entries(constraintsObj).map(
      ([operator, limitValue]) => new Constraint(operator, limitValue)
    );
  }

  evaluate(value) {
    return this.constraints.every(cO => cO.evaluate(value));
  }

  getConstraintValueSet() {

    const set = this.constraints.reduce(
      (prevSet, cO) => prevSet.union(cO.getConstraintValueSet()),
      new Set()
    );

    return set;
  }
}


export class Constraint {
  constructor(operator, limitValue) {
    if (new.target === Constraint) {
      if (operatorDispatcher.has(operator)) {
        const Dispatched = operatorDispatcher.get(operator)();
        return new Dispatched(operator, limitValue);
      }
      else
        return new ConstraintPrimitive(operator, limitValue);
    }

    this.operator = operator;
    this.limitValue = limitValue;

  }
}


class ConstraintPrimitive extends Constraint {
  constructor(operator, limitValue) {
    super(operator, limitValue)
    this.operatorFn = primitiveOperators.get(operator);

    if (!this.operatorFn)
      throw new RERuleSyntaxError(`Invalid constraint operator: ${operator} (${JSON.stringify(operator)})`);

    if (!this.#isPrimitive(limitValue))
      throw new RERuleSyntaxError(`Operator '${operator}' expects a primitive, but got '${typeof limitValue}':\n${JSON.stringify(limitValue)}`);
  }

  #isPrimitive(value) {
    return (typeof value !== 'object' && typeof value !== 'function') || value === null;
  }

  evaluate(value) {
    if (!this.#isPrimitive(value))
      throw new RETypeError(`Operator '${this.operator}' expects a primitive input value, but got '${typeof value}':\n${JSON.stringify(value)}`);

    return this.operatorFn(value, this.limitValue);
  }

  getConstraintValueSet() {
    return new Set([this.limitValue]);
  }
}


class ConstraintOr extends Constraint {
  constructor(operator, constraintsObjArray) {
    super(operator, null);

    if (!Array.isArray(constraintsObjArray))
      throw new RERuleSyntaxError(`Operator '${operator}' expects an Array, but got '${typeof constraintsObjArray}':\n${JSON.stringify(constraintsObjArray)}`);

    this.constraintLists = constraintsObjArray.map(
      constraintObj => new ConstraintList(constraintObj)
    );
  }

  evaluate(value) {
    return this.constraintLists.some(constraintList => constraintList.evaluate(value));
  }

  getConstraintValueSet() {
    const set = this.constraintLists.reduce(
      (prevSet, constraintList) => prevSet.union(constraintList.getConstraintValueSet()),
      new Set()
    );
    return set;
  }
}
