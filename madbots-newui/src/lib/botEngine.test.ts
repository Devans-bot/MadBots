import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_BOTS } from '../data/bots';
import {
  CHAT_LOAD_DURATION_MS,
  calculateUnreadTotal,
  clampThinkingLevel,
  createCustomBot,
  filterBots,
  generateBotReply,
  getThinkingLevelMeta,
  shouldDismissSheet,
  validateNewBotInput,
} from './botEngine';

test('clampThinkingLevel keeps values within 0..3', () => {
  assert.equal(clampThinkingLevel(-2), 0);
  assert.equal(clampThinkingLevel(0), 0);
  assert.equal(clampThinkingLevel(2), 2);
  assert.equal(clampThinkingLevel(9), 3);
});

test('getThinkingLevelMeta returns distinct labels for engineering vs creative bots', () => {
  const engMax = getThinkingLevelMeta('engineering', 3);
  assert.equal(engMax.shortName, 'Max');
  assert.equal(engMax.percentage, '100%');
  assert.match(engMax.label, /Deep verification/);

  const creativeLow = getThinkingLevelMeta('creative', 0);
  assert.equal(creativeLow.shortName, 'Low');
  assert.equal(creativeLow.percentage, '8%');
  assert.match(creativeLow.label, /Rapid brainstorm/);
});

test('calculateUnreadTotal sums unread counts safely', () => {
  assert.equal(calculateUnreadTotal(INITIAL_BOTS), 4);
  assert.equal(calculateUnreadTotal([]), 0);
});

test('filterBots filters by query and category', () => {
  const onlyCreative = filterBots(INITIAL_BOTS, '', 'creative');
  assert.equal(onlyCreative.length, 1);
  assert.equal(onlyCreative[0].id, 'aura-creative');

  const byModel = filterBots(INITIAL_BOTS, 'gpt-4o', 'all');
  assert.equal(byModel.length, 1);
  assert.equal(byModel[0].id, 'nexus-codebot');

  const none = filterBots(INITIAL_BOTS, 'nonexistent-model', 'all');
  assert.equal(none.length, 0);
});

test('validateNewBotInput rejects empty/short inputs and accepts valid bot definitions', () => {
  assert.ok(
    validateNewBotInput({ name: 'A', model: 'GPT-4o', role: '', category: 'engineering' }),
  );
  assert.ok(
    validateNewBotInput({ name: 'Atlas Bot', model: '', role: '', category: 'engineering' }),
  );
  assert.equal(
    validateNewBotInput({
      name: 'Atlas Synth',
      model: 'Claude 3.7',
      role: 'API design partner',
      category: 'engineering',
    }),
    null,
  );
});

test('createCustomBot produces deterministic bot object with clean defaults', () => {
  const bot = createCustomBot(
    {
      name: 'Pulse Architect',
      model: 'o3-mini',
      role: '',
      category: 'engineering',
    },
    '12345678',
  );
  assert.equal(bot.id, 'pulse-architect-5678');
  assert.equal(bot.shortInitial, 'P');
  assert.equal(bot.accent, 'blue');
  assert.equal(bot.unreadCount, 0);
  assert.ok(bot.quickPrompts.length === 3);
});

test('generateBotReply selects specialized code, bullet, gallery, and note formats', () => {
  const nexus = INITIAL_BOTS[0];
  const aura = INITIAL_BOTS[1];

  const hashReply = generateBotReply(nexus, 'Add spatial hash grid', [], new Date(2026, 0, 1, 14, 40), 'id-1');
  assert.equal(hashReply.type, 'bot_code');
  assert.equal(hashReply.codeBlock.filename, 'spatial_hash.wgsl');

  const workgroupReply = generateBotReply(
    nexus,
    'Explain workgroup shared memory',
    [{ id: '1', name: 'particle_sim.wgsl', size: '4 KB', kind: 'code' }],
    new Date(2026, 0, 1, 14, 41),
    'id-2',
  );
  assert.equal(workgroupReply.type, 'bot_bullets');
  assert.match(workgroupReply.intro, /particle_sim\.wgsl/);

  const paletteReply = generateBotReply(
    aura,
    'Generate high-contrast palette',
    [],
    new Date(2026, 0, 1, 14, 42),
    'id-3',
  );
  assert.equal(paletteReply.type, 'bot_gallery');
  assert.equal(paletteReply.previews.length, 2);
});

test('chat load duration is 1.5 seconds and swipe dismissal respects offset & velocity', () => {
  assert.equal(CHAT_LOAD_DURATION_MS, 1500);
  assert.equal(shouldDismissSheet(110, 0), true);
  assert.equal(shouldDismissSheet(40, 500), true);
  assert.equal(shouldDismissSheet(40, 100), false);
  assert.equal(shouldDismissSheet(-20, 600), false);
});

