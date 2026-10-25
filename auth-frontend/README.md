# Frontend autentikasi

Frontend statis ini menyediakan login, consent/deny OAuth, logout, dan pesan error
aman. Tidak ada dashboard produk atau formulir pendaftaran publik. Source
menggunakan API publik Supabase Auth dengan publishable key; sesi browser disimpan
di `sessionStorage` per tab dan dibersihkan saat logout.

## Peta source

- [src/app.js](src/app.js): alur UI dan pemilihan route.
- [src/auth.js](src/auth.js): login, pembaruan sesi, detail/keputusan consent,
  dan logout melalui Auth.
- [src/routes.js](src/routes.js): penjagaan `authorization_id` dan redirect.
- [scripts/build.mjs](scripts/build.mjs): build statis dan allowlist konfigurasi publik.
- [vercel.json](vercel.json): build, rewrite, header, serta Git auto-deployment OFF.
- `api/phase-9-5/`: callback/client uji OAuth dan pilot dengan flag server-side;
  bukan endpoint bisnis umum atau izin write dari login biasa.

Jika pengguna belum login saat consent, `authorization_id` dipertahankan untuk
kembali ke layar yang tepat. Tujuan callback berasal dari respons Auth yang
divalidasi, bukan query `redirect` bebas. Persetujuan koneksi OAuth berbeda dari
persetujuan editorial suatu post.

## Build dan pemeriksaan

Dari root repository, setelah [preflight durasi](../docs/testing.md#1-estimasi-sebelum-menjalankan-pemeriksaan):

```sh
pnpm run frontend:typecheck
pnpm run frontend:build
pnpm run frontend:test
```

Ketiganya juga tercakup dalam `pnpm run check`; pilih pemeriksaan yang diperlukan
tanpa mengulangnya sebagai rangkaian duplikat. Tidak ada script `dev` pada package
frontend. Dependency runtime frontend kosong; tooling pemeriksaan berasal dari root.

Hosting menggunakan Root Directory `auth-frontend/`, perintah `pnpm run build`,
dan output `dist/`. Builder hanya membaca `VITE_SUPABASE_URL` serta
`VITE_SUPABASE_PUBLISHABLE_KEY` dari environment proses; `.env` tidak otomatis
dimuat oleh script build ini. Keduanya menjadi nilai publik di `dist/config.js`.
Konfigurasi kosong menghasilkan pesan aman dan bukan bukti login berfungsi.

`vercel.json` me-rewrite `/login`, `/oauth/consent`, `/logout`, dan `/error` ke
`index.html`, beserta route uji yang masih tersedia. Server preview statis harus
memiliki fallback yang sesuai; tidak semua server membaca konfigurasi Vercel.
Secret key, service-role, OAuth client secret, password, dan token tidak masuk
source, output build, atau log.

## Hosting dan bukti operasional

Push Git tidak otomatis membuktikan frontend diperbarui; source mematikan Git
auto-deployment. Versi/deployment aktif dan flag uji perlu diperiksa pada provider.
Test Node memeriksa perilaku terisolasi; perubahan route/Auth juga membutuhkan
pemeriksaan browser dan, bila relevan, flow hosted yang diotorisasi.

Gunakan [development](../docs/development.md), [testing](../docs/testing.md), dan
[operations](../docs/operations.md) untuk prosedur terkini. Bukti deployment lama
tersedia melalui [tracker historis](../archive/plans/implementation-plan.md#16-phase-tracker),
bukan alasan menyatakan versi hosted sekarang sudah diverifikasi.
