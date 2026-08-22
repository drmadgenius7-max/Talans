#!/usr/bin/env bash
#
# Athar Verify — تشغيل بأمر واحد
#
#   ./start.sh
#
# يفحص المتطلبات، ويولّد الأسرار، ويجهّز قاعدة البيانات، ثم يشغّل التطبيق.
# آمن للتشغيل أكثر من مرة: لا يعيد إنشاء شيء موجود ولا يمسح بياناتك.

set -euo pipefail
cd "$(dirname "$0")"

# ألوان الطرفية — تُعطَّل تلقائيًا عند إعادة التوجيه إلى ملف.
if [ -t 1 ]; then
  R=$'\033[0m'; B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; C=$'\033[36m'; E=$'\033[31m'
else
  R=''; B=''; G=''; Y=''; C=''; E=''
fi

say()  { printf '%s\n' "$1"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$R" "$1"; }
warn() { printf '  %s!%s %s\n' "$Y" "$R" "$1"; }
die()  { printf '\n  %s✗ %s%s\n\n' "$E" "$1" "$R" >&2; exit 1; }
step() { printf '\n%s%s%s\n' "$B" "$1" "$R"; }

say ""
say "  ${C}${B}أثر للتحقق${R} — تحقق من أصالة التوثيق"
say "  ────────────────────────────────────────"

# --- 1. المتطلبات ----------------------------------------------------------
step "١) فحص المتطلبات"

command -v node >/dev/null 2>&1 || die "Node.js غير مثبّت. حمّله من: https://nodejs.org (اختر LTS)"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "تحتاج Node.js 20 أو أحدث (الحالي: $(node -v)). حدّثه من https://nodejs.org"
ok "Node.js $(node -v)"

if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg"
else
  warn "ffmpeg غير مثبّت — مطابقة البصمة ستعمل، لكن مقارنة المحتوى لن تعمل."
  case "$(uname -s)" in
    Darwin) warn "للتثبيت:  brew install ffmpeg" ;;
    Linux)  warn "للتثبيت:  sudo apt-get install -y ffmpeg" ;;
    *)      warn "حمّله من:  https://ffmpeg.org/download.html" ;;
  esac
fi

# --- 2. ملف الإعدادات ------------------------------------------------------
step "٢) الإعدادات"

# الأسرار تُولَّد مرة واحدة فقط؛ إعادة توليدها تُبطل جلسات الدخول القائمة.
gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 "$1"
  else
    node -e "console.log(require('crypto').randomBytes($1).toString('base64'))"
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
  # نستخدم Node بدل sed: صيغة sed تختلف بين macOS و Linux.
  node -e '
    const fs = require("fs");
    const set = (text, key, value) =>
      text.replace(new RegExp("^" + key + "=.*$", "m"), key + "=" + value);
    let env = fs.readFileSync(".env", "utf8");
    env = set(env, "AUTH_SECRET", process.argv[1]);
    env = set(env, "IP_HASH_SALT", process.argv[2]);
    fs.writeFileSync(".env", env);
  ' "$(gen_secret 48)" "$(gen_secret 24)"
  ok "أُنشئ ملف .env بأسرار عشوائية جديدة"
else
  ok "ملف .env موجود — تُرك كما هو"
fi

# --- 3. قاعدة البيانات -----------------------------------------------------
step "٣) قاعدة البيانات"

DB_URL=$(node -e '
  const fs = require("fs");
  const line = fs.readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("DATABASE_URL="));
  process.stdout.write(line ? line.slice("DATABASE_URL=".length).trim() : "");
')
[ -n "$DB_URL" ] || die "DATABASE_URL غير موجود في ملف .env"

if command -v psql >/dev/null 2>&1; then
  DB_NAME=$(node -e 'process.stdout.write(new URL(process.argv[1]).pathname.slice(1))' "$DB_URL")
  # إنشاء قاعدة البيانات إن لم تكن موجودة — فشل الأمر ليس خطأً هنا.
  createdb "$DB_NAME" >/dev/null 2>&1 && ok "أُنشئت قاعدة البيانات: $DB_NAME" || ok "قاعدة البيانات جاهزة: $DB_NAME"
else
  warn "أداة psql غير موجودة — تأكد أن PostgreSQL يعمل وأن DATABASE_URL صحيح."
fi

# --- 4. التثبيت والتجهيز ---------------------------------------------------
step "٤) تجهيز المشروع"

if [ ! -d node_modules ]; then
  say "  جارٍ تنزيل المكتبات (قد يستغرق دقيقة)…"
  npm install --no-audit --no-fund >/dev/null 2>&1 || die "فشل تنزيل المكتبات. تأكد من اتصالك بالإنترنت."
  ok "المكتبات جاهزة"
else
  ok "المكتبات مثبّتة"
fi

npx prisma generate >/dev/null 2>&1 || die "فشل تجهيز Prisma"
ok "Prisma جاهز"

if ! npx prisma migrate deploy >/dev/null 2>&1; then
  die "تعذر الاتصال بقاعدة البيانات. تأكد أن PostgreSQL يعمل، وأن DATABASE_URL في ملف .env صحيح."
fi
ok "جداول قاعدة البيانات جاهزة"

# البذر يعمل بـ upsert، فتكراره لا يُنشئ نسخًا مكررة ولا يمس بياناتك.
npx tsx prisma/seed.ts >/dev/null 2>&1 && ok "حساب الإدارة جاهز" || warn "تعذر إنشاء بيانات التجربة"

# --- 5. التشغيل ------------------------------------------------------------
ADMIN_EMAIL=$(node -e '
  const fs = require("fs");
  const line = fs.readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("SEED_ADMIN_EMAIL="));
  process.stdout.write(line ? line.slice("SEED_ADMIN_EMAIL=".length).trim() : "admin@athrr-sa.com");
')
ADMIN_PASS=$(node -e '
  const fs = require("fs");
  const line = fs.readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("SEED_ADMIN_PASSWORD="));
  process.stdout.write(line ? line.slice("SEED_ADMIN_PASSWORD=".length).trim() : "ChangeMe!2026");
')

say ""
say "  ────────────────────────────────────────"
say "  ${G}${B}جاهز.${R}"
say ""
say "  الموقع للعملاء     ${C}http://localhost:3000${R}"
say "  لوحة التحكم        ${C}http://localhost:3000/admin/login${R}"
say ""
say "  البريد             ${B}${ADMIN_EMAIL}${R}"
say "  كلمة المرور        ${B}${ADMIN_PASS}${R}"
say ""
say "  ${Y}أول خطوة:${R} افتح لوحة التحكم ← «إضافة طلب» ← ارفع فيديو حقيقي."
say "  ثم ارجع للموقع وأدخل رقم الطلب لترى التوثيق."
say ""
say "  للإيقاف: اضغط Control + C"
say "  ────────────────────────────────────────"
say ""

exec npm run dev
