/* globals describe, it */
'use strict';

const chai = require('chai');
const assert = chai.assert;
const laicPath = require.resolve('../laic');

it('returns new instances of empty builders', function emptyBuilders() {
  const Laic = require(laicPath);
  const laic = new Laic();

  laic.register('Builder', require('./lib/emptyBuilder'));
  const builder1 = laic.get('Builder');
  const builder2 = laic.get('Builder');
  assert.equal(builder1.bar, 42);
  assert.equal(builder2.bar, 42);
  delete require.cache[laicPath];
});

it('supports literal annotations', function literalAnnotations() {
  const laic = new (new require(laicPath))();
  laic.register('lit', require('./lib/literal'));
  const lit = laic.get('lit');
  assert.equal(lit.foo, 'bar');
  assert.isDefined(lit['@literal'], '@literal is present');
  delete require.cache[laicPath];
});

it('supports constructor annotations', function constructorAnnotations() {
  const laic = new (new require(laicPath))();
  const Foo = require('./lib/constructor');
  laic.register('Foo', Foo);
  const foo = laic.get('Foo');
  assert.equal('bar', foo.print());
  assert.instanceOf(foo, Foo);
  delete require.cache[laicPath];
});

it('supports singleton annotations', function singletonAnnotations() {
  const laic = new (new require(laicPath))();
  laic.register('s', require('./lib/singleton1.js'));
  assert.equal(laic.get('s').foo, 'bar');
  laic.register('s', require('./lib/singleton2.js'));
  assert.equal(laic.get('s').foo, 'bar');
  delete require.cache[laicPath];
});

it('loads files to namespace off root namespace', function loadFiles() {
  const laic = new (require(laicPath))();
  laic.loadFile('test/lib/literal');
  const lib = laic.test.lib;
  assert.equal(lib.get('literal').foo, 'bar');
  assert.isDefined(lib._fsPath, '_fsPath is defined');
  delete require.cache[laicPath];
});

it('loads files to namespace off sub-namespace', function loadFilesSub() {
  const laic = new (require(laicPath))();
  const sub = laic.addNamespace('sub');
  sub.loadFile('test/lib/literal');
  const lib = laic.sub.test.lib;
  assert.equal(lib.get('literal').foo, 'bar');
  assert.isDefined(lib._fsPath, '_fsPath is defined');
  delete require.cache[laicPath];
});

it('loads a directory of files', function loadDir() {
  const laic = new (require(laicPath))();
  laic.loadDir('test/lib');
  assert.isDefined(laic.test);
  assert.isDefined(laic.test.lib);
  assert.isDefined(laic.test.lib.get('emptyBuilder'));
  assert.isDefined(laic.test.lib.get('literal'));
  delete require.cache[laicPath];
});

it('loads a file from project root', function loadFromRoot() {
  const laic = new (require(laicPath))();
  laic.loadFile('laic');
  assert.isDefined(laic.get('laic'));
  assert.isDefined(laic.get('laic')._globalNS);
  delete require.cache[laicPath];
});

it('handles loading required dependencies', function loadDeps() {
  const laic = new (require(laicPath))();
  laic.loadFile('test/lib/requires');
  assert.isDefined(laic.test.lib);
  const reqsFile = laic.test.lib.get('requires');
  assert.isDefined(reqsFile);
  assert.isDefined(reqsFile.dep1);
  assert.equal(reqsFile.dep1.foo, 'bar');
  assert.isDefined(reqsFile.dep2);
  assert.isDefined(reqsFile.dep2._globalNS);
  delete require.cache[laicPath];
});
