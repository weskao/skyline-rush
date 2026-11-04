import test from 'node:test';
import assert from 'node:assert/strict';
import * as hazards from '../src/courses/volcanic-crown-obstacles.ts';

const sample = (s, lateral, altitude, timeSeconds) => ({ s, lateral, altitude, timeSeconds });

// A regression for high-speed cars crossing a visible hazard between frame endpoints.
test('Volcanic swept collision sees a boulder skipped by endpoint-only contacts', () => {
  assert.equal(typeof hazards.volcanicObstacleSweptContact, 'function');
  const rock = hazards.VOLCANIC_OBSTACLES.find(item => item.kind === 'boulder');
  const before = sample(rock.s - 18, rock.lateral, 0, 5);
  const after = sample(rock.s + 18, rock.lateral, 0, 5.12);
  assert.equal(hazards.volcanicObstacleContact(rock.edgeId, before.s, before.lateral, 0, 5), null);
  assert.equal(hazards.volcanicObstacleContact(rock.edgeId, after.s, after.lateral, 0, 5.12), null);
  assert.equal(hazards.volcanicObstacleSweptContact(rock.edgeId, before, after)?.id, rock.id);
  assert.equal(hazards.volcanicObstacleSweptContact('gorge-flight', before, after), null);
  assert.equal(hazards.volcanicObstacleSweptContact(rock.edgeId,
    sample(before.s, before.lateral, 70, 5), sample(after.s, after.lateral, 70, 5.12)), null);
});

test('Volcanic timed rockfall sweep respects the shared warning, impact and clear phases', () => {
  assert.equal(typeof hazards.volcanicObstacleSweptContact, 'function');
  const rock = hazards.VOLCANIC_OBSTACLES.find(item => item.kind === 'rockfall');
  const sweepAt = (t) => hazards.volcanicObstacleSweptContact(rock.edgeId,
    sample(rock.s - 16, rock.lateral, 0, t),
    sample(rock.s + 16, rock.lateral, 0, t + 0.08));
  assert.equal(sweepAt(1), null, 'warning alone is not a physical impact');
  assert.equal(sweepAt(5.5)?.id, rock.id);
  assert.equal(sweepAt(8), null);
  assert.equal(sweepAt(17.5)?.id, rock.id, '12s clock repeats exactly');
});

test('Volcanic crossing remains detectable with 30/60/120 Hz slices', () => {
  assert.equal(typeof hazards.volcanicObstacleSweptContact, 'function');
  const rock = hazards.VOLCANIC_OBSTACLES.find(item => item.kind === 'boulder');
  for (const hz of [30, 60, 120]) {
    let hit = null;
    for (let i = 0; i < hz; i++) {
      const s0 = rock.s - 42 + 84 * i / hz;
      const s1 = rock.s - 42 + 84 * (i + 1) / hz;
      hit ||= hazards.volcanicObstacleSweptContact(rock.edgeId,
        sample(s0, rock.lateral, 0, 5 + i / hz),
        sample(s1, rock.lateral, 0, 5 + (i + 1) / hz));
    }
    assert.equal(hit?.id, rock.id, `${hz} Hz swept pass must hit`);
  }
});

test('Volcanic swept collision catches cross-lane hazards at 30/60/120 Hz', () => {
  // A one-frame sideways slide can cross a real fissure while both endpoint
  // poses are safe; sweep density must follow world motion, not just distance.
  const fissure = hazards.VOLCANIC_OBSTACLES.find(item => item.id === 'crack-01');
  for (const hz of [30, 60, 120]) {
    const from = sample(fissure.s, -11, 0, 5);
    const to = sample(fissure.s, 16, 0, 5 + 1 / hz);
    assert.equal(hazards.volcanicObstacleContact(fissure.edgeId,
      from.s, from.lateral, from.altitude, from.timeSeconds), null);
    assert.equal(hazards.volcanicObstacleContact(fissure.edgeId,
      to.s, to.lateral, to.altitude, to.timeSeconds), null);
    assert.equal(hazards.volcanicObstacleSweptContact(fissure.edgeId, from, to)?.id,
      fissure.id, `${hz} Hz lateral tunnelling`);
    assert.equal(hazards.volcanicObstacleSweptContact('ground-4', from, to), null,
      'a different road layer must never inherit a local hazard');
  }
});
