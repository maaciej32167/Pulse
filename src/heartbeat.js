import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const SAMPLE_RATE = 22050;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(u8) {
  let out = '';
  const n = u8.length;
  for (let i = 0; i < n; i += 3) {
    const b0 = u8[i], b1 = i+1<n ? u8[i+1] : 0, b2 = i+2<n ? u8[i+2] : 0;
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i+1<n ? BASE64_CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] : '=';
    out += i+2<n ? BASE64_CHARS[b2 & 0x3f] : '=';
  }
  return out;
}

function buildWav(samples) {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const ws = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  ws(0,'RIFF'); v.setUint32(4, 36+dataLen, true); ws(8,'WAVE');
  ws(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,SAMPLE_RATE,true); v.setUint32(28,SAMPLE_RATE*2,true);
  v.setUint16(32,2,true); v.setUint16(34,16,true);
  ws(36,'data'); v.setUint32(40,dataLen,true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44+i*2, s < 0 ? s*0x8000 : s*0x7fff, true);
  }
  return new Uint8Array(buf);
}

// beat2StartT — odstęp do drugiego uderzenia (s)
// silence    — cicha przerwa na początku pliku (zapobiega klikowi)
function generateHeartbeatSamples(beat2StartT = 0.13, silence = 0.015) {
  const b2 = beat2StartT + silence;
  const totalDuration = b2 + 0.70; // +700ms na zanik i pogłos
  const n   = Math.floor(SAMPLE_RATE * totalDuration);
  const dry = new Float32Array(n);

  const FADE_IN  = Math.floor(0.008 * SAMPLE_RATE); // 8ms fade-in
  const FADE_OUT = Math.floor(0.030 * SAMPLE_RATE); // 30ms fade-out

  // freqs = [[freq, amp], ...]
  function addBeat(startT, duration, amplitude, freqs, decayFactor) {
    const start = Math.floor(startT * SAMPLE_RATE);
    const len   = Math.floor(duration * SAMPLE_RATE);
    const decay = duration * decayFactor;
    for (let i = 0; i < len && start+i < n; i++) {
      const t     = i / SAMPLE_RATE;
      const fadeI = i < FADE_IN  ? i / FADE_IN  : 1;
      const fadeO = i > len-FADE_OUT ? (len-i) / FADE_OUT : 1;
      const env   = amplitude * Math.exp(-t / decay) * fadeI * fadeO;
      let sig = 0;
      for (const [freq, amp] of freqs) sig += Math.sin(2*Math.PI*freq*t) * amp;
      dry[start+i] += sig * env;
    }
  }

  // S1 "lub" — niski, okrągły, dłuższy (domknięcie zastawek mitralnej i trójdzielnej)
  addBeat(silence, 0.18, 1.00, [
    [48,  0.30],  // sub-bass
    [72,  0.38],  // główna nuta ciała
    [105, 0.18],  // pierwsza harmoniczna
    [155, 0.09],  // druga harmoniczna
    [36,  0.05],  // głęboki pogłos klatki
  ], 0.30);

  // S2 "dub" — krótki, ostrzejszy (dźwięk 1)
  addBeat(b2, 0.13, 0.82, [
    [88,  0.42],
    [125, 0.30],
    [170, 0.16],
    [210, 0.07],
    [62,  0.05],
  ], 0.22);

  // ── Pogłos (rezonans klatki piersiowej) ──────────────────────────────────────
  // Wczesne odbicia + krótki ogon
  const REVERB = [
    { d: Math.floor(0.010 * SAMPLE_RATE), g: 0.28 },
    { d: Math.floor(0.020 * SAMPLE_RATE), g: 0.18 },
    { d: Math.floor(0.034 * SAMPLE_RATE), g: 0.11 },
    { d: Math.floor(0.052 * SAMPLE_RATE), g: 0.07 },
    { d: Math.floor(0.078 * SAMPLE_RATE), g: 0.04 },
    { d: Math.floor(0.115 * SAMPLE_RATE), g: 0.02 },
  ];
  const rev = new Float32Array(n);
  for (const { d, g } of REVERB) {
    for (let i = d; i < n; i++) rev[i] += dry[i-d] * g;
  }

  // Mix dry + reverb
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = dry[i] + rev[i] * 0.45;

  // Normalizacja
  let peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
  if (peak > 0.001) for (let i = 0; i < n; i++) out[i] = (out[i]/peak) * 0.95;

  // Globalny fade-out ostatnie 40ms
  const GFADE = Math.floor(0.040 * SAMPLE_RATE);
  for (let i = 0; i < GFADE; i++) out[n-1-i] *= i / GFADE;

  return out;
}

async function writeAndCache(filename, samples) {
  const wav = buildWav(samples);
  const b64 = toBase64(wav);
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: 'base64' });
  return uri;
}

// ── Home screen heartbeat (zsynchronizowany z animacją kuli) ─────────────────
let _homeSound = null;

export async function initHomeHeartbeat() {
  try {
    const uri = await writeAndCache('pulse_hb_home.wav', generateHeartbeatSamples(0.25));
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    _homeSound = sound;
  } catch (e) { console.error('[HB] init error:', e); }
}

export async function replayHomeHeartbeat() {
  try {
    if (!_homeSound) return;
    await _homeSound.replayAsync();
  } catch (e) { console.error('[HB] replay error:', e); }
}

export async function unloadHomeHeartbeat() {
  try {
    if (_homeSound) { await _homeSound.unloadAsync(); _homeSound = null; }
  } catch (_) {}
}
