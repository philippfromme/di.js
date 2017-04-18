define([], function() {
  "use strict";
  var __moduleName = "util";
  function isUpperCase(char) {
    return char.toUpperCase() === char;
  }
  function isFunction(value) {
    return typeof value === 'function';
  }
  function isObject(value) {
    return typeof value === 'object';
  }
  function toString(token) {
    if (typeof token === 'string') {
      return token;
    }
    if (token === undefined || token === null) {
      return '' + token;
    }
    if (token.name) {
      return token.name;
    }
    return token.toString();
  }
  var ownKeys = (this.Reflect && Reflect.ownKeys ? Reflect.ownKeys : function ownKeys(O) {
    var keys = Object.getOwnPropertyNames(O);
    if (Object.getOwnPropertySymbols)
      return keys.concat(Object.getOwnPropertySymbols(O));
    return keys;
  });
  ;
  return {
    get isUpperCase() {
      return isUpperCase;
    },
    get isFunction() {
      return isFunction;
    },
    get isObject() {
      return isObject;
    },
    get toString() {
      return toString;
    },
    get ownKeys() {
      return ownKeys;
    },
    __esModule: true
  };
}.bind(typeof global !== 'undefined' ? global : this));
