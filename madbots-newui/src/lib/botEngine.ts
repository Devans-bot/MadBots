import type {
  BotAgent,
  BotCategory,
  ChatMessage,
  MessageAttachment,
  ThinkingLevel,
} from '../types';

export const CHAT_LOAD_DURATION_MS = 1500;

export function shouldDismissSheet(
  offsetY: number,
  velocityY: number,
  thresholdPx: number = 90,
  velocityThreshold: number = 420,
): boolean {
  return offsetY > thresholdPx || (offsetY > 24 && velocityY > velocityThreshold);
}

export interface ThinkingLevelMeta {
  level: ThinkingLevel;
  shortName: 'Low' | 'Medium' | 'High' | 'Max';
  label: string;
  percentage: string;
  estimatedLatencyMs: number;
  responseDelayMs: number;
}

const ENGINEERING_LEVELS: readonly ThinkingLevelMeta[] = [
  {
    level: 0,
    shortName: 'Low',
    label: 'Low • Fast 250ms draft',
    percentage: '8%',
    estimatedLatencyMs: 110,
    responseDelayMs: 320,
  },
  {
    level: 1,
    shortName: 'Medium',
    label: 'Medium • Standard context',
    percentage: '45%',
    estimatedLatencyMs: 150,
    responseDelayMs: 460,
  },
  {
    level: 2,
    shortName: 'High',
    label: 'High • Extended reasoning',
    percentage: '75%',
    estimatedLatencyMs: 180,
    responseDelayMs: 620,
  },
  {
    level: 3,
    shortName: 'Max',
    label: 'Max • Deep verification (64k)',
    percentage: '100%',
    estimatedLatencyMs: 260,
    responseDelayMs: 780,
  },
];

const CREATIVE_LEVELS: readonly ThinkingLevelMeta[] = [
  {
    level: 0,
    shortName: 'Low',
    label: 'Low • Rapid brainstorm',
    percentage: '8%',
    estimatedLatencyMs: 210,
    responseDelayMs: 320,
  },
  {
    level: 1,
    shortName: 'Medium',
    label: 'Medium • Balanced speed',
    percentage: '45%',
    estimatedLatencyMs: 320,
    responseDelayMs: 460,
  },
  {
    level: 2,
    shortName: 'High',
    label: 'High • Rich artistic detail',
    percentage: '75%',
    estimatedLatencyMs: 440,
    responseDelayMs: 620,
  },
  {
    level: 3,
    shortName: 'Max',
    label: 'Max • Cinematic quality (FLUX Pro)',
    percentage: '100%',
    estimatedLatencyMs: 590,
    responseDelayMs: 780,
  },
];

export function clampThinkingLevel(value: number): ThinkingLevel {
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  return 3;
}

export function getThinkingLevelsForCategory(
  category: BotCategory,
): readonly ThinkingLevelMeta[] {
  return category === 'engineering' ? ENGINEERING_LEVELS : CREATIVE_LEVELS;
}

export function getThinkingLevelMeta(
  category: BotCategory,
  level: number,
): ThinkingLevelMeta {
  const safe = clampThinkingLevel(level);
  const table = getThinkingLevelsForCategory(category);
  return table[safe];
}

export function formatClockTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function calculateUnreadTotal(bots: readonly BotAgent[]): number {
  return bots.reduce((sum, bot) => sum + Math.max(0, bot.unreadCount), 0);
}

export function filterBots(
  bots: readonly BotAgent[],
  query: string,
  categoryFilter: 'all' | BotCategory = 'all',
): BotAgent[] {
  const trimmed = query.trim().toLowerCase();
  return bots.filter((bot) => {
    if (categoryFilter !== 'all' && bot.category !== categoryFilter) {
      return false;
    }
    if (!trimmed) return true;
    return (
      bot.name.toLowerCase().includes(trimmed) ||
      bot.model.toLowerCase().includes(trimmed) ||
      bot.role.toLowerCase().includes(trimmed) ||
      bot.lastMessage.toLowerCase().includes(trimmed) ||
      bot.capabilityLabel.toLowerCase().includes(trimmed)
    );
  });
}

export interface CreateBotInput {
  name: string;
  model: string;
  role: string;
  category: BotCategory;
}

export function validateNewBotInput(input: CreateBotInput): string | null {
  const name = input.name.trim();
  const model = input.model.trim();
  if (name.length < 2) {
    return 'Bot name must be at least 2 characters.';
  }
  if (name.length > 36) {
    return 'Bot name must be 36 characters or fewer.';
  }
  if (model.length < 2) {
    return 'Model label is required (e.g. GPT-4o, Claude 3.7, FLUX.1).';
  }
  return null;
}

export function createCustomBot(
  input: CreateBotInput,
  nowId: string = String(Date.now()),
): BotAgent {
  const cleanName = input.name.trim();
  const cleanModel = input.model.trim();
  const cleanRole =
    input.role.trim() ||
    (input.category === 'engineering'
      ? 'Custom prototyping & architecture agent'
      : 'Custom concept & visual direction agent');
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const isEngineering = input.category === 'engineering';
  return {
    id: `${slug || 'bot'}-${nowId.slice(-4)}`,
    name: cleanName,
    shortInitial: cleanName.charAt(0).toUpperCase() || 'M',
    model: cleanModel,
    role: cleanRole,
    tierLabel: 'Custom',
    category: input.category,
    accent: isEngineering ? 'blue' : 'pink',
    status: 'online',
    lastUpdated: 'Just now',
    lastMessage: `Ready to prototype with ${cleanModel}. Ask me anything to start.`,
    capabilityLabel: isEngineering ? 'Prototype' : 'Concepts',
    capabilityIcon: isEngineering ? 'code' : 'sparkles',
    latencyMs: isEngineering ? 150 : 280,
    unreadCount: 0,
    thinkingLevel: 1,
    quickPrompts: isEngineering
      ? [
          'Draft system architecture',
          'Write typed state reducer',
          'Audit performance bottlenecks',
        ]
      : [
          'Propose 3 visual directions',
          'Build color & type tokens',
          'Outline responsive layout',
        ],
    avatarVariant: 'custom',
  };
}

export function generateBotReply(
  bot: BotAgent,
  prompt: string,
  attachments: readonly MessageAttachment[] = [],
  now: Date = new Date(),
  idSeed: string = `msg-${Date.now()}`,
): ChatMessage {
  const lower = prompt.toLowerCase();
  const timestamp = formatClockTime(now);
  const meta = getThinkingLevelMeta(bot.category, bot.thinkingLevel);
  const attachmentSuffix =
    attachments.length > 0
      ? ` Analyzed ${attachments.map((a) => a.name).join(', ')} in context.`
      : '';

  if (lower.includes('spatial hash') || lower.includes('grid')) {
    return {
      id: idSeed,
      type: 'bot_code',
      summary: `Here is a lock-free spatial hash grid pass tuned for ${meta.shortName} thinking (${meta.estimatedLatencyMs}ms target).${attachmentSuffix}`,
      highlights: [
        { phrase: 'spatial hash grid', tone: 'blue' },
        { phrase: `${meta.shortName} thinking`, tone: 'pink' },
      ],
      codeBlock: {
        filename: 'spatial_hash.wgsl',
        language: 'WGSL',
        diffBefore: `fn cellHash(pos: vec3f) -> u32 {
  return u32(pos.x) + u32(pos.y) * 64u;
}`,
        code: `// Spatial hash cell key with prime mixing
fn cellCoord(pos: vec3f, cellSize: f32) -> vec3i {
  return vec3i(floor(pos / cellSize));
}

fn cellHash(c: vec3i, tableMask: u32) -> u32 {
  let h = u32(c.x) * 73856093u ^ u32(c.y) * 19349663u ^ u32(c.z) * 83492791u;
  return h & tableMask;
}`,
        diffApplied: false,
      },
      timestamp,
    };
  }

  if (lower.includes('render pipeline') || lower.includes('code') || lower.includes('shader')) {
    return {
      id: idSeed,
      type: 'bot_code',
      summary: `Constructed an instanced render pipeline descriptor using zero-copy storage buffer bindings.${attachmentSuffix}`,
      highlights: [
        { phrase: 'instanced render pipeline', tone: 'blue' },
        { phrase: 'zero-copy storage buffer', tone: 'pink' },
      ],
      codeBlock: {
        filename: 'render_pipeline.ts',
        language: 'TS',
        diffBefore: `const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module: shaderModule, entryPoint: 'vs' },
});`,
        code: `export function createParticleRenderPipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  shaderModule: GPUShaderModule
) {
  return device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vs_main' },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-strip' },
  });
}`,
        diffApplied: false,
      },
      timestamp,
    };
  }

  if (lower.includes('workgroup') || lower.includes('shared memory')) {
    return {
      id: idSeed,
      type: 'bot_bullets',
      intro: `Workgroup shared memory (var<workgroup>) keeps tile neighbors inside on-chip SRAM instead of slow global VRAM:${attachmentSuffix}`,
      points: [
        {
          title: '1. Cooperative Load:',
          desc: 'Each thread copies one particle tile into var<workgroup> sharedTile[64] before calling workgroupBarrier().',
        },
        {
          title: '2. Bank-Conflict Free Reads:',
          desc: 'Pad vec3f structs to 16-byte vec4f alignment so consecutive lanes hit distinct SRAM memory banks.',
        },
        {
          title: `3. ${meta.shortName} Mode Budget:`,
          desc: `Keeps workgroup memory under 16 KB per dispatch for ~${meta.estimatedLatencyMs}ms total frame turnaround.`,
        },
      ],
      timestamp,
    };
  }

  if (
    bot.category === 'creative' &&
    (lower.includes('palette') || lower.includes('color') || lower.includes('cover'))
  ) {
    return {
      id: idSeed,
      type: 'bot_gallery',
      intro: `Generated 2 fresh high-contrast visual studies at ${meta.shortName} fidelity (${meta.label}):${attachmentSuffix}`,
      previews: [
        {
          title: 'A. Kinetic Ink',
          palette: ['#141618', '#ffffff', '#0066ff'],
          ratio: '1:1 Editorial',
          note: 'Crisp monochrome framing with electric blue typographic accent.',
        },
        {
          title: 'B. Magenta Pulse',
          palette: ['#f9f9f8', '#1a1c1c', '#ff2b85'],
          ratio: '4:5 Poster',
          note: 'Asymmetric Swiss grid with tactile paper texture and bold numeral anchor.',
        },
      ],
      timestamp,
    };
  }

  if (bot.category === 'creative') {
    return {
      id: idSeed,
      type: 'bot_bullets',
      intro: `Refined creative direction for "${prompt}" at ${meta.shortName} detail:${attachmentSuffix}`,
      points: [
        {
          title: 'Visual Hierarchy:',
          desc: 'Anchor the top left with oversized display typography and balance negative space with hairline dividers.',
        },
        {
          title: 'Surface Contrast:',
          desc: 'Pair crisp neutral paper surfaces (#F9F9F8) with a single high-intent accent rather than competing glows.',
        },
        {
          title: 'Export Readiness:',
          desc: `Configured with ${meta.label} — ready for both responsive web previews and 300 DPI print sleeves.`,
        },
      ],
      timestamp,
    };
  }

  return {
    id: idSeed,
    type: 'bot_note',
    text: `Processed "${prompt}" using ${bot.name} (${bot.model}) at ${meta.shortName} thinking depth.${attachmentSuffix}`,
    noteTitle: 'Execution Insight:',
    noteDesc: `Active profile: ${meta.label}. Estimated pipeline latency ${meta.estimatedLatencyMs}ms with deterministic state synchronization.`,
    timestamp,
  };
}
