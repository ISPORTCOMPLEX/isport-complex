// Testy redakčného systému bez databázy: čistenie textu (XSS), bloky, adresy článkov a videí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeInline, safeHref, slugify, youtubeIdFrom, normalizeBlocks, normalizeCover, readMinutes, galleryImages } from '../lib/articles/blocks.ts';
import { parseVideoPath } from '../lib/cloudinary.ts';

test('text: povolené formátovanie ostane', () => {
  assert.equal(sanitizeInline('<strong>Tučné</strong> a <em>kurzíva</em> <u>p</u>'), '<b>Tučné</b> a <i>kurzíva</i> <u>p</u>');
  assert.equal(sanitizeInline('<ul><li>a</li><li>b</li></ul>'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(sanitizeInline('riadok<div>druhý</div>'), 'riadok<br>druhý');
});

test('text: XSS sa nedostane von', () => {
  const bad = [
    '<script>alert(1)</script>ok',
    '<img src=x onerror=alert(1)>ok',
    '<svg onload=alert(1)><circle/></svg>ok',
    '<a href="javascript:alert(1)">ok</a>',
    '<a href="  JaVaScRiPt:alert(1)">ok</a>',
    '<a href="data:text/html,<script>alert(1)</script>">ok</a>',
    '<b onclick="alert(1)">ok</b>',
    '<iframe src="https://evil.example"></iframe>ok',
    '<style>body{display:none}</style>ok',
    '<a href="//evil.example">ok</a>',
    '<<script>script>alert(1)<</script>/script>ok',
  ];
  for (const b of bad) {
    const out = sanitizeInline(b);
    assert.doesNotMatch(out, /<(script|img|svg|iframe|style)/i, b);
    assert.doesNotMatch(out, /on\w+\s*=/i, b);
    assert.doesNotMatch(out, /javascript:|data:/i, b);
    assert.doesNotMatch(out, /href="\/\//, b);
    assert.match(out, /ok/, b);
  }
  // atribút sa nedá rozbiť úvodzovkou
  assert.equal(sanitizeInline('<a href="https://a.sk/?q=&quot;x">t</a>'), sanitizeInline('<a href="https://a.sk/?q=&quot;x">t</a>'));
  assert.doesNotMatch(sanitizeInline(`<a href='https://a.sk/"onmouseover="x'>t</a>`), /onmouseover="/);
});

test('text: odkazy von dostanú nofollow a nové okno, vnútorné nie', () => {
  assert.equal(sanitizeInline('<a href="https://hokej.sk">x</a>'), '<a href="https://hokej.sk" target="_blank" rel="noopener noreferrer nofollow">x</a>');
  assert.equal(sanitizeInline('<a href="/rezervacia">x</a>'), '<a href="/rezervacia">x</a>');
  assert.equal(safeHref('mailto:info@isport.sk'), 'mailto:info@isport.sk');
  assert.equal(safeHref('ftp://x'), null);
});

test('text: neuzavreté značky sa uzavrú', () => {
  assert.equal(sanitizeInline('<b>tučné <i>obe'), '<b>tučné <i>obe</i></b>');
  assert.equal(sanitizeInline('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
});

test('adresa článku bez diakritiky', () => {
  assert.equal(slugify('Nábor detí 2026 – hokejová škola!'), 'nabor-deti-2026-hokejova-skola');
  assert.equal(slugify('Ľadová plocha: zmena otváracích hodín'), 'ladova-plocha-zmena-otvaracich-hodin');
  assert.equal(slugify('   '), 'clanok');
  assert.ok(slugify('a'.repeat(200)).length <= 80);
});

test('YouTube odkazy', () => {
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=3', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/watch?feature=x&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'])
    assert.equal(youtubeIdFrom(u), 'dQw4w9WgXcQ', u);
  assert.equal(youtubeIdFrom('https://vimeo.com/123'), null);
  assert.equal(youtubeIdFrom('https://evil.example/?v=dQw4w9WgXcQ"><script>'), null);
});

test('bloky: neznáme typy a cudzie fotky sa zahodia', () => {
  const img = { publicId: 'isport/clanky/abc', version: 123, width: 1600, height: 900 };
  const blocks = normalizeBlocks([
    { id: 'b1abc', type: 'text', html: '<b>Ahoj</b><script>x</script>' },
    { type: 'html', html: '<script>x</script>' },
    { type: 'image', img: { ...img, publicId: 'cudzi/fotka' }, alt: 'x' },
    { type: 'image', img: { ...img, publicId: 'isport/clanky/../../x' }, alt: 'x' },
    { type: 'image', img, alt: '<b>Hala</b>', caption: '' },
    { type: 'gallery', images: [img, { ...img, publicId: 'zly' }] },
    { type: 'youtube', youtubeId: 'javascript:alert(1)' },
    { type: 'button', label: 'Klik', href: 'javascript:alert(1)' },
    { type: 'divider' },
  ]);
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['text', 'image', 'gallery', 'button', 'divider'],
  );
  assert.equal(blocks[0].type === 'text' && blocks[0].html, '<b>Ahoj</b>');
  assert.equal(blocks[1].type === 'image' && blocks[1].alt, 'Hala');
  assert.equal(blocks[2].type === 'gallery' && blocks[2].images.length, 1);
  assert.equal(blocks[3].type === 'button' && blocks[3].href, '/rezervacia');
  assert.equal(galleryImages(blocks).length, 2);
  assert.equal(normalizeBlocks('nie pole').length, 0);
  assert.equal(normalizeBlocks(Array.from({ length: 500 }, () => ({ type: 'divider' }))).length, 200);
  assert.equal(normalizeCover({ ...img, alt: 'a', caption: 'c' })?.alt, 'a');
  assert.equal(normalizeCover({ publicId: 'x' }), null);
});

test('čas čítania', () => {
  const words = Array.from({ length: 600 }, () => 'slovo').join(' ');
  assert.equal(readMinutes('t', 'p', [{ id: 'a1234', type: 'text', html: words }]), 3);
  assert.equal(readMinutes('', '', []), 1);
});

test('adresa videa /videa/… – len naše súbory', () => {
  assert.deepEqual(parseVideoPath(['v17', 'isport', 'clanky', 'abc.mp4']), { version: 17, publicId: 'isport/clanky/abc', ext: 'mp4' });
  assert.equal(parseVideoPath(['v17', 'isport', 'clanky', 'abc.jpg'])?.ext, 'jpg');
  assert.equal(parseVideoPath(['v17', 'ine', 'abc.mp4']), null);
  assert.equal(parseVideoPath(['v17', 'isport', '..', 'abc.mp4']), null);
  assert.equal(parseVideoPath(['17', 'isport', 'abc.mp4']), null);
  assert.equal(parseVideoPath(['v17', 'isport', 'abc.exe']), null);
});
