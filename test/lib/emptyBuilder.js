'use strict';

let x = 1;

function Foo() {
  this.bar = x + 41;
}

module.exports = function fooBuilder() {
  return new Foo();
};