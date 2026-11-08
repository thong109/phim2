const fs=require('fs'),assert=require('assert');
const mouth=require('../pipeline/assets/mouth-sync.js');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const peaks=[];
for(const shot of p.shots){
  const ids=shot.actors.map(a=>a.id),hz=shot.mouthEnvelope.hz;
  for(const track of shot.speechSegments){
    let best={time:track.start,value:0};
    for(let t=track.start+.04;t<track.end;t+=1/hz){
      for(const id of ids){const value=mouth.at(shot,id,t);if(id!==track.speaker)assert.equal(value,0,'A listener or narrator moved the wrong mouth');else if(value>best.value)best={time:t,value};}
    }
    if(track.speaker&&ids.includes(track.speaker)){assert(best.value>0,'Voiced dialogue never opened its assigned mouth');peaks.push({shot:shot.id,speaker:track.speaker,...best});}
  }
}
if(process.argv[3]){fs.writeFileSync(process.argv[3],JSON.stringify(peaks,null,2));console.log('Verified '+peaks.length+' visible dialogue intervals.');}
else console.log(JSON.stringify(peaks,null,2));
