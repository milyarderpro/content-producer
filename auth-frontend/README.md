# Minimal Supabase Auth frontend — Phase 9.1

Frontend statis tanpa dependency runtime: login, consent/deny, logout, dan error
aman. **Bukan dashboard.** Browser hanya menggunakan API publik Supabase Auth
dengan publishable key. Kode OAuth/callback berasal dari Supabase Auth, bukan
dibuat oleh frontend. Sesi disimpan di `sessionStorage` per tab dan dihapus
saat logout; tidak ada pendaftaran publik.

## Build dan hosting (tidak provision/deploy pada 9.1)

Root Directory untuk project Vercel **di masa depan**: `auth-frontend/`.
Package manager `pnpm@10.33.2`. Perintah build `pnpm run build`, output
`dist/`. `vercel.json` me-rewrite `/login`, `/oauth/consent`, `/logout`,
dan `/error` ke `index.html`, termasuk saat membuka rute langsung/refresh.

Konfigurasi build publik saja: `VITE_SUPABASE_URL` (origin project Supabase)
dan `VITE_SUPABASE_PUBLISHABLE_KEY` (format `sb_publishable_...`).
Builder hanya memasukkan dua nilai allowlisted ini ke `dist/config.js`.
Jika kosong, halaman menampilkan kesalahan aman sehingga CI dapat build tanpa
credential. Secret key, service-role, OAuth client secret, database password,
token, dan `.env` tidak boleh disalin ke source, output, atau log.
`dist/` diabaikan Git.

Di root repository, pemeriksaan yang ditambahkan:

- `pnpm run frontend:typecheck` — TypeScript `checkJs` pada source browser.
- `pnpm run frontend:build` — build statis tanpa secret.
- `pnpm run frontend:test` — tes Node (route, ID, redirect, approve/deny,
  logout, konfigurasi dan asset).
- `pnpm run check` — juga menjalankan ketiganya.

Dependency aplikasi frontend **kosong** (tanpa library runtime/build pihak
ketiga); lockfile mandiri mencatat importer kosong. TypeScript berasal dari
devDependency root yang sudah terkunci.

## Alur OAuth

Setelah konfigurasi OAuth Server di checkpoint **9.4**, Supabase mengirim
`authorization_id` ke `/oauth/consent`. Jika belum login, aplikasi
mempertahankan ID tersebut saat menuju `/login`, lalu kembali ke consent
setelah login. Identitas client dan scope didapat dari Supabase Auth.
Persetujuan eksplisit `Izinkan` dan penolakan eksplisit `Tolak` memanggil
endpoint resmi Auth: `GET /auth/v1/oauth/authorizations/{id}` untuk detail dan
`POST /auth/v1/oauth/authorizations/{id}/consent` dengan JSON
`{"action":"approve"}` atau `{"action":"deny"}` untuk keputusan.
Rute `/oauth/authorize/{id}/approve|deny` **bukan** kontrak consent Supabase.
Referensi: [source resmi Supabase Auth](https://github.com/supabase/auth/blob/master/internal/api/oauthserver/authorize.go)
dan [panduan resmi](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows);
callback hanya dari respons Auth; callback hanya dari respons Auth, dibatasi HTTPS
(atau HTTP loopback untuk tes lokal) dan disamakan dengan callback terdaftar
bila detail redirect tersedia. Query `redirect` arbitrary tidak digunakan.
Pesan error tidak meneruskan rincian server atau token.

Tes routing mengonfirmasi konfigurasi fallback dan source UI.
**Bukti direct refresh pada hosting Vercel, OAuth production, PKCE dan login
owner di production masih PENDING 9.4/9.5**; tidak diklaim oleh tes unit 9.1.
Tidak membuat project, mengatur Auth production, atau deploy di sini.
