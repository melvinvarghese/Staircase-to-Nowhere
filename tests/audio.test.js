import test from 'node:test';
import assert from 'node:assert/strict';
import { Ambience } from '../js/audio.js';

class FakeAudioContext {
  static instances = [];

  constructor() {
    this.state = 'suspended';
    this.sampleRate = 1;
    this.destination = {};
    this.resumeRequests = [];
    this.suspendCalls = 0;
    this.closeCalls = 0;
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return { gain: { value: 0 }, connect() { return this; } };
  }

  createOscillator() {
    return {
      frequency: { value: 0 },
      connect() { return this; },
      start() {},
    };
  }

  createBuffer() {
    return { getChannelData: () => new Float32Array(1) };
  }

  createBufferSource() {
    return { connect() { return this; }, start() {} };
  }

  createBiquadFilter() {
    return { frequency: { value: 0 }, connect() { return this; } };
  }

  resume() {
    return new Promise((resolve) => {
      this.resumeRequests.push(() => {
        if (this.state !== 'closed') this.state = 'running';
        resolve();
      });
    });
  }

  suspend() {
    this.suspendCalls++;
    if (this.state !== 'closed') this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.closeCalls++;
    this.state = 'closed';
    return Promise.resolve();
  }
}

function setup() {
  FakeAudioContext.instances = [];
  globalThis.window = { AudioContext: FakeAudioContext };
  return new Ambience();
}

async function waitForResume(context, count = 1) {
  for (let i = 0; i < 10 && context.resumeRequests.length < count; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(context.resumeRequests.length, count, 'expected resume request');
}

test('pausing before delayed resume settles leaves the context suspended', async () => {
  const ambience = setup();
  const enabling = ambience.set(true, true);
  await waitForResume(FakeAudioContext.instances[0]);
  const context = FakeAudioContext.instances[0];

  await ambience.set(true, false);
  context.resumeRequests[0]();
  await enabling;

  assert.equal(context.state, 'suspended');
  assert.ok(context.suspendCalls >= 2, 'pause and post-resume reconciliation suspend');
});

test('muting before delayed resume settles leaves the context suspended', async () => {
  const ambience = setup();
  const enabling = ambience.set(true, true);
  await waitForResume(FakeAudioContext.instances[0]);
  const context = FakeAudioContext.instances[0];

  await ambience.set(false, true);
  context.resumeRequests[0]();
  await enabling;

  assert.equal(context.state, 'suspended');
  assert.ok(context.suspendCalls >= 2, 'mute and post-resume reconciliation suspend');
});

test('rapid pause then resume settles in the latest desired active state', async () => {
  const ambience = setup();
  const enabling = ambience.set(true, true);
  await waitForResume(FakeAudioContext.instances[0]);
  const context = FakeAudioContext.instances[0];

  await ambience.set(true, false);
  const resuming = ambience.set(true, true);
  await waitForResume(context, 2);
  context.resumeRequests[0]();
  context.resumeRequests[1]();
  await Promise.all([enabling, resuming]);

  assert.equal(context.state, 'running');
});

test('disposing during a pending resume does not operate on the closed context', async () => {
  const ambience = setup();
  const enabling = ambience.set(true, true);
  await waitForResume(FakeAudioContext.instances[0]);
  const context = FakeAudioContext.instances[0];

  ambience.dispose();
  context.resumeRequests[0]();
  await enabling;

  assert.equal(context.state, 'closed');
  assert.equal(context.suspendCalls, 0);
  assert.equal(ambience.context, null);
});
