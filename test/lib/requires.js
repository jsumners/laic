'use strict';

module.exports = function testRequires(dep1, dep2) {
  return {
    dep1: dep1,
    dep2: dep2
  }
};

module.exports['@requires'] = ['test/lib/literal', 'laic'];