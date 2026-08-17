# شعار مجموعة تالانس — TALANS GROUP

هذا المجلد يحتوي على أصول الهوية البصرية المستخدمة في الموقع.

## استبدال الشعار

الملف `talans-mark.svg` هو **شعار مؤقت (Placeholder)**.

لاستبدال الشعار الرسمي للمجموعة:

1. ضع ملف الشعار الرسمي في هذا المجلد، مثلًا:
   `public/brand/talans-mark.svg` (أو `.png` / `.webp`).
2. عدّل المسار من مكان واحد فقط في:
   `src/data/site.ts` → `BRAND.markSrc`

```ts
export const BRAND = {
  markSrc: '/brand/talans-mark.svg',
  showWordmark: true, // اجعلها false إذا كان ملف الشعار يتضمن الاسم بالفعل (Lockup كامل)
  markAlt: 'شعار مجموعة تالانس',
};
```

> إذا كان ملف الشعار الرسمي عبارة عن **Lockup كامل** (رمز + اسم المجموعة)،
> اضبط `showWordmark: false` حتى لا يتكرر اسم المجموعة بجانب الشعار.

لا يتم تعديل أي Component عند استبدال الشعار — كل الاستخدامات
(Navbar / Hero / Footer / Loading Screen) تقرأ من نفس المصدر.

## الأيقونة (Favicon)

`index.html` يشير إلى نفس الملف:

```html
<link rel="icon" type="image/svg+xml" href="/brand/talans-mark.svg" />
```
