// Crimson Tide Bay — radio: four stations and the rolling ticker line
// the HUD shows — part traffic, part weather, part gossip.

export const STATIONS = [
  { id: 'mango',  name: 'Radio Mango 98.6',  tag: 'Guava Sunrise',   bpm: 96,  root: 196.0 },
  { id: 'tide',   name: 'Tide FM 101.3',     tag: 'Slow Jams',       bpm: 72,  root: 146.8 },
  { id: 'neon',   name: 'Neón Nocturna 104.9', tag: 'Synth y Sudor', bpm: 118, root: 220.0 },
  { id: 'voces',  name: 'Voces del Puerto 89.1', tag: 'Talk & Salsa', bpm: 104, root: 174.6 },
];

const TICKER_LINES = [
  'Traffic: roadblock reported on the coast road — Bay PD out in force tonight',
  'Weather: golden hour all evening, 29°, sea like glass off Costa Dorada',
  'Harbour: the ferry to Isla Ceniza is running twenty minutes late',
  'Bay PD reminds drivers that street racing on the Paseo is, quote, "not a vibe"',
  'Market: lobster up, tempers down at Mercado Alto after the regatta',
  'Missing: one lighthouse keeper, last seen arguing with the tide at Faro Quemado',
  'Sport: the Palmera Marlinas win again — the bay is singing',
  'Notice: Tideworks Garage offers free resprays to anyone the PD is describing on air',
];

export function stationByIndex(i) {
  return STATIONS[((i % STATIONS.length) + STATIONS.length) % STATIONS.length];
}

// Short variants for staged captures: nothing cut off mid-word.
const SHORT_TICKER_LINES = [
  'Traffic: roadblock on the coast road',
  'Weather: golden hour, 29°, sea like glass',
  'Harbour: the Ceniza ferry runs late',
  'Bay PD: street racing is "not a vibe"',
  'Market: lobster up, tempers down',
  'Missing: one lighthouse keeper',
  'Sport: the Palmera Marlinas win again',
  'Notice: free resprays at Tideworks',
];

// Lines rotate every ~14 seconds.
export function tickerText(time, short = false) {
  const lines = short ? SHORT_TICKER_LINES : TICKER_LINES;
  return lines[Math.floor(time / 14) % lines.length];
}
