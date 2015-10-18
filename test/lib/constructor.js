'use strict';

function Foo(bar) {
  this.bar = bar;
}

Foo.prototype.print = function print() {
  return `${this.bar.foo}`
};

module.exports = Foo;

module.exports['@constructor'] = true;
module.exports['@requires'] = [ 'test/lib/literal' ];