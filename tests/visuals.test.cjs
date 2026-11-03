const assert=require('node:assert/strict'),{wakeIntervals}=require('../shared/visuals.js');
const list=[{id:'c',start:100,end:null},{id:'b',start:50,end:70,autoEnded:true},{id:'a',start:10,end:30},{id:'deleted',start:35,end:40,deleted:true}];
const original=JSON.stringify(list),gaps=wakeIntervals(list);assert.deepEqual(gaps.map(g=>[g.before,g.after,g.start,g.end,g.approximate]),[['a','b',30,50,false],['b','c',70,100,true]]);assert.equal(JSON.stringify(list),original);
assert.deepEqual(wakeIntervals([]),[]);assert.deepEqual(wakeIntervals([{id:'one',start:1,end:2}]),[]);assert.deepEqual(wakeIntervals([{id:'a',start:1,end:10},{id:'b',start:9,end:20}]),[]);assert.deepEqual(wakeIntervals([{id:'a',start:1,end:10},{id:'b',start:10,end:20}]),[]);
console.log('PASS derived wake intervals: chronological, bounded by real sleeps, no current/leading/trailing invented window, deleted/overlap exclusion, approximate labeling, no mutation');
