"use strict";
var __moduleName = "injector";
var $__4 = $traceurRuntime.assertObject(require('./annotations')),
    annotate = $__4.annotate,
    readAnnotations = $__4.readAnnotations,
    hasAnnotation = $__4.hasAnnotation,
    ProvideAnnotation = $__4.Provide,
    TransientScopeAnnotation = $__4.TransientScope;
var $__4 = $traceurRuntime.assertObject(require('./util')),
    isFunction = $__4.isFunction,
    toString = $__4.toString;
var profileInjector = $traceurRuntime.assertObject(require('./profiler')).profileInjector;
var createProviderFromFnOrClass = $traceurRuntime.assertObject(require('./providers')).createProviderFromFnOrClass;
function constructResolvingMessage(resolving, token) {
  if (arguments.length > 1) {
    resolving.push(token);
  }
  if (resolving.length > 1) {
    return (" (" + resolving.map(toString).join(' -> ') + ")");
  }
  return '';
}
var Injector = function Injector() {
  var modules = arguments[0] !== (void 0) ? arguments[0] : [];
  var parentInjector = arguments[1] !== (void 0) ? arguments[1] : null;
  var providers = arguments[2] !== (void 0) ? arguments[2] : new Map();
  var scopes = arguments[3] !== (void 0) ? arguments[3] : [];
  this._cache = new Map();
  this._providers = providers;
  this._parent = parentInjector;
  this._scopes = scopes;
  this._loadModules(modules);
  profileInjector(this, $Injector);
};
var $Injector = Injector;
($traceurRuntime.createClass)(Injector, {
  _collectProvidersWithAnnotation: function(annotationClass, collectedProviders) {
    this._providers.forEach((function(provider, token) {
      if (!collectedProviders.has(token) && hasAnnotation(provider.provider, annotationClass)) {
        collectedProviders.set(token, provider);
      }
    }));
    if (this._parent) {
      this._parent._collectProvidersWithAnnotation(annotationClass, collectedProviders);
    }
  },
  _loadModules: function(modules) {
    for (var $__2 = modules[Symbol.iterator](),
        $__3; !($__3 = $__2.next()).done; ) {
      var module = $__3.value;
      {
        if (isFunction(module)) {
          this._loadFnOrClass(module);
          continue;
        }
        throw new Error('Invalid module!');
      }
    }
  },
  _loadFnOrClass: function(fnOrClass) {
    var annotations = readAnnotations(fnOrClass);
    var token = annotations.provide.token || fnOrClass;
    var provider = createProviderFromFnOrClass(fnOrClass, annotations);
    this._providers.set(token, provider);
  },
  _hasProviderFor: function(token) {
    if (this._providers.has(token)) {
      return true;
    }
    if (this._parent) {
      return this._parent._hasProviderFor(token);
    }
    return false;
  },
  _instantiateDefaultProvider: function(provider, token, resolving, wantPromise, wantLazy) {
    if (!this._parent) {
      this._providers.set(token, provider);
      return this.get(token, resolving, wantPromise, wantLazy);
    }
    for (var $__2 = this._scopes[Symbol.iterator](),
        $__3; !($__3 = $__2.next()).done; ) {
      var ScopeClass = $__3.value;
      {
        if (hasAnnotation(provider.provider, ScopeClass)) {
          this._providers.set(token, provider);
          return this.get(token, resolving, wantPromise, wantLazy);
        }
      }
    }
    return this._parent._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
  },
  get: function(token) {
    var resolving = arguments[1] !== (void 0) ? arguments[1] : [];
    var wantPromise = arguments[2] !== (void 0) ? arguments[2] : false;
    var wantLazy = arguments[3] !== (void 0) ? arguments[3] : false;
    var $__0 = this;
    var resolvingMsg = '';
    var provider;
    var instance;
    var injector = this;
    if (token === null || token === undefined) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error(("Invalid token \"" + token + "\" requested!" + resolvingMsg));
    }
    if (token === $Injector) {
      if (wantPromise) {
        return Promise.resolve(this);
      }
      return this;
    }
    if (wantLazy) {
      return function createLazyInstance() {
        var lazyInjector = injector;
        if (arguments.length) {
          var locals = [];
          var args = arguments;
          for (var i = 0; i < args.length; i += 2) {
            locals.push((function(ii) {
              var fn = function createLocalInstance() {
                return args[ii + 1];
              };
              annotate(fn, new ProvideAnnotation(args[ii]));
              return fn;
            })(i));
          }
          lazyInjector = injector.createChild(locals);
        }
        return lazyInjector.get(token, resolving, wantPromise, false);
      };
    }
    if (this._cache.has(token)) {
      instance = this._cache.get(token);
      provider = this._providers.get(token);
      if (provider.isPromise && !wantPromise) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error(("Cannot instantiate " + toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg));
      }
      if (!provider.isPromise && wantPromise) {
        return Promise.resolve(instance);
      }
      return instance;
    }
    provider = this._providers.get(token);
    if (!provider && isFunction(token) && !this._hasProviderFor(token)) {
      provider = createProviderFromFnOrClass(token, readAnnotations(token));
      return this._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
    }
    if (!provider) {
      if (!this._parent) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error(("No provider for " + toString(token) + "!" + resolvingMsg));
      }
      return this._parent.get(token, resolving, wantPromise, wantLazy);
    }
    if (resolving.indexOf(token) !== -1) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error(("Cannot instantiate cyclic dependency!" + resolvingMsg));
    }
    resolving.push(token);
    var delayingInstantiation = wantPromise && provider.params.some((function(param) {
      return !param.isPromise;
    }));
    var args = provider.params.map((function(param) {
      if (delayingInstantiation) {
        return $__0.get(param.token, resolving, true, param.isLazy);
      }
      return $__0.get(param.token, resolving, param.isPromise, param.isLazy);
    }));
    if (delayingInstantiation) {
      var delayedResolving = resolving.slice();
      resolving.pop();
      return Promise.all(args).then(function(args) {
        try {
          instance = provider.create(args);
        } catch (e) {
          resolvingMsg = constructResolvingMessage(delayedResolving);
          var originalMsg = 'ORIGINAL ERROR: ' + e.message;
          e.message = ("Error during instantiation of " + toString(token) + "!" + resolvingMsg + "\n" + originalMsg);
          throw e;
        }
        if (!hasAnnotation(provider.provider, TransientScopeAnnotation)) {
          injector._cache.set(token, instance);
        }
        return instance;
      });
    }
    try {
      instance = provider.create(args);
    } catch (e) {
      resolvingMsg = constructResolvingMessage(resolving);
      var originalMsg = 'ORIGINAL ERROR: ' + e.message;
      e.message = ("Error during instantiation of " + toString(token) + "!" + resolvingMsg + "\n" + originalMsg);
      throw e;
    }
    if (!hasAnnotation(provider.provider, TransientScopeAnnotation)) {
      this._cache.set(token, instance);
    }
    if (!wantPromise && provider.isPromise) {
      resolvingMsg = constructResolvingMessage(resolving);
      throw new Error(("Cannot instantiate " + toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg));
    }
    if (wantPromise && !provider.isPromise) {
      instance = Promise.resolve(instance);
    }
    resolving.pop();
    return instance;
  },
  getPromise: function(token) {
    return this.get(token, [], true);
  },
  createChild: function() {
    var modules = arguments[0] !== (void 0) ? arguments[0] : [];
    var forceNewInstancesOf = arguments[1] !== (void 0) ? arguments[1] : [];
    var forcedProviders = new Map();
    forceNewInstancesOf.push(TransientScopeAnnotation);
    for (var $__2 = forceNewInstancesOf[Symbol.iterator](),
        $__3; !($__3 = $__2.next()).done; ) {
      var annotation = $__3.value;
      {
        this._collectProvidersWithAnnotation(annotation, forcedProviders);
      }
    }
    return new $Injector(modules, this, forcedProviders, forceNewInstancesOf);
  }
}, {});
;
module.exports = {
  get Injector() {
    return Injector;
  },
  __esModule: true
};
