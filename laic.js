'use strict';
const util = require('util');
const path = require('canonical-path');
const fs = require('fs');

const MODULE_NAME='laic';

/**
 * <p>A <code>Namespace</code> is a subclass of {@link Laic} that provides
 * a unique container for dependencies. <code>Namespace</code>s support
 * all of the methods of the parent <code>Laic</code> instance.</p>
 *
 * @example
 * const laic = new Laic('foo');
 * laic.foo.register('today', new Date());
 * console.log(laic.foo.get('today')); // today's date
 *
 * @class {Laic} Namespace
 */
const Namespace = function Namespace(){};
util.inherits(Namespace, Laic);
let _laic;

/**
 * <p><code>Laic</code> provides a dependency container. It supports dependency
 * namespaces. By default, all dependencies are added to a global namespace.
 * However, it is easy to define a new namespace at instantiation time by
 * supplying a name. It is suggested you do so as <code>Laic</code> is a
 * singleton object. Thus, if multiple modules in a project depend upon
 * <code>Laic</code> then all of those modules will share the same
 * <code>Laic</code> instance.</p>
 *
 * <p>Note: if you use a {@link Symbol} for the namespace identifier then
 * you will need to use {@link Laic#getNamespace} to retrieve the namespace.</p>
 *
 * @param {(string|Symbol)} [namespace] A {@link Namespace} to create in
 * addition to the global namespace. Can be a path as is supported by
 * {@link Laic#addNamespacePath}.
 * @constructor
 * @class Laic
 */
function Laic(namespace) {
  if (_laic) {
    if (arguments.length > 0) {
      _laic.addNamespace(namespace);
    }
    return _laic;
  }

  this.addNamespace('global');
  this._globalNS = true;
  this.global._globalNS = true; // for completeness sake

  if (arguments.length > 0) {
    this.addNamespace(namespace);
  }

  _laic = this;
}

/**
 * <p>Adds a new {@link Namespace} to the {@link Laic} instance. The namespace
 * can be accessed as a property of the <code>Laic</code> instance.
 *
 * <p>Note: if you use a {@link Symbol} for the namespace identifier then
 * you will need to use {@link Laic#getNamespace} to retrieve the namespace.</p>
 *
 * @example
 * const laic = new Laic();
 * laic.addNamespace('foo');
 * laic.foo; // The namespace that was just added
 *
 * @param {(string|Symbol)} namespaceName An identifier for the namespace to
 * create.
 * @param {Namespace} nsRoot The top level namespace for child namespaces. Used
 * for internal tracking. If not defined, it is assumed the namespace itself
 * is the root.
 * @returns {Namespace} The newly created namespace.
 *
 * @throws If no <code>namespaceName</code> is given.
 */

Laic.prototype.addNamespace = function addNamespace(namespaceName, nsRoot) {
  if (arguments.length > 0 && namespaceName) {
    if (typeof namespaceName !== 'symbol' && namespaceName.indexOf('/') > 0) {
      return this.addNamespacePath(namespaceName);
    }
    if (this.hasOwnProperty(namespaceName)) {
      return this.getNamespace(namespaceName);
    }
    const namespace = new Namespace();
    this[namespaceName] = namespace;
    Object.defineProperty(namespace, '_globalNS', {
      enumerable: false,
      writable: true,
      value: false
    });
    Object.defineProperty(namespace, '_nsRoot', {
      enumerable: false,
      writable: false,
      value: nsRoot || this
    });
    Object.defineProperty(this, namespaceName, {
        get: function () {
          return namespace;
        },
        enumerable: true
    });

    return namespace;
  } else {
    throw new Error('Must provide a name for the namespace');
  }
};

/**
 * <p>Adds a nested set of {@link Namespace}s based on a given
 * <code>path</code>.</p>
 *
 * @example
 * const laic = new Laic();
 * const nsPath = laic.addNamespacePath('foo/bar');
 * nsPath.bar.register('today', new Date());
 * console.log(laic.foo.bar.get('today')); // today's date
 *
 * @param {string} path A Unix style path without a leading /.
 * @returns {Namespace} The first {@link Namespace} in the nested path.
 * @throws {Error} If the path is a symbol or not really a path.
 */
Laic.prototype.addNamespacePath = function addNamespacePath(path) {
  if (!isValidPath(path)) {
    throw new Error('Must supply path in form path/to/namespace');
  }

  const nsRoot = this;
  function addNS(parent, children) {
    if (children.length > 0) {
      const ns = parent.addNamespace(children.shift(), nsRoot);
      return addNS(ns,  children);
    }
    return parent;
  }

  return addNS(this, splitPath(path));
};

/**
 * <p>Retrieve a value from the namespace. By default, the value will be
 * retrieved from the global namespace unless the instance is itself a
 * namespace. You can retrieve a namespace other than the global one via
 * {@link Laic#getNamespace} or, if it has a {@link String} name, by
 * referencing the name in a chain.</p>
 *
 * @example
 * const laic = new Laic('foo');
 * laic.foo.register('bar', 'foobar');
 * console.log(laic.foo.get('bar')); // 'foobar'
 * console.log(laic.getNamespace('foo').get('bar')); // 'foobar'
 *
 * @example <caption>Additionally, you can supply a path to a value name to
 * retrieve it:</caption>
 *
 * const laic = new Laic('foo/bar');
 * laic.foo.bar.register('today', new Date());
 * console.log(laic.get('foo/bar/today')); // today's date
 *
 * @param {(string|Symbol)} dependencyName The dependency name to retrieve.
 * @returns {(*|undefined)} The dependency or <code>undefined</code> if it was
 * not found.
 */
Laic.prototype.get = function get(dependencyName) {
  const parent = (this._globalNS && isName(dependencyName)) ?
    this.global : this;
  let val;
  if (isName(dependencyName)) {
    val = parent[dependencyName];
  } else if (isValidPath(dependencyName)) {
    const parts = splitPath(dependencyName);
    const _name = parts.splice(-1)[0];
    const ns = getInnerNS(parent, parts);
    val = (ns) ? ns[_name] : undefined;
  }

  if (val === undefined) {
    return undefined;
  }

  if (val.hasOwnProperty('@literal') && val['@literal']) {
    return val;
  }

  if (val.hasOwnProperty('@singleton') && val['@singleton']) {
    return val;
  }

  return val;
};

/**
 * <p>Retrieve a namespace that is identified by the given name.</p>
 *
 * @param {(string|Symbol)} name The identifier for the namespace.
 * @returns {Namespace} The desired namespace or the current instance if
 * one by the given <code>name</code> was not found.
 */
Laic.prototype.getNamespace = function getNamespace(name) {
  if (isName(name)) {
    const properties = [].concat(
      Object.getOwnPropertyNames(this),
      Object.getOwnPropertySymbols(this)
    );
    const i = properties.indexOf(name);
    return (i !== -1) ? this[name] : this;
  } else if (isValidPath(name)) {
    const parts = splitPath(name);
    let ns;
    for (let part of parts) {
      ns = this[part];
    }
    return ns;
  }

  return this;
};

/**
 * <p>Given a path relative to the project's root directory, load any
 * <code>.js</code> or <code>.json</code> files, except for <code>index</code>
 * files, within that directory. The files will be loaded with
 * {@link Laic#loadFile}. As such, the same rules that apply to
 * <code>loadFile</code> apply to <code>loadDir</code>.</p>
 *
 * @param {string} dir Relative path to a directory to load, e.g 'foo/bar'.
 * @returns {Laic} The same namespace upon which <code>loadDir</code> was
 * invoked.
 */
Laic.prototype.loadDir = function loadDir(dir) {
  function dirReadHandler(files) {
    const filesToLoad = files.filter(function _filter(f) {
      let result = !f.startsWith('index');
      if (!result) {
        const ext = path.extname(f).toLowerCase();
        result = ['.js', '.json'].indexOf(ext) !== -1;
      }
      return result;
    });
    for (let f of filesToLoad) {
      this.loadFile(path.join(dir, f)); // jshint ignore: line
    }
  }

  if (isValidPath(dir)) {
    const files = fs.readdirSync(getFsPath(this, dir));
    dirReadHandler.call(this, files);
  }

  return this;
};

/**
 * <p>Given a file name, possibly with a path, determine the absolute
 * path to the file and <code>require</code> it. Once loaded, store the
 * instance in the current namespace.</p>
 *
 * <p>The starting location for lookups is the root directory of the parent
 * project. That is, if you installed Laic as a dependency for project
 * 'foobar', then Laic will look in 'foobar/' and its subdirectories (if
 * given a subdirectory path).</p>
 *
 * <p>Paths should not start with a leading slash, and should end with the
 * basename of the file to load.</p>
 *
 * <p>The given path will be used as the namespace for storage, or global
 * if it is in the root directory, with the basename of the file used as the
 * registration name.</p>
 *
 * @example
 * const laic = new Laic();
 * laic.loadFile('foo/bar'); // directory: 'foo', file: 'bar.js'
 * laic.foo.get('bar'); // return the 'bar' instance
 *
 * @param {string} file A filename in the project root or a path to a file
 * in a subdirectory of the project root.
 * @returns {Laic} The namespace under which the loaded file was registered.
 * @throws {Error} If a given path does not resolve to a valid directory.
 */
/* jshint maxstatements: false */
Laic.prototype.loadFile = function loadFile(file) {
  const filename = path.basename(file, path.extname(file));
  const dir = path.dirname(file);

  let rootDir = false;
  if (dir === '.') {
    rootDir = true;
  }

  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`Directory ${dir} does not exist`);
  }

  let ns = this;
  if (ns._globalNS && !rootDir) {
    ns.addNamespacePath(dir);
    ns = getInnerNS(ns, splitPath(dir));
  }

  let instance;
  const realDir = getFsPath(ns, dir);
  try {
    instance = require(path.join(realDir, filename));
    ns.register(filename, instance);
  } catch (e) {}

  if (!ns.hasOwnProperty('_fsPath')) {
    Object.defineProperty(ns, '_fsPath', {
      enumerable: true,
      writable: true,
      value: realDir
    });
  }

  return ns;
};

/**
 * <p>Adds an object to the namespace under the given name. If the object
 * has already been added, and has the '@singleton' annotation, then the
 * instance will not be re-registered. Otherwise, the old instance will be
 * overwritten by the new instance.</p>
 *
 * @param {(string|Symbol)} name The name for the instance within the namespace.
 * @param {*} instance Any initialized object.
 * @returns {Namespace} The namespace under which the object was registered.
 */
Laic.prototype.register = function register(name, instance) {
  let _name = name;
  let parent = (this._globalNS && isName(_name)) ? this.global : this;

  if (!isName(_name) && isValidPath(_name)) {
    const parts = splitPath(_name);
    _name = parts.splice(-1)[0];
    parent.addNamespacePath(parts.join('/'));
    parent = getInnerNS(parent, parts);
  }

  if (!parent.hasOwnProperty(_name)) {
    Object.defineProperty(parent, _name, {
      enumerable: true,
      writable: true,
      value: undefined
    });
  }

  if (isSingleton(instance) && parent[_name] !== undefined) {
    return parent;
  }

  const _instance = instantiate(parent, instance);
  parent[_name] = _instance;
  return parent;
};

// Returns the base path of the parent application or, if given a namespace
// path, the matching filesystem path
function getFsPath(namespace, nsPath) {
  // TODO: consider caching lookups. Maybe with a WeakMap
  let basePath = __dirname;

  if (basePath.indexOf(`node_modules/${MODULE_NAME}`) !== -1) {
    while (!fs.statSync(basePath + '/node_modules').isDirectory() ||
      basePath.substr(MODULE_NAME.length) === MODULE_NAME)
    {
      basePath = path.resolve(basePath + '/..');
    }
  } else {
    while (!fs.statSync(basePath + '/node_modules').isDirectory()) {
      basePath = path.resolve(basePath + '/..');
    }
  }

  if (namespace._globalNS && !nsPath) {
    return basePath;
  }

  const subPath = path.join(basePath, nsPath);
  if (fs.statSync(subPath).isDirectory()) {
    return subPath;
  }

  return undefined;
}

// Dig through a namespace chain and find the the innermost namespace
function getInnerNS(namespace, pathParts) {
  let ns = namespace;
  if (pathParts.length > 0) {
    const next = pathParts.shift();
    if (ns.hasOwnProperty(next)) {
      return getInnerNS(ns[next], pathParts);
    }
    return undefined;
  }
  return ns;
}

// Processes annotations on an instance, i.e. a module that has been
// `require`ed, and "instantiates" the module if necessary.
// Builder modules will call the exported function and constructor modules
// will return a `new` instance.
// In either case, if a '@requires' annotation is present, each dependency
// in the list will be loaded and supplied in the function call.
function instantiate(namespace, instance) {
  if (typeof instance !== 'function') {
    // i.e. '@literal' annotations
    return instance;
  }

  const args = [];
  const requires = instance['@requires'];
  if (requires && Array.isArray(requires)) {
    for (let req of requires) {
      let _reqinst = namespace._nsRoot.get(req);
      if (!_reqinst) {
        namespace.loadFile.call(namespace._nsRoot, req);
        _reqinst = namespace._nsRoot.get(req);
      }
      args.push(_reqinst);
    }
  }

  if (!isConstructor(instance)) {
    return instance.apply(instance, args);
  }

  return (
    function _constructorInstantiate() {
      function F(args) {
        return instance.apply(this, args);
      }
      util.inherits(F, instance);
      return new F(args);
    }()
  );
}

function isConstructor(instance) {
  let result = false;

  if (instance.hasOwnProperty('@constructor')) {
    result = instance['@constructor'];
  }

  return result;
}

function isName(obj) {
  let result = typeof obj === 'symbol';

  if (!result) {
    result = obj.indexOf('/') === -1;
  }

  return result;
}

function isSingleton(instance) {
  let result = false;

  if (instance.hasOwnProperty('@singleton')) {
    result = instance['@singleton'];
  }

  return result;
}

// Merely used to check if a parameter is a dependency 'name' or a
// 'path' to a dependency(ies).
function isValidPath(path) {
  return (path.indexOf('/') > 0 && typeof path !== 'symbol');
}

// Normalizes splitting a path into its constituent parts.
function splitPath(path) {
  let _path = path;
  if (_path.substr(-1) === '/') {
    _path = _path.substr(0, _path.length - 1);
  }
  return _path.split('/');
}

// Queries a namespace to determine if it contains a specific
// path, e.g. 'foo/bar' should find `laic.foo.bar`
function nsPathExists(laic, path) {
  let result = isValidPath(path);

  if (result) {
    const parts = splitPath(path);
    let ns = laic;
    for (let part of parts) {
      ns = ns.getNamespace(part);
      if (ns === undefined && !(ns instanceof Laic)) {
        result = false;
        break;
      }
    }
  }

  return result;
}


Object.defineProperty(Laic,  'laic', {
  get: function _getLaic() {
    if (_laic) {
      return _laic;
    }

    return new Laic();
  }
});

Laic.Namespace = Namespace;
module.exports = Laic;
