import type { ChatMessage } from '../types';

export const INITIAL_CONVERSATIONS: Record<string, ChatMessage[]> = {
  'nexus-codebot': [
    {
      id: 'nx-1',
      type: 'divider',
      text: 'Today, 14:28',
    },
    {
      id: 'nx-2',
      type: 'user',
      text: 'How do I structure an ultra-fast WebGPU compute shader pipeline for real-time particle simulation with collision detection?',
      timestamp: '14:28',
    },
    {
      id: 'nx-3',
      type: 'bot_code',
      summary:
        'Here is the ideal architecture for 60fps mobile WebGPU compute! ⚡ Use a ping-pong storage buffer setup paired with a uniform grid spatial hash to evaluate proximity in O(N) time.',
      highlights: [
        { phrase: 'ping-pong storage buffer', tone: 'blue' },
        { phrase: 'O(N)', tone: 'pink' },
      ],
      codeBlock: {
        filename: 'particle_sim.wgsl',
        language: 'WGSL',
        diffBefore: `@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;

@compute @workgroup_size(32)
fn main(@builtin(global_invocation_id) id : vec3u) {
  let i = id.x;
  particles[i].pos += particles[i].vel * 0.016;
}`,
        code: `// Ping-pong compute pass
@group(0) @binding(0) var<storage, read> src : array<Particle>;
@group(0) @binding(1) var<storage, read_write> dst : array<Particle>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id : vec3u) {
  let i = id.x;
  if (i >= arrayLength(&src)) { return; }
  var p = src[i];
  p.pos += p.vel * simParams.dt;
  dst[i] = p;
}`,
        diffApplied: false,
      },
      timestamp: '14:28',
    },
    {
      id: 'nx-4',
      type: 'user',
      text: 'What workgroup size do you recommend for Apple Silicon & Snapdragon mobile GPUs, and when should I trigger workgroupBarrier()?',
      timestamp: '14:30',
    },
    {
      id: 'nx-5',
      type: 'bot_note',
      text: 'For maximum wave occupancy across both Mali and Adreno/Apple GPUs, use workgroup_size(64, 1, 1). Only invoke workgroupBarrier() when sharing neighbour tile indexes in var<workgroup> memory.',
      noteTitle: 'Hardware note:',
      noteDesc:
        '64 threads align with Qualcomm Adreno wave sizes and prevent idle SIMD lanes. Keeps dispatch latency under 0.4ms for 50,000 live particles.',
      timestamp: '14:30',
    },
    {
      id: 'nx-6',
      type: 'user',
      text: 'Can we optimize the buffer binding layout to reduce pipeline switches during render passes?',
      timestamp: '14:32',
    },
    {
      id: 'nx-7',
      type: 'bot_bullets',
      intro:
        'Yes! You can eliminate up to 70% of draw-call overhead by segregating frequency of change into distinct bind groups:',
      points: [
        {
          title: 'Group 0 (Per-Frame):',
          desc: 'Global view-projection & delta time uniforms. Bound once per frame.',
        },
        {
          title: 'Group 1 (Per-Pass):',
          desc: 'Particle compute buffers (ping-pong targets).',
        },
        {
          title: 'Dynamic Offsets:',
          desc: 'Pack simulation params into one large uniform ring buffer with hasDynamicOffset: true instead of re-binding layout descriptors.',
        },
      ],
      timestamp: '14:32',
    },
    {
      id: 'nx-8',
      type: 'user',
      text: 'Awesome! What about fallback support for devices without subgroup operations?',
      timestamp: '14:34',
    },
    {
      id: 'nx-9',
      type: 'bot_note',
      text: "For older Vulkan/Metal devices where subgroups isn't available in adapter features, emulate parallel reductions with a classical tree reduction using var<workgroup> shared array:",
      noteTitle: 'Fallback Pattern:',
      noteDesc:
        'Perform log2 stride steps with workgroupBarrier(). On workgroup size 64, this takes only 6 barrier synchronization rounds—costing negligible milliseconds while preserving 100% device compatibility.',
      timestamp: '14:34',
    },
  ],
  'aura-creative': [
    {
      id: 'au-1',
      type: 'divider',
      text: 'Today, 14:21',
    },
    {
      id: 'au-2',
      type: 'user',
      text: 'Can you render 4 neo-brutalist mixtape deck cover directions with punchy typography and crisp print margins?',
      timestamp: '14:21',
    },
    {
      id: 'au-3',
      type: 'bot_gallery',
      intro:
        'Rendered 4 neo-brutalist cover directions built on an 8px Swiss poster grid with bold ink contrast and clean sleeve bleed marks:',
      previews: [
        {
          title: '01. Signal Static',
          palette: ['#18181b', '#f4f4f5', '#ff2b85'],
          ratio: '1:1 Vinyl',
          note: 'Oversized condensed numerals with halftone grain.',
        },
        {
          title: '02. Cobalt Drift',
          palette: ['#0f172a', '#e2e8f0', '#0066ff'],
          ratio: '1:1 Vinyl',
          note: 'Asymmetric grid lines and matte blue ink stamp.',
        },
        {
          title: '03. Tape Archive',
          palette: ['#fafaf9', '#27272a', '#f59e0b'],
          ratio: 'Cassette J-Card',
          note: 'Monospace tracklist ledger with warm paper stock.',
        },
        {
          title: '04. Night Freq',
          palette: ['#111315', '#2b2f38', '#10b981'],
          ratio: '1:1 Digital',
          note: 'Deep charcoal shell with crisp geometric waveform.',
        },
      ],
      timestamp: '14:22',
    },
    {
      id: 'au-4',
      type: 'user',
      text: 'Love Signal Static and Cobalt Drift. How should we structure the print export tokens?',
      timestamp: '14:24',
    },
    {
      id: 'au-5',
      type: 'bot_bullets',
      intro:
        'Here is a production-ready spec sheet for both digital streaming and 12-inch sleeve press runs:',
      points: [
        {
          title: 'Bleed & Trim:',
          desc: '315mm × 315mm outer canvas with 3mm full-bleed safe margin and 12mm optical spine offset.',
        },
        {
          title: 'Ink Separation:',
          desc: 'Keep charcoal base at rich black (C40 M30 Y30 K100) and assign spot Pantone for the magenta asterisk mark.',
        },
        {
          title: 'Type Floor:',
          desc: 'Minimum 7.5pt JetBrains Mono for liner credits to stay razor-sharp on uncoated 300gsm board.',
        },
      ],
      timestamp: '14:24',
    },
  ],
};
