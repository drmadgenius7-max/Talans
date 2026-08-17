/**
 * يبني نسخة «ملف واحد مستقل» من الموقع.
 *
 * يأخذ ناتج `vite build` ويدمج كل شيء داخل ملف HTML واحد:
 * CSS + JavaScript + الشعار + الخطوط — بدون أي طلبات خارجية.
 *
 * الناتج:
 *   dist/talans-standalone.html   ملف كامل — يُفتح بالنقر المزدوج مباشرة
 *   dist/talans-embed.html        نسخة بدون وسوم html/head/body — للتضمين في مستضيف خارجي
 *
 * التشغيل: npm run build:single
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getEmbeddedFontsCss } from './embed-fonts.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

const TITLE = 'مجموعة تالانس | TALANS GROUP — استثمار وتطوير الأعمال';
const DESCRIPTION =
  'مجموعة تالانس هي مجموعة أعمال سعودية تعمل في الاستثمار، التجارة، التقنية، ريادة الأعمال وتطوير المشاريع، وتسعى لبناء فرص مستدامة وشراكات تصنع النمو.';

/**
 * يمنع إنهاء وسم `<script>` أو `<style>` مبكرًا إذا احتوى المحتوى
 * على نص مطابق لوسم الإغلاق داخل سلسلة نصية.
 */
function escapeForInlineTag(source) {
  return source.replace(/<\/(script|style)/gi, '<\\/$1');
}

/** يحوّل ملف SVG إلى Data URI */
function svgToDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, ' ').trim())}`;
}

/**
 * يستبدل كل إشارة إلى ملفات `public/brand/*.svg` بمحتواها كـ Data URI،
 * حتى يظهر الشعار داخل ملف واحد بلا طلبات إضافية.
 */
async function inlineBrandAssets(source) {
  const brandDir = path.join(DIST, 'brand');
  let output = source;

  let files = [];
  try {
    files = await readdir(brandDir);
  } catch {
    return output;
  }

  for (const file of files.filter((name) => name.endsWith('.svg'))) {
    const svg = await readFile(path.join(brandDir, file), 'utf8');
    const dataUri = svgToDataUri(svg);
    output = output.split(`/brand/${file}`).join(dataUri);
  }

  return output;
}

async function main() {
  const indexHtml = await readFile(path.join(DIST, 'index.html'), 'utf8');

  const jsMatch = /<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/.exec(indexHtml);
  const cssMatch = /<link[^>]*href="([^"]+\.css)"[^>]*>/.exec(indexHtml);

  if (!jsMatch || !cssMatch) {
    throw new Error('لم يتم العثور على ملفات البناء — شغّل `npm run build` أولًا.');
  }

  const readAsset = (url) => readFile(path.join(DIST, url.replace(/^\//, '')), 'utf8');

  const [appJsRaw, appCss] = await Promise.all([
    readAsset(jsMatch[1]),
    readAsset(cssMatch[1]),
  ]);

  const appJs = await inlineBrandAssets(appJsRaw);
  const fontsCss = await getEmbeddedFontsCss();

  const fontsBlock = fontsCss
    ? `<style>\n${fontsCss}</style>`
    : '<!-- تعذّر تضمين الخطوط — سيتم استخدام خطوط النظام -->';

  // النواة المشتركة بين النسختين
  const body = [
    fontsBlock,
    `<style>${escapeForInlineTag(appCss)}</style>`,
    '<div id="root"></div>',
    `<script type="module">${escapeForInlineTag(appJs)}</script>`,
  ].join('\n');

  /* --------- 1) ملف كامل مستقل --------- */
  const favicon = svgToDataUri(
    await readFile(path.join(DIST, 'brand', 'talans-mark.svg'), 'utf8'),
  );

  const standalone = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#0C0C0C" />
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}" />
<link rel="icon" type="image/svg+xml" href="${favicon}" />
<style>html,body,#root{margin:0;padding:0;background:#0C0C0C;}</style>
</head>
<body>
${body}
</body>
</html>
`;

  /* --------- 2) نسخة للتضمين (بدون html/head/body) --------- */
  const embed = `<title>مجموعة تالانس</title>
<meta name="description" content="${DESCRIPTION}" />
<style>html,body,#root{margin:0;padding:0;background:#0C0C0C;}</style>
${body}
`;

  await writeFile(path.join(DIST, 'talans-standalone.html'), standalone, 'utf8');
  await writeFile(path.join(DIST, 'talans-embed.html'), embed, 'utf8');

  const mb = (text) => (Buffer.byteLength(text, 'utf8') / 1024 / 1024).toFixed(2);
  console.log(`✓ dist/talans-standalone.html  (${mb(standalone)} ميغابايت)`);
  console.log(`✓ dist/talans-embed.html       (${mb(embed)} ميغابايت)`);
}

await main();
