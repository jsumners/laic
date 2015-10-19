# Laic

*Laic* is a Dependency Injector (DI) library. There are many such libraries
available. Indeed, *Laic*'s feature set and methodolgy was informed by
the [Electrolyte][electrolyte] library. *Laic* sets itself apart with
the following features:

* Namespaces
* Nested namespaces
* Namespace chaining
* Namespace paths

The name *Laic* does not have any special significance. It was picked from
a fantasy name generator list.

*Laic* is written with ES2015 features. Your environment should support them
if you intend to use *Laic* in your project.

*Laic* is fully documented with [JSDoc][jsdoc]. The generated documentation is
available in the [doc](doc/) directory.

### Example

```javascript
const laic = require('laic').laic;

function Foo() {}
const foo = new Foo();

laic.register('foo', foo);

const _foo = laic.get('foo');
assert.strictEqual(foo, _foo);
```

## Namespaces

The defining feature of *Laic* is its support for isolating dependencies
in their own namespace within a global container. As with
[Electrolyte][electrolyte], *Laic* is a singleton object. With *Electrolyte*,
this means you can't use dependencies that may conflict. Which further means
you can really only use it in a top level project and not within modules.
*Laic* has a global namespace, but it also allows you to define your own
namespace. This can be done in two ways:

```javascript
const Laic = require('laic');

// Define a namespace with the constructor
const laic = new Laic('foo');
// Get a reference to the namespace
const foo = laic.getNamespace('foo');

// Define a namespace by method
const bar = laic.addNamespace('bar');
```

The namespaces `foo` and `bar` are now available for registering dependencies.
Also note that a 'namespace' is itself an instance of `Laic` (techinically it's
an instance of `Namespace`, but that is a subclass of `Laic`).

### Nesting And Chaining

We defined top level namespaces in the introduction. But we can also define
new namespaces within a namespace. For example, let's say we have a namespace
named 'parent' that should contain a namespace named 'child':

```javascript
const child = laic.addNamespace('parent').addNamespace('child');
child.register('toy', new (function Toy(){}));
child.get('toy'); // the child's toy
```

But that's an onerous method. Just as we were able to chain the `addNamespace`
method, we can chain access to namespaces:

```javascript
laic.parent.child.get('toy'); // the child's toy
```

### Paths

In *Nesting And Chaining* we defined a child namespace by chaining calls
to `addNamespace`. We can simplify that with a path:

```javascript
const grandchild = laic.addNamespacePath('parent/child/grandchild');
grandchild.register('toy', new (function Toy(){}));
laic.parent.child.grandchild.get('toy'); // granchild.get('toy')
```

In fact, we can even retrieve the `toy` by path:

```javascript
laic.get('parent/child/grandchild/toy');
```

## Annotations

*Laic* supports a few annotations. These annotations are simply properties
on an exported module. As an example, let's assume there is an annotation
named '@foo' that has a boolean value:

```javascript
function Bar() {}

module.exports = Bar;

module.exports['@foo'] = true;
```

### @literal

The simplest annotation is the `@literal` annotation. If a dependency has this
annotation then the only other annotation *Laic* will only honor is the
`@singleton` annotation. This annotation accepts a boolean value:
`true` or `false`.

```javascript
module.exports = {
  foo: 'bar'
};

module.exports['@literal'] = true;
```

### @singleton

Indicates that a dependency should only be instantiated once. Subsequent
attempts to register the same module will result in silent failure, i.e.
it won't overwrite the previously registered instance. This annotation
accepts a boolean value:

```javascript
module.exports = {
  foo: 'bar'
};

module.exports['@literal'] = true;
module.exports['@singleton'] = true;
```

### @requires

This annotation is an array of dependency names for the module being loaded.
The names can be valid paths as can be supplied to `get()`.

Modules that use this annoation must follow one of two forms: a builder or
a constructor (which will be discussed elsewhere). A builder module exports a
function as its sole export (other than annotations). This function accepts
a list of dependencies in the order in which they are defined in the
annotation. When the module is registered this method
will be invoked with the dependencies from the annotation passed in as
arguments (`this` will be bound to the module).

```javascript
let foo;
let bar;

function Baz() {}

Baz.prototype.print = function print() {
  return `${foo} -- ${bar}`;
};

module.exports = function ($foo, $bar) {
  foo = $foo;
  bar = $bar;

  return Baz;
};

module.exports['@requires'] = [ 'lib/foo', 'lib/bar' ];
```

### @constructor

This is a boolean annotation that defines the module as exporting a constructor
instead of a builder. This annotation supports the '@requires' annotation. Like
with the builder module type, described in *@requires*, any required
dependencies will be passed in to the constructor when it is invoked; this
happens when the module is registered. `this` will be bound to the constructor.
*Laic* stores the result of `new Constructor(dependencies)`.

```javascript
function Baz(foo, bar) {
  this.foo = foo;
  this.bar = bar;
}

Baz.prototype.print = function print() {
  return `${this.foo} -- ${this.bar}`;
};

module.exports = Baz;

module.exports['@constructor'] = true;
module.exports['@requires'] = [ 'lib/foo', 'lib/bar' ];
```

## Loaders

*Laic* provides some helper methods for registering dependencies. These
methods can load individual files or a directory of files.

### Load File

This is equivalent to `require`ing a JavaScript file but has the added benefit
of loading the file directly into a namespace.

Let's assume you have a file 'foo.js' in the root of your project and a file
'lib/bar.js':

```javascript
laic.loadFile('foo.js');
// results in
const foo = laic.get('foo');

laic.loadFile('lib/bar.js');
// results in
const bar = laic.lib.get('bar');
```

Remember, all namespaces support this method. To avoid potential collisions
you should use it from a namespace you have defined instead of the global one
as is shown here.

### Load Directory

This works the same way as *Load File* but operates on a whole directory. Note,
it does not traverse subdirectories.

Let's assume you have a 'lib' directory in the root of your project that
contains the files 'foo.js', 'bar.js', and 'fooBar.js':

```javascript
laic.loadDir('lib/'); // note the trailing slash
const foo = laic.lib.get('foo');
const bar = laic.lib.get('bar');
const fooBar = laic.lib.get('fooBar');
```

Remember, all namespaces support this method. To avoid potential collisions
you should use it from a namespace you have defined instead of the global one
as is shown here.

## License

[MIT License](http://jsumners.mit-license.org/)

[electrolyte]: https://www.npmjs.com/package/electrolyte
[jsdoc]: http://usejsdoc.org/
