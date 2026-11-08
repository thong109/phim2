import sys,unittest,tempfile,wave
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'pipeline/scripts'))
from speech_sync import quotes_for_shots,normalize_dialogues,fragments,measured_tracks,envelope

class SpeechSyncTests(unittest.TestCase):
    def test_quotation_crosses_scene_without_turning_narration_into_speech(self):
        shots=[{'text':'Lan nói: “Con về'},{'text':'đi.” Minh đứng im.'}]
        spans=quotes_for_shots(shots)
        self.assertEqual(spans[0][0]['id'],spans[1][0]['id'])
        self.assertEqual(spans[1][0]['text'],'đi.”')
    def test_edit_before_quote_keeps_speaker_by_actual_text(self):
        p=[{'text':'Lan: “Về đi.”'}];normalize_dialogues(p,{'lan':{}});p[0]['dialogues'][0]['speaker']='lan'
        p[0]['text']='Ngoài hiên, Lan nói: “Về đi.”';normalize_dialogues(p,{'lan':{}})
        self.assertEqual(p[0]['dialogues'][0]['speaker'],'lan')
        self.assertEqual(''.join(p[0]['text'].split()),''.join(''.join(v['text'] for v in fragments(p[0])).split()))
    def test_tracks_use_measured_durations_not_character_lengths(self):
        parts=[{'text':'Narrator long text','speaker':None},{'text':'Ừ.','speaker':'lan'}]
        tracks=measured_tracks(parts,[.3,1.7]);self.assertEqual(tracks[1]['start'],.3);self.assertEqual(tracks[1]['end'],2)
    def test_waveform_closes_mouth_in_silence(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'audio.wav';rate=16000
            values=np.concatenate([np.zeros(rate//4),.3*np.sin(np.arange(rate//2)*2*np.pi*220/rate),np.zeros(rate//4)])
            with wave.open(str(path),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((values*32767).astype('<i2').tobytes())
            e=envelope(path);self.assertEqual(e['values'][:10],[0]*10);self.assertGreater(max(e['values']),.8);self.assertEqual(e['values'][-5:],[0]*5)

if __name__=='__main__':unittest.main()
