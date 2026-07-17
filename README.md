# Arisan Mingguan — Aplikasi Manajemen Arisan

> **Aplikasi web modern untuk mengelola arisan mingguan** — lacak setoran, tentukan pemenang, dan ekspor data ke Excel.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Fitur

- **Timeline Publik** — Lihat jadwal kocokan arisan dan pemenang tiap minggu
- **Dashboard Admin** — Login aman, tandai LUNAS/BELUM BAYAR, filter peserta
- **CRUD Peserta** — Tambah, edit, hapus, dan tukar posisi peserta
- **Pengaturan** — Atur tanggal mulai arisan sebagai patokan minggu
- **Export Excel** — Unduh rekap setoran ke format `.xlsx`
- **PWA Ready** — Bisa di-install sebagai aplikasi di HP
- **Responsive** — Tampilan optimal di mobile & desktop

## Tech Stack

| Teknologi | Kegunaan |
|---|---|
| Next.js 16 | Framework React (App Router) |
| Supabase | Database PostgreSQL + Auth |
| Tailwind CSS v4 | Utility-first styling |
| TypeScript | Type safety |
| ExcelJS | Export spreadsheet |
| date-fns | Manipulasi tanggal |
| Lucide React | Icon library |

## Database Schema

| Table | Keterangan |
|---|---|
| `pengaturan_arisan` | Tanggal mulai arisan (1 baris) |
| `peserta_arisan` | Data peserta & urutan menang |
| `setoran_mingguan` | Status bayar per peserta per minggu |

## Cara Menjalankan

```bash
# 1. Clone
git clone https://github.com/<username>/<repo>.git
cd <repo>

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Setup database
# - Buat project di https://supabase.com
# - Jalankan query DDL di Supabase SQL Editor
# - Jalankan seed.sql untuk data dummy

# 5. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk melihat public timeline. Login admin di `/login`.

## Deployment

Deploy ke Vercel dalam 1 klik:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Pastikan environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) sudah diisi di Vercel dashboard.

## Lisensi

MIT
