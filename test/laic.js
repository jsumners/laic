/* globals describe, it */
'use strict';

const chai = require('chai');
const expect = chai.expect;

const laicPath = require.resolve('../laic');

describe('Laic', function describeLaic() {
  it('is a singleton', function isSingleton() {
    const Laic = require(laicPath);
    const laic = new Laic();
    const laic2 = new Laic();

    laic.addNamespace('foo');

    expect(laic.foo).to.exist;
    expect(laic2.foo).to.exist;

    delete require.cache[laicPath];
    const laic3 = new (require(laicPath))();
    expect(laic3.foo).to.not.exist;
  });

  it('has a global namespace', function hasGlobal() {
    const laic = new (require(laicPath))();
    laic.register('foo', 'bar');
    expect(laic.get('foo')).to.equal('bar');
    delete require.cache[laicPath];
  });

  it('creates a namespace via constructor', function constructorNamespace() {
    const Laic = require(laicPath);
    const laic = new Laic('foo');
    expect(laic.foo).to.exist;
    delete require.cache[laicPath];
  });

  it('creates a namespace via addNamespace', function addNS() {
    const Laic = require(laicPath);
    const laic = new Laic();
    laic.addNamespace('foo');
    expect(laic.foo).to.exist;
    delete require.cache[laicPath];
  });

  it('returns namespaces via getNamespace', function getNS() {
    const laic = new (require(laicPath))('foo');
    laic.foo.register('foo', 'bar');
    const ns = laic.getNamespace('foo');
    expect(ns.get('foo')).to.equal('bar');
    delete require.cache[laicPath];
  });

  it('chains namespaces', function chains() {
    const laic = new (require(laicPath))('foo');
    laic.foo.register('bar', 'foobar');
    expect(laic.foo.get('bar')).to.equal('foobar');
    expect(laic.getNamespace('foo').get('bar')).to.equal('foobar');
    delete require.cache[laicPath];
  });

  it('supports Symbols as namespaces', function syms() {
    const Laic = require(laicPath);
    const sym = Symbol('foo');
    const laic = new Laic(sym);
    const symspace = laic.getNamespace(sym);
    expect(symspace).to.exist;
    symspace.register('foo', 'bar');
    expect(symspace.get('foo')).to.equal('bar');
    delete require.cache[laicPath];
  });

  it('supports nested namespaces', function nested() {
    const Laic = require(laicPath);
    const laic = new Laic('parent');
    laic.parent.addNamespace('child');
    expect(laic.parent.child).to.exist;
    expect(laic.parent.child).to.be.an.instanceof(Laic.Namespace);

    laic.parent.child.register('foo', 'bar');
    expect(laic.parent.child.get('foo')).to.equal('bar');
    delete require.cache[laicPath];
  });

  it('adds nested namespaces by path', function nestedPath() {
    const laic = new (require(laicPath))();
    laic.addNamespacePath('foo/bar/foobar');
    expect(laic.foo).to.exist;
    expect(laic.foo.bar).to.exist;
    expect(laic.foo.bar.foobar).to.exist;

    laic.foo.bar.foobar.register('foo', 'bar');
    expect(laic.foo.bar.foobar.get('foo')).to.equal('bar');
    delete require.cache[laicPath];

    const Laic = require(laicPath);
    const laic2 = new Laic('foo/bar');
    expect(laic2.foo.bar).to.exist;
    expect(laic2.foo.bar).to.be.an.instanceof(Laic.Namespace);
    delete require.cache[laicPath];
  });

  it('errors with a symbol namespace path', function errorSymPath() {
    const laic = new (require(laicPath))();
    const sym = Symbol('foo/bar');
    expect(laic.addNamespacePath.bind(laic, sym)).to.throw(Error);
    delete require.cache[laicPath];
  });

  it('registers values by path', function registerByPath() {
    const laic = new (require(laicPath))();
    laic.register('foo/bar/answer', 42);
    expect(laic.foo.bar.get('answer')).to.equal(42);
    delete require.cache[laicPath];
  });

  it('gets values by path', function valByPath() {
    const laic = new (require(laicPath))('parent/child/grandchild');
    laic.parent.child.grandchild.register('foo', 'bar');
    const val = laic.get('parent/child/grandchild/foo');
    expect(val).to.equal('bar');
    delete require.cache[laicPath];
  });
});