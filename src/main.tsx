import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * نضبط اتجاه ولغة المستند برمجيًا أيضًا، حتى تعمل النسخة المدمجة
 * (ملف واحد أو تضمين داخل صفحة مستضيفة) بنفس السلوك دون الاعتماد
 * على وسم <html> في `index.html`.
 */
document.documentElement.lang = 'ar';
document.documentElement.dir = 'rtl';

const container = document.getElementById('root');

if (!container) {
  throw new Error('لم يتم العثور على عنصر #root في الصفحة');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
