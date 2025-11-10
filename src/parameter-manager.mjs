import { ConstraintList } from './constraint-manager.mjs';
import { EvalResult, ParameterDataCollector, safeKeyAccess, isPlainObject } from './utils.mjs';
import { RERuleSyntaxError } from './errors.mjs';


export const illegalAccessorNames = new Set(['or', 'and', 'OR', 'AND']);


export class ParameterListObject {
  constructor(obj, parameterIgnoreList) {
    if (!isPlainObject(obj)) {
      throw new RERuleSyntaxError(`An object with parameter definitions is expected. Instead got '${typeof obj}':\n${JSON.stringify(obj)}`);
    }
    const list = Object.entries(obj);

    this.parameters = list
      .filter(
        ([parameterName]) => !parameterIgnoreList.has(parameterName)
      )
      .map(
        ([parameterName, constraintsObj]) =>
          new ParameterObject(parameterName, constraintsObj, parameterIgnoreList)
      );
  }

  evaluate(parameterValues) {
    for (const parameterObject of this.parameters) {
      let evalResult = parameterObject.evaluate(parameterValues);
      if (evalResult.value === false)
        return evalResult;
    }

    return new EvalResult(true);
  }

  collectParameterData(dataCollector) {
    if (!dataCollector)
      dataCollector = new ParameterDataCollector();

    this.parameters.forEach(
      parameterObject => parameterObject.collectParameterData(dataCollector)
    );

    return dataCollector;
  }
}


class ParameterObject {
  constructor(parameterName, constraintObj, parameterIgnoreList) {
    if (parameterName === 'OR')
      return new ParameterObjectOr(parameterName, constraintObj, parameterIgnoreList);
    else
      return new ParameterObjectSingle(parameterName, constraintObj, parameterIgnoreList);
  }
}


class ParameterObjectSingle {
  constructor(parameterName, constraintObj, _) {
    if (typeof constraintObj !== 'object' || constraintObj === null) {
      throw new RERuleSyntaxError(`Parameter '${parameterName}' expects an object with constraint definitions`);
    }

    const deconstructed = parameterName.split('.');

    this.parameterAccessor = deconstructed.shift(); // The first element is the name
    this.objectPath = deconstructed;
    this.parameterName = parameterName;
    this.constraintList = new ConstraintList(constraintObj);
  }

  evaluate(parameterValues) {
    let parameterValue = parameterValues.get(this.parameterAccessor);

    let consumedKey = '';

    for (const key of this.objectPath) {
      consumedKey += '.' + key;
      parameterValue = safeKeyAccess(parameterValue, key);

      if (parameterValue === undefined) {
        const errPath = this.parameterAccessor + consumedKey;
        throw new RERuleSyntaxError(`Parameter '${errPath}' doesn't exist in '${this.parameterAccessor}'`);
      }
    }

    const boolResult = this.constraintList.evaluate(parameterValue);
    const parameterNameOnlyIfFalse = boolResult ? undefined : this.parameterName;
    return new EvalResult(boolResult, parameterNameOnlyIfFalse);
  }

  collectParameterData(dataCollector) {
    const constraintValueSet = this.constraintList.getConstraintValueSet();

    dataCollector.addData({
      parameterName: this.parameterName,
      parameterAccessor: this.parameterAccessor,
      constraintValueSet,
      accessedChild: this.objectPath.join('.'),
    });
  }
}


class ParameterObjectOr {
  constructor(_, parametersObjects, parameterIgnoreList) {
    if (!Array.isArray(parametersObjects)) {
      throw new RERuleSyntaxError(`Operator 'OR' expects an Array, but got '${typeof parametersObjects}':\n${JSON.stringify(parametersObjects)}`);
    }

    this.parameterLists = parametersObjects.map(
      pO => new ParameterListObject(pO, parameterIgnoreList)
    );
  }

  evaluate(parameterValues) {
    let falseEvalResult;

    for (const parameterList of this.parameterLists) {
      const evalResult = parameterList.evaluate(parameterValues);
      if (evalResult.value === true) {
        return evalResult;
      }
      else {
        falseEvalResult = evalResult;
      }
    }

    return falseEvalResult;
  }

  collectParameterData(dataCollector) {
    this.parameterLists.forEach(
      parameterList => parameterList.collectParameterData(dataCollector)
    );
  }
}
