/**
 * يجلب خطوط الموقع من Google Fonts ويحوّلها إلى CSS مضمّن (base64)
 * حتى تعمل نسخة «الملف الواحد» بدون أي اتصال بالإنترنت.
 *
 * يُخزَّن الناتج في `.cache/fonts-embedded.css` فلا يُعاد التحميل في كل بناء.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE_DIR = path.join(ROOT, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'fonts-embedded.css');

const GOOGLE_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap';

// متصفح حديث حتى تعيد Google صيغة woff2
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * المقاطع المطلوبة فقط — لتقليل الحجم:
 * Kanit للأحرف اللاتينية والأرقام، وIBM Plex Sans Arabic للنص العربي.
 */
const KEEP = [
  { family: 'Kanit', subsets: ['latin'] },
  { family: 'IBM Plex Sans Arabic', subsets: ['arabic', 'latin'] },
];

/** يقسّم ملف CSS إلى كتل @font-face مع اسم المقطع المذكور في التعليق قبلها */
function parseFontFaces(css) {
  const blocks = [];
  const regex = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/gi;

  let match;
  while ((match = regex.exec(css)) !== null) {
    const [, subset, block] = match;
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1] ?? '';
    const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block)?.[1];
    if (url) blocks.push({ subset, family, block, url });
  }

  return blocks;
}

function wanted({ family, subset }) {
  return KEEP.some(
    (entry) => entry.family === family && entry.subsets.includes(subset),
  );
}

async function fetchWithUA(url, asBuffer = false) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) {
    throw new Error(`فشل تحميل ${url} — الحالة ${response.status}`);
  }
  return asBuffer ? Buffer.from(await response.arrayBuffer()) : response.text();
}

/**
 * يعيد CSS يحتوي على @font-face بخطوط مضمّنة.
 * يستخدم النسخة المخزّنة إن وُجدت، ويعيد `null` إذا تعذّر الاتصال ولا نسخة مخزّنة.
 */
export async function getEmbeddedFontsCss({ refresh = false } = {}) {
  if (!refresh && existsSync(CACHE_FILE)) {
    return readFile(CACHE_FILE, 'utf8');
  }

  try {
    const css = await fetchWithUA(GOOGLE_CSS_URL);
    const faces = parseFontFaces(css).filter(wanted);

    if (faces.length === 0) {
      throw new Error('لم يتم العثور على أي @font-face مطابق');
    }

    const out = [];
    for (const face of faces) {
      const buffer = await fetchWithUA(face.url, true);
      const dataUri = `data:font/woff2;base64,${buffer.toString('base64')}`;
      out.push(face.block.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(${dataUri})`));
    }

    const result = `/* خطوط مضمّنة — لا تحتاج اتصالًا بالإنترنت */\n${out.join('\n')}\n`;

    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, result, 'utf8');

    console.log(
      `[fonts] تم تضمين ${faces.length} خطًا (${(result.length / 1024).toFixed(0)} كيلوبايت)`,
    );

    return result;
  } catch (error) {
    console.warn(`[fonts] تعذّر تضمين الخطوط: ${error.message}`);
    console.warn('[fonts] سيتم الاعتماد على خطوط النظام في النسخة المستقلة.');
    return null;
  }
}

// تشغيل مباشر: node scripts/embed-fonts.mjs [--refresh]
if (process.argv[1] === import.meta.filename) {
  await getEmbeddedFontsCss({ refresh: process.argv.includes('--refresh') });
}
