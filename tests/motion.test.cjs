const assert=require('node:assert/strict'),M=require('../shared/motion.js');
assert(Object.values(M.presets.off).every(v=>v===false));assert(Object.values(M.presets.playful).every(v=>v===true));assert.equal(M.presets.gentle.counter,true);assert.equal(M.presets.gentle.celebration,false);assert.equal(M.presets.gentle.stateRipple,false);
assert.deepEqual(M.normalize(undefined,false),M.presets.off);assert.deepEqual(M.normalize(undefined,true),M.presets.playful);assert.equal(M.normalize({counter:false},true).counter,false);assert.equal(M.normalize({counter:false},true).ambient,true);
console.log('PASS animation presets, gentle defaults and legacy preference migration');
