/**
 * يبني معاينة مستقلة من `TalansGroup.jsx` — ملف HTML واحد يُفتح بالمتصفح مباشرة
 * بلا خادم وبلا خطوة تثبيت إضافية.
 *
 *   npm run preview:artifact
 *
 * المخرَج: talans-preview.html (React + framer-motion + lucide مضمّنة، وCSS من Tailwind).
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'TalansGroup.jsx');
const outFile = join(root, 'talans-preview.html');
const work = mkdtempSync(join(tmpdir(), 'talans-preview-'));

const FONT_CDN = 'https://cdn.jsdelivr.net/npm/@dawod/thmanyah-font-web/index.css';

try {
  // 1) نقطة دخول تركّب المكوّن على #root — تُمرَّر عبر stdin ليتم حلّ الحزم من جذر المشروع
  const entrySource = [
    "import { createRoot } from 'react-dom/client';",
    "import Site from './TalansGroup.jsx';",
    "createRoot(document.getElementById('root')).render(<Site />);",
    '',
  ].join('\n');

  // 2) حزمة JS واحدة
  const jsFile = join(work, 'app.js');
  await build({
    stdin: { contents: entrySource, resolveDir: root, sourcefile: 'entry.jsx', loader: 'jsx' },
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2019',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    outfile: jsFile,
    absWorkingDir: root,
  });

  // 3) CSS من Tailwind — يمسح الملف المصدر فقط
  const twConfig = join(work, 'tailwind.config.cjs');
  const twInput = join(work, 'input.css');
  const cssFile = join(work, 'out.css');
  writeFileSync(twConfig, `module.exports = { content: [${JSON.stringify(source)}], theme: { extend: {} }, plugins: [] };\n`);
  writeFileSync(twInput, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  execFileSync(
    process.execPath,
    [join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js'), '-c', twConfig, '-i', twInput, '-o', cssFile, '--minify'],
    { stdio: 'inherit', cwd: root },
  );

  // 4) تجميع كل شيء في ملف واحد
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>مجموعة تالانس | TALANS GROUP — استثمار وتطوير الأعمال</title>
<meta name="description" content="مجموعة تالانس مجموعة أعمال سعودية تعمل في الاستثمار، التجارة، التقنية، ريادة الأعمال وتطوير المشاريع." />
<link rel="stylesheet" href="${FONT_CDN}" />
<style>
${readFileSync(cssFile, 'utf8')}
</style>
</head>
<body>
<div id="root"></div>
<script>
${readFileSync(jsFile, 'utf8')}
</script>
</body>
</html>
`;

  writeFileSync(outFile, html);
  console.log(`✓ talans-preview.html — ${(html.length / 1024).toFixed(0)} KB`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
