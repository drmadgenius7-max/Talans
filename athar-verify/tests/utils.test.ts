import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatDateAr,
  formatDuration,
  normalizeOrderNumber,
  shortHash,
} from '../src/lib/utils';
import { sanitizeFilename } from '../src/lib/storage';

describe('order number normalisation', () => {
  it('strips separators and whitespace', () => {
    assert.equal(normalizeOrderNumber('  275 123-456 '), '275123456');
    assert.equal(normalizeOrderNumber('275.123_456'), '275123456');
  });

  it('converts Arabic-Indic digits, which mobile keyboards produce', () => {
    assert.equal(normalizeOrderNumber('٢٧٥١٢٣٤٥٦'), '275123456');
    assert.equal(normalizeOrderNumber('۲۷۵۱۲۳۴۵۶'), '275123456');
  });

  it('removes bidirectional control marks pasted from WhatsApp', () => {
    assert.equal(normalizeOrderNumber('‎275123456‏'), '275123456');
  });

  it('upper-cases so ATH ids match regardless of typing', () => {
    assert.equal(normalizeOrderNumber('ath-7f3k'), 'ATH7F3K');
  });
});

describe('display helpers', () => {
  it('truncates a hash the way the UI shows it', () => {
    const hash = 'a'.repeat(64);
    assert.equal(shortHash(hash), `${'a'.repeat(8)}\u2026${'a'.repeat(5)}`);
    assert.equal(shortHash('abc'), 'abc');
    assert.equal(shortHash(''), '');
  });

  it('formats byte sizes in Arabic units', () => {
    assert.equal(formatBytes(0), '—');
    assert.equal(formatBytes(512), '512 بايت');
    assert.equal(formatBytes(1024 * 1024 * 3), '3.0 ميجابايت');
    assert.equal(formatBytes(BigInt(1024 * 1024 * 1024)), '1.0 جيجابايت');
  });

  it('formats durations, and refuses to invent one', () => {
    assert.equal(formatDuration(0), '0:00');
    assert.equal(formatDuration(96.4), '1:36');
    assert.equal(formatDuration(3725), '1:02:05');
    assert.equal(formatDuration(null), '—');
    assert.equal(formatDuration(Number.NaN), '—');
  });

  it('formats dates without depending on an ICU build', () => {
    assert.equal(formatDateAr('2026-08-18T00:00:00.000Z'), '18 أغسطس 2026');
    assert.equal(formatDateAr(null), '—');
    assert.equal(formatDateAr('not-a-date'), '—');
  });
});

describe('filename sanitisation', () => {
  it('strips path separators so a filename cannot escape its prefix', () => {
    assert.equal(sanitizeFilename('../../etc/passwd'), '.._.._etc_passwd');
    assert.equal(sanitizeFilename('a\\b.mp4'), 'a_b.mp4');
  });

  it('removes control characters and never returns empty', () => {
    assert.equal(sanitizeFilename('video.mp4'), 'video.mp4');
    assert.equal(sanitizeFilename('   '), 'file');
  });

  it('bounds the length', () => {
    assert.equal(sanitizeFilename('x'.repeat(500)).length, 180);
  });
});
