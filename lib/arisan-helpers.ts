import { supabase } from './supabase'
import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * Ambil tanggal mulai arisan dari tabel pengaturan_arisan.
 * Tabel ini cuma punya 1 baris.
 */
export async function getTanggalMulai(): Promise<string | null> {
  const { data, error } = await supabase
    .from('pengaturan_arisan')
    .select('tanggal_mulai')
    .limit(1)
    .single()

  if (error || !data) return null
  return data.tanggal_mulai
}

/**
 * Update tanggal mulai arisan (dipakai di halaman Pengaturan).
 */
export async function updateTanggalMulai(tanggalBaru: string) {
  // Ambil id baris yang sudah ada dulu
  const { data: existing } = await supabase
    .from('pengaturan_arisan')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    // Kalau belum ada baris sama sekali, insert baru
    return await supabase
      .from('pengaturan_arisan')
      .insert({ tanggal_mulai: tanggalBaru })
  }

  // Kalau sudah ada, update baris itu
  return await supabase
    .from('pengaturan_arisan')
    .update({ tanggal_mulai: tanggalBaru, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
}

/**
 * Hitung minggu aktif sekarang berdasarkan tanggal_mulai.
 * Minggu ke-1 = 0-6 hari sejak tanggal_mulai, minggu ke-2 = 7-13 hari, dst.
 */
export function hitungMingguAktif(tanggalMulai: string): number {
  const mulai = parseISO(tanggalMulai)
  const sekarang = new Date()

  const selisihHari = differenceInCalendarDays(sekarang, mulai)

  // Kalau belum masuk tanggal mulai, anggap masih minggu ke-1
  if (selisihHari < 0) return 1

  return Math.floor(selisihHari / 7) + 1
}

/**
 * Ambil total minggu = jumlah peserta yang terdaftar.
 */
export async function getTotalMinggu(): Promise<number> {
  const { count, error } = await supabase
    .from('peserta_arisan')
    .select('*', { count: 'exact', head: true })

  if (error) return 0
  return count ?? 0
}

/**
 * Pastikan data setoran untuk minggu tertentu sudah ada.
 * Kalau belum ada, otomatis generate baris BELUM_BAYAR untuk semua peserta.
 * Aman dipanggil berkali-kali (tidak akan bikin data dobel karena ada unique constraint).
 */
export async function pastikanSetoranMingguAda(mingguKe: number) {
  // Ambil semua peserta
  const { data: pesertaList, error } = await supabase
    .from('peserta_arisan')
    .select('id')

  if (error || !pesertaList || pesertaList.length === 0) return

  // Upsert: kalau baris (peserta_id + minggu_ke) sudah ada, skip.
  // Aman dari race condition karena ini atomic di database.
  const rowsBaru = pesertaList.map((p) => ({
    peserta_id: p.id,
    minggu_ke: mingguKe,
    status: 'BELUM_BAYAR',
  }))

  await supabase
    .from('setoran_mingguan')
    .upsert(rowsBaru, { onConflict: 'peserta_id, minggu_ke', ignoreDuplicates: true })
}

/**
 * Fungsi utama: dipanggil di awal halaman admin.
 * Mengembalikan info minggu aktif, total minggu, dan status siklus.
 */
export async function initMingguArisan() {
  const tanggalMulai = await getTanggalMulai()

  if (!tanggalMulai) {
    return {
      mingguAktif: 1,
      totalMinggu: 0,
      siklusSelesai: false,
      error: 'Tanggal mulai arisan belum diatur. Silakan atur di halaman Pengaturan.',
    }
  }

  const mingguAktif = hitungMingguAktif(tanggalMulai)
  const totalMinggu = await getTotalMinggu()
  const siklusSelesai = totalMinggu > 0 && mingguAktif > totalMinggu

  // Kalau siklus belum selesai, pastikan data setoran minggu ini sudah ada
  if (!siklusSelesai && totalMinggu > 0) {
    await pastikanSetoranMingguAda(mingguAktif)

    // Sekalian pastikan juga data minggu lalu ada (jaga-jaga kalau minggu lalu terlewat)
    if (mingguAktif > 1) {
      await pastikanSetoranMingguAda(mingguAktif - 1)
    }
  }

  return {
    mingguAktif,
    totalMinggu,
    siklusSelesai,
    error: null,
  }
}