/* Waveform-driven opening, gated by measured dialogue speaker intervals. */
(function(root){
  function active(shot,id,time){return (shot.speechSegments||[]).some(s=>s.speaker===id&&time>=s.start&&time<s.end);}
  function at(shot,id,time){
    if(!active(shot,id,time))return 0;
    const env=shot.mouthEnvelope;
    if(!env||!Array.isArray(env.values)||!env.hz)return 0;
    const point=Math.max(0,time*env.hz),i=Math.floor(point),fraction=point-i;
    const a=env.values[i]||0,b=env.values[i+1]||0;
    const level=a+(b-a)*fraction;
    return level<.08?0:Math.min(1,Math.sqrt(level));
  }
  const api={at,active};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.StoryMouth=api;
})(typeof window==='undefined'?globalThis:window);
