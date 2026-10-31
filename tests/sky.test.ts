import test from 'node:test';
import assert from 'node:assert/strict';
import { moonPhase, moonPhaseName, scene, sunPosition, weatherFromCode } from '../lib/sky.ts';
import { parseOpenMeteo } from '../lib/weather.ts';

test('slnko nad Košicami: poludnie vysoko, polnoc pod obzorom', () => {
  const noon = sunPosition(Date.parse('2026-06-21T10:50:00Z'));
  assert.ok(noon.alt > 60 && noon.alt < 67, `výška ${noon.alt}`);
  assert.ok(Math.abs(noon.az) < 15);
  assert.ok(sunPosition(Date.parse('2026-06-21T22:50:00Z')).alt < -10);
  assert.equal(scene(Date.parse('2026-10-31T11:00:00Z')).phase, 'day');
  assert.equal(scene(Date.parse('2026-10-31T21:00:00Z')).phase, 'night');
});

test('fáza mesiaca: spln 2026-10-26, nov 2026-11-09', () => {
  assert.equal(moonPhaseName(moonPhase(Date.parse('2026-10-26T06:00:00Z')).phase), 'spln');
  assert.ok(moonPhase(Date.parse('2026-10-26T06:00:00Z')).fraction > 0.97);
  assert.ok(moonPhase(Date.parse('2026-11-09T08:00:00Z')).fraction < 0.03);
});

test('WMO kódy počasia', () => {
  assert.equal(weatherFromCode({ code: 63 }).precip, 'rain');
  assert.equal(weatherFromCode({ code: 75 }).precip, 'snow');
  assert.equal(weatherFromCode({ code: 75 }).intensity, 3);
  assert.equal(weatherFromCode({ code: 95 }).thunder, true);
  assert.equal(weatherFromCode({ code: 45 }).fog, true);
  assert.equal(weatherFromCode({ code: 0, snowDepth: 0.05 }).snowCover, true);
});

test('Open-Meteo: neplatné dáta sa ignorujú', () => {
  assert.equal(parseOpenMeteo(null), null);
  assert.equal(parseOpenMeteo({ current: { weather_code: 'x' } }), null);
  assert.equal(parseOpenMeteo({ current: { weather_code: 300 } }), null);
  const w = parseOpenMeteo({ current: { weather_code: 71, temperature_2m: -2, cloud_cover: 100, snow_depth: 0.1 } });
  assert.equal(w?.precip, 'snow');
  assert.equal(w?.temp, -2);
});
