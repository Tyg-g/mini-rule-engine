const msgPrefix = 'MiniRuleEngine: ';


export class RETypeError extends Error {
    constructor(message, options) {
        super(msgPrefix+message);
        Object.assign(this, options);
        this.name = 'RETypeError';
    }
}


export class RERuleSyntaxError extends Error {
    constructor(message, options) {
        super(msgPrefix+message);
        Object.assign(this, options);
        this.name = 'RERuleSyntaxError';
    }
}


export class REParameterError extends Error {
    constructor(message, options) {
        super(msgPrefix+message);
        Object.assign(this, options);
        this.name = 'REParameterError';
    }
}
