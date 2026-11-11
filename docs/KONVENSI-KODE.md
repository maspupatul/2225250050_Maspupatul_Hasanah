# Konvensi Kode dan Alur Kerja — Z-Math

## 1. Bahasa

| Elemen | Bahasa |
|---|---|
| Nama variabel, fungsi, file, komentar kode | Inggris |
| Teks UI, pesan error API (`message`), konten | Bahasa Indonesia |
| Pesan commit, PR, issue | Bahasa Indonesia atau Inggris (konsisten per repo) |
| Dokumen `docs/` | Bahasa Indonesia |

## 2. Frontend (TypeScript/React)

**Tooling:** ESLint (`@typescript-eslint`, `react-hooks`, `jsx-a11y`), Prettier (2 spasi, single quote, lebar 100).

| Hal | Aturan |
|---|---|
| Komponen | Function component, `PascalCase.tsx`, satu komponen utama per file |
| Hooks | `useCamelCase.ts`, diletakkan di folder fitur |
| Tipe | `type` untuk props, `interface` untuk kontrak yang dapat diperluas. Tanpa `any` |
| Struktur fitur | `features/<nama>/{components,hooks,api,types}.ts(x)` |
| Panggilan API | Hanya lewat `lib/apiClient.ts` + TanStack Query, bukan `fetch` langsung di komponen |
| Teks UI | Dari `i18n/id.ts`, contoh `t('lesson.next')` |
| Styling | Tailwind utility + token CSS. Warna makna matematika **hanya** lewat token (`text-positive`, `text-negative`) |
| Aksesibilitas | Setiap elemen interaktif punya label. Uji dengan `jsx-a11y` dan axe |
| Test | `*.test.tsx` di samping file yang diuji |

```tsx
// Contoh pola komponen
type NumberLineProps = {
  range: [number, number];
  start: number;
  onPositionChange?: (value: number) => void;
};

export function NumberLine({ range, start, onPositionChange }: NumberLineProps) {
  // ...
}
```

## 3. Backend (Python/FastAPI)

**Tooling:** Ruff (lint + isort), Black (lebar 100), mypy (opsional, mode strict untuk `services/`).

| Hal | Aturan |
|---|---|
| Penamaan | `snake_case` untuk fungsi/variabel/modul, `PascalCase` untuk kelas & skema Pydantic |
| Router | Satu file per resource di `api/v1/`. Logika bisnis **tidak** di router |
| Services | Fungsi murni sebisa mungkin, tanpa I/O di `problem_generator`, `grader`, `misconceptions` |
| Skema | `XxxRequest` / `XxxResponse` di `schemas/` |
| Error | Raise `AppError(code, message, status)`. Handler global memformat sesuai API-SPEC |
| Type hints | Wajib di semua fungsi publik |
| Keamanan | Dilarang memakai `eval`/`exec`. Ekspresi diproses dengan parser AST aman |
| Test | `tests/unit/`, `tests/integration/`, nama `test_<modul>.py` |

```python
def generate(template: ProblemTemplate, seed: int) -> GeneratedProblem:
    """Pure function: same template + seed -> same problem."""
    rng = random.Random(seed)
    ...
```

## 4. Database

- Semua perubahan skema dilakukan lewat file migrasi baru `supabase/migrations/NNNN_deskripsi.sql`. Jangan mengubah migrasi lama.
- Nama tabel jamak `snake_case`, kolom `snake_case`, foreign key `<entitas>_id`.
- Setiap tabel baru **wajib** disertai kebijakan RLS dalam migrasi yang sama.

## 5. Alur Git

**Branch:**
- `main`: selalu siap dideploy, dilindungi (wajib PR + CI hijau).
- `feat/F-05-number-line`, `fix/grader-sign-normalization`, `docs/update-prd`, `chore/ci-cache`.

**Commit**: format [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(numberline): animasi lompatan per ketukan (F-05)
fix(grader): normalisasi tanda minus U+2212
docs(prd): tambah AC untuk F-09
test(generator): uji properti 1000 seed
```

**Pull Request:**
- Judul mengikuti format commit dan menyebut ID fitur.
- Deskripsi berisi: apa yang diubah, mengapa, cara menguji, tangkapan layar (untuk UI), checklist DoD.
- Minimal 1 reviewer (atau self-review dengan checklist bila bekerja sendiri).

## 6. Definition of Done

- [ ] Memenuhi acceptance criteria di PRD.
- [ ] Lint dan semua test lulus di CI.
- [ ] Test baru ditambahkan untuk logika baru.
- [ ] UI dicek di 360 px dan desktop, termasuk keyboard dan pembaca layar dasar.
- [ ] Mematuhi prinsip beban kognitif (CLAUDE.md §5).
- [ ] Teks UI ada di i18n, tanpa string hardcode.
- [ ] Tidak ada secret, `console.log`, atau `print` debug yang tertinggal.
- [ ] Dokumen terkait diperbarui.

## 7. Versi Rilis

Rilis memakai Semantic Versioning `MAJOR.MINOR.PATCH`. Versi Android (`versionCode`) dinaikkan setiap build yang didistribusikan. Perubahan dicatat di `CHANGELOG.md`.
