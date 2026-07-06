# CLAUDE.md

## Project

Vite + React (JavaScript, TypeScript) SPA.

<!-- TO'LDIRING: loyiha nomi va 1 qator maqsad. Masalan:
"Academia IT — o'quv markaz landing + admin dashboard" -->

## Commands

```bash
npm run dev      # dev server
npm run build    # production build — har taskdan keyin majburiy
npm run lint     # har taskdan keyin majburiy
```

## Stack & Architecture

<!-- TO'LDIRING — bu eng muhim bo'lim. Namuna: -->

- Styling: Tailwind CSS v4 (boshqa styling tizimi qo'shilmasin)
- Routing: react-router-dom v7, routes `src/App.jsx` da
- State: local state + context (`src/context/`) — Redux/Zustand YO'Q
- API: `src/services/api.js` — barcha fetch shu yerdan, komponent ichida fetch yozilmasin
- Icons: lucide-react

```
src/
├── components/   # reusable UI (Button, Card, Modal...)
├── pages/        # route-level sahifalar
├── layouts/      # MainLayout, AuthLayout
├── hooks/        # custom hooks (useFetch, useAuth...)
├── services/     # API layer
├── utils/        # pure helpers
└── styles/       # global css, tokens
```

## Design Tokens

<!-- TO'LDIRING: haqiqiy qiymatlaringiz. Namuna: -->

- Primary: `#6366f1` · Background dark: `#0a0a0f` · Surface: `#16161d`
- Font: Inter (headings 600, body 400)
- Radius: `rounded-xl` (kartalar), `rounded-lg` (button/input)
- Spacing: faqat 4px grid (p-4, gap-6, ...)
- Referens sifat: Linear/Vercel darajasi — minimal, dark, premium

## Rules

- Existing pattern davom ettirilsin; duplicate komponent yaratilmasin — avval `src/components/` tekshirilsin
- Yangi dependency: faqat zarur bo'lsa, 1 qator sabab bilan (`Need: X — sabab`)
- Loading + error state — har bir async UI uchun majburiy
- Responsive majburiy: mobile-first, sm/md/lg breakpoint'lar
- `console.log`, dead code, unused import qoldirilmasin
- Unrelated fayllarga tegilmasin; so'ralmagan refactor qilinmasin
- Barcha savol va so'rovlar o'zbek tilida bo'lishi lozim

## Workflow

1. Faqat kerakli fayllarni o'qi (grep/search first, partial edit)
2. Implement
3. `npm run lint && npm run build` — fail bo'lsa o'zing tuzat (max 3 urinish, keyin 3 qatorda: muammo / sabab / variant)

3+ fayl o'zgarsa: 1 qator mini-plan yoz, tasdiq kutmasdan davom et.

## Git

Faqat foydalanuvchi so'rasa. Format: `feat:` / `fix:` / `refactor:`.
Taqiq: `git reset --hard`, `git push --force`.

## Communication

Foydalanuvchi bilan o'zbekcha va qisqa. Kod va comment — English.

Javob formati:

```
✅ Bajarildi: ...
📁 Fayllar: ...
🧪 Build: ✅ | Lint: ✅
```

Savol faqat: destructive operatsiya, chindan ambiguous talab, secret/env kerak bo'lsa.
