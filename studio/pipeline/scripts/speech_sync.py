"""Measured TTS phrase boundaries and waveform-driven mouth movement."""
import io,math,wave
import numpy as np

def quotes_for_shots(shots):
    """Keep one quote ID even when a quotation spans multiple shots."""
    result=[];opened=False;counter=0;quote_id=None
    for shot in shots:
        text=shot['text'];start=0 if opened else None;spans=[]
        for i,char in enumerate(text):
            if char=='\u201c' or (char=='"' and not opened):
                if opened:continue
                opened=True;counter+=1;quote_id=f'q{counter:04d}';start=i
            elif char=='\u201d' or (char=='"' and opened):
                if opened:
                    spans.append({'id':quote_id,'start':start,'end':i+1,'text':text[start:i+1]});opened=False;start=None
        if opened and start is not None and start<len(text):spans.append({'id':quote_id,'start':start,'end':len(text),'text':text[start:]})
        result.append(spans)
    return result

def normalize_dialogues(shots,cast):
    all_spans=quotes_for_shots(shots)
    for shot,spans in zip(shots,all_spans):
        old=shot.get('dialogues',[]);out=[]
        if not isinstance(old,list) or any(not isinstance(v,dict) for v in old):raise ValueError('Invalid dialogue assignment list.')
        for span in spans:
            match=next((v for v in old if v.get('text')==span['text'] and v.get('id')==span['id']),None)
            if match is None:match=next((v for v in old if v.get('text')==span['text']),{})
            who=match.get('speaker')
            if who in [None,'','offscreen','narrator']:who=None
            elif who not in cast:raise ValueError('Unknown dialogue speaker: '+str(who))
            out.append({**span,'speaker':who})
        shot['dialogues']=out
    return shots

def fragments(shot):
    text=shot['text'];cursor=0;out=[]
    for d in sorted(shot.get('dialogues',[]),key=lambda v:v['start']):
        start,end=d['start'],d['end']
        if not isinstance(start,int) or not isinstance(end,int) or not cursor<=start<end<=len(text):raise ValueError('Invalid dialogue text span.')
        if d.get('text')!=text[start:end]:raise ValueError('Dialogue text no longer matches narration.')
        if start>cursor and text[cursor:start].strip():out.append({'text':text[cursor:start],'speaker':None})
        out.append({'text':text[start:end],'speaker':d.get('speaker')});cursor=end
    if cursor<len(text) and text[cursor:].strip():out.append({'text':text[cursor:],'speaker':None})
    if not out:out=[{'text':text,'speaker':None}]
    if ''.join(text.split())!=''.join(''.join(v['text'] for v in out).split()):raise ValueError('Speech segmentation changed source narration.')
    return out

def render_fragments(voice,parts,config):
    data=[];durations=[];params=None
    for part in parts:
        buf=io.BytesIO()
        with wave.open(buf,'wb') as output:voice.synthesize_wav(part['text'],output,syn_config=config)
        with wave.open(io.BytesIO(buf.getvalue()),'rb') as wav:
            fmt=(wav.getnchannels(),wav.getsampwidth(),wav.getframerate())
            if params is not None and params!=fmt:raise ValueError('Speech fragments use inconsistent sample formats.')
            params=fmt;durations.append(wav.getnframes()/wav.getframerate());data.append(wav.readframes(wav.getnframes()))
    return params,b''.join(data),durations

def envelope(file,hz=50):
    with wave.open(str(file),'rb') as wav:
        if wav.getsampwidth()!=2:raise ValueError('Mouth analysis expects 16-bit PCM.')
        samples=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float32)/32768
        if wav.getnchannels()>1:samples=samples.reshape(-1,wav.getnchannels()).mean(axis=1)
        rate=wav.getframerate()
    window=max(1,round(rate/hz));values=[]
    for i in range(0,len(samples),window):values.append(float(np.sqrt(np.mean(samples[i:i+window]**2))))
    reference=max(.01,float(np.percentile(values,95))) if values else .01
    floor=max(.003,reference*.1);last=0;out=[]
    for value in values:
        level=max(0,min(1,(value-floor)/max(.01,reference-floor)))
        last=max(level,last*.35);out.append(round(last if last>=.07 else 0,3))
    return {'hz':rate/window,'values':out}

def measured_tracks(parts,durations):
    if len(parts)!=len(durations):raise ValueError('Missing measured speech fragment durations.')
    out=[];cursor=0
    for part,duration in zip(parts,durations):
        out.append({'start':round(cursor,6),'end':round(cursor+duration,6),'speaker':part.get('speaker'),'text':part['text']});cursor+=duration
    return out
