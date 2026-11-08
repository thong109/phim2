const assert=require('assert');
const mouth=require('../pipeline/assets/mouth-sync.js');
const shot={speechSegments:[{speaker:null,start:0,end:1},{speaker:'lan',start:1,end:2},{speaker:'minh',start:2,end:3}],mouthEnvelope:{hz:10,values:Array(31).fill(.7)}};
assert.equal(mouth.at(shot,'lan',.5),0,'Narrator must not move a character mouth');
assert(mouth.at(shot,'lan',1.3)>0);assert.equal(mouth.at(shot,'minh',1.3),0,'Listener must stay closed');
assert.equal(mouth.at(shot,'lan',2.3),0);assert(mouth.at(shot,'minh',2.3)>0);
shot.mouthEnvelope.values.fill(0);assert.equal(mouth.at(shot,'minh',2.3),0,'Silence must close the mouth');
assert.equal(mouth.at(shot,'minh',3.1),0,'Scene pause must close the mouth');
console.log('Measured speaker gating and silence checks passed.');
