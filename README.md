![package version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Funpkg.com%2Fmini-rule-engine%40latest%2Fpackage.json&query=%24.version&label=npm&color=0F8CD4)
[![license](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Funpkg.com%2Fmini-rule-engine%40latest%2Fpackage.json&query=%24.license&label=license&color=72DB39)](https://opensource.org/licenses?ls=mpl)
![test coverage of the code](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Funpkg.com%2Fmini-rule-engine%40latest%2Fpackage.json&query=%24.c8.lines&label=coverage&suffix=%25&color=5697C7)
![tree-shakeable: yes](https://img.shields.io/badge/tree--shakeable-yes-blue)
![bundle size: 2KiB](https://img.shields.io/bundlephobia/minzip/mini-rule-engine)
<br>
![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Tyg-g_mini-rule-engine&metric=alert_status)
![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Tyg-g_mini-rule-engine&metric=security_rating)
![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Tyg-g_mini-rule-engine&metric=reliability_rating)
![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Tyg-g_mini-rule-engine&metric=sqale_rating)

[![Post a Feature Reuquest](https://img.shields.io/badge/Feature_Requests_Welcome_%E2%9E%9C-D19B00)](https://github.com/Tyg-g/mini-rule-engine/issues/new/choose)


# Mini Rule Engine

A very-lightweight rule engine for DB data sources.

It evaluates simple, human-readable rules defined in standard JavaScript objects - with async DB operations in mind.

> This is a new module that I just created. If you are interesed in using the package or you have an idea for a new feature, contact me on the GitHub page.

Basic Philosophy:
1. 🧩 Keep rule definitions simple and intuitive.
2. ⚡ Make it straightforward to connect to async/DB operations.
3. ✨ Add features without sacrificing simplicity and readibility.

I welcome feature requests and suggestions for use cases I might not have considered. The goal is to keep the rule definitions simple and intuitive while adding powerful features.

## 0. Installation

```sh
$ npm i mini-rule-engine
```

## 1. Usage Basics

Here's a quick example of how to define parameters, create a rule, and evaluate it.

**1. Create a new engine instance, and define the data sources**
```javascript
import RuleEngine from 'mini-rule-engine';

// A parameter is a piece of data that the engine can check.
// The getter function can be async (eg. read from a DB)

const re = new RuleEngine();

re.defineParameterAccessor('user', async () => ({
  age: 25,
  country: 'Mars Colony',
  isPremium: true,
}));

re.defineParameterAccessor('orderCount', async () => 4);
```
**2. Use the engine instance**

```javascript
// The ruleset object can be static,
// or can be read from a DB
// (eg. voucher code, dynamic configuration, etc.)

const myRuleset = {
  'user.age': { min: 18 },
  'user.country': { is: 'Mars Colony' },
  OR: [
    {'user.isPremium': { is: true } },
    {'orderCount': { max: 0 } },
  ]
};


// Evaluate the rule

const result = await re.evaluate(myRuleset);

console.log(`Does this user meet our criteria? ${result}`); // true


// You can also get a reason for failure

const detailedResult = await re.evaluateWithReason({ 'user.age': { min: 30 } });

if (!detailedResult.value) {
  if (detailedResult.parameterName === 'user.age') {
    console.log(`The user's age is too low.`);
  }
}
```

### Operation Mode

```
                                         ⛁     Automatic
                                      ◀        dynamic/DB
                                     /  /      read
                                    /  /
 Evaluate                          /  ▶        of data needed
 ruleset +                 ┌──────────────┐    for evaluation
 params (call)  ────────▶  │              │
                           │  RuleEngine  │
                           │   instance   │
(return value) ◀─────────  │              │
 evaluation                └──────────────┘
 result
```

## 2. Rule Operators

### Basic Operators

- `min`: Minimum value
- `max`: Maximum value
- `is`:  Equal - exact match
- `not`: Not equal
- `under`: Less than
- `over`: Greater than

### Logical `'OR'` Operator

There are two ways to use the logical `'OR'` operator:

*Simple* - applied to a single parameter:

```js
const ruleset = {
  'myStatus': { OR: [
    { is: -1 },
    { min: 1, max: 10 }
  ]},
};
```

*Compound* - applied to multiple differentparameters:
```js
const ruleset = {
  OR: [
    {'user.isPremium': { is: true } }
    {
      'user.age': { min: 18 },
      'orderCount': { max: 0 }
    }
  ]
};
```

Note: The `'OR'` operator in both cases expects an array of objects.

### Logical AND Operator

The logical AND operation is implied when listing different rules in the ruleset. Therefore, no AND operatoror is defined.


## 3. Rule variables (parameters)

### Data Types

The parameter and the compared limit value must have *matching types* to get a true result.

Supported data types: `number`, `string`, `boolean`, `object`, `null`.

### Object Data Type

If a parameter represents an object, this object must be a plain JS object (for security reasons). Only its own properties can be accessed (incl. getter functions).

You can use dot notation to access its properties:

```javascript
const ruleset = {
  'user.age': { min: 18 },
  'user.country': { is: 'Mars Colony' }
};
```


## 4. Getter Functions

The getter functions define *how* to get the correspondingparameter value for an evaluation run.

### Async

The evaluation is always async. If the getter functions defined in defineParameterAccessor() are async, the evaluation will resolve immediately.

For each evaluation:

- **Only those** getter functions are called, that are referenced in the evaluated ruleset.

- Each getter function is called **only once**, regardless of how many times it is referenced in the ruleset. The same value will be reused for each rule.

### Defining a Getter Function

The getter functions are defined as follows, before running any evaluations:

```javascript
re.defineParameterAccessor('parameterName', getterFunction);
```

### Function parameters

```javascript
async function getterFunction(params, meta) {...}
```

- `meta`: An object containing information about the how is the parameter used in the ruleset. This can be useful for example to limit database reads when counting objects.

    - `meta.accessorName` (string): The name of the parameter (defined in `defineParameterAccessor()`) for which the getter was called.<br>*In the case the getter returns an object, and the ruleset evaluates an object parameter, this string contains the part before the first dot.*

    - `meta.constraintValues` (array of any): All the values (operands) the parameter is being compared against in the ruleset.

    - `meta.childrenConstraintValues` (object): *Only if the parameter is accesing an object's children (eg.: `'myObject.childA'`).*<br>The keys list all the descendants that are being accessed in the ruleset. Each key contains an array of the corresponding constraint values (as in `meta.constraintValues`).

- `params`: Is a value or an object, that is passed directly from the `re.evaluate()` or `re.evaluateWithReason()` functions (the `getterParams` parameter):
```javascript
async evaluateWithReason(parameterConstraintsObject, getterParams) {}
```
This can contain for example a userId.

### Example

**Setup**

```javascript
const re = new RuleEngine();

re.defineParameterAccessor('user', userGetter);
re.defineParameterAccessor('orderCount', orderCountGetter);
re.defineParameterAccessor('currentOrder', currentOrderGetter);

const ruleset = {
  'user.age': {
    min: 18,
    max: 65
  },
  'user.eyes.left': { not: 'red' },
  OR: [
    {
      'user.eyes.left': { is: 'black' },
      'user.age': { max: 22 }
    },
    {
      'user.eyes.left': { not: 'black' }
    }
  ],
  'orderCount': {
    min: 1
  }
};

const getterParams = {
  userId: 'rxzUyV7qc5',
  currentOrderId: 'mDyNy3ZmnR7g'
}

const result = await re.evaluateWithReason(ruleset, getterParams);
```

**The getter functions are called with the following parameters**

- **`async function userGetter(params, meta) {...}`:**

```javascript
params = {
  userId: 'rxzUyV7qc5',
  currentOrderId: 'mDyNy3ZmnR7g'
}

meta = {
  accessorName: 'user',
  constraintValues: [],
  childrenConstraintValues: {
    'age': [18, 65, 22],
    'eyes.left': ['red', 'black']
  }
}
```

- **`async function orderCountGetter(params, meta) {...}`:**

```javascript
params //is the same

meta = {
  accessorName: 'orderCount',
  constraintValues: [1]
}
```

- **`async function currentOrderGetter(params, meta) {...}`:**

*is not called.*


## 5. Errors

### Parameter definition errors

- `'REParameterError'`: If the parameter definition encounters a mistake/error in its inputs, it throws.

### Errors During Evaluation

The evaluation only throws, if it cannot be completed with a meaningful result.

- `'RERuleSyntaxError'`: This error is thrown, if the ruleset object contains an error. (Eg. an invalid operator)

- `'RETypeError'`: This error is thrown, if a parameter is evaluated to a data type, that cannot be accepted. (Ie. the getter function's return value is incompatible with the given rule, eg. primitive vs. object.)

Note: Comparing different primitive values (e.g. number and string) will not throw, it will simply return false, per JS's strict equality comparison.

## 6. ![](https://cdn.jsdelivr.net/npm/@tabler/icons/icons/bug.svg) Issues / New Features ![](https://cdn.jsdelivr.net/npm/@tabler/icons/icons/timeline-event-plus.svg)

<img height="16" src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/texture.svg">&nbsp;Go to [**Issue Reporting on mini-rule-engine ➜**](https://github.com/Tyg-g/mini-rule-engine/issues/new/choose)

> *All contributions, ideas and encouragements are welcome!*
