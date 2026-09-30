# Product Requirement Document (PRD)

**Product Name:** Ticco  
**Tagline:** Cash Flow Tracker  
**Target Platform:** Progressive Web App (PWA) — Mobile-First  
**Tech Stack:** Next.js (App Router, API Routes), MongoDB Atlas (M0 Free Tier), Vercel  
**Document Version:** 1.0 (Final Draft)

---

## 1. Overview & Problem Statement

* **Ringkasan Produk:** Ticco adalah aplikasi PWA pencatatan keuangan internal dan operasional toko multi-cabang yang dirancang untuk bisnis keluarga. Sistem ini menyatukan pencatatan arus kas riil, struktur setoran modal patungan keluarga, pemantauan dompet kas, serta manajemen kasbon dan slip gaji staf dalam satu platform terisolasi.
* **Problem Statement:**
  * Bisnis keluarga sering mencampuradukkan setoran modal investasi dengan omzet harian, menghasilkan laporan laba-rugi semu.
  * Kasbon staf yang diambil di tengah bulan rawan tercatat ganda (*double-counting*) saat penggajian akhir bulan jika dikelola terpisah.
  * Kurangnya kontrol akses berbasis toko (*store-scoped access*) membuat anggota keluarga di unit usaha A berisiko melihat data finansial rahasia di unit usaha B.
* **Solusi Utama:** Menghadirkan buku kas digital dengan pemisahan tegas antara ekuitas modal dan omzet, otomasi deduksi kasbon pada slip gaji dengan pola *snapshot*, serta hak akses berbasis per-toko menggunakan akun Google terverifikasi.

---

## 2. User Roles & Scoped RBAC

Hak akses dikunci pada level **Toko (`storeId`)**, bukan global pada profil akun pengguna:

| Hak Akses & Modul | Owner (Pembuat Toko) | Admin Toko | Family Viewer | Staff (Self-Service) |
| :--- | :---: | :---: | :---: | :---: |
| Hapus / Edit Profil Toko | Ya | Tidak | Tidak | Tidak |
| Invite Anggota via Username | Ya | Tidak | Tidak | Tidak |
| Input Transaksi Kas Masuk/Keluar | Ya | Ya | Tidak | Tidak |
| Input Setoran Modal Baru | Ya | Ya | Tidak | Tidak |
| Kelola Staf, Kasbon & Payslip | Ya | Ya | Tidak | Tidak |
| Lihat Saldo Dompet & Mutasi Kas | Ya | Ya | Ya (Read-Only) | Tidak |
| Lihat Struktur & Persentase Modal | Ya | Ya | Ya (Read-Only) | Tidak |
| Lihat & Unduh Slip Gaji Pribadi | - | - | - | Ya (Milik Sendiri) |

---

## 3. Onboarding & Invitation Flow

### 3.1. Autentikasi & Registrasi Username
1. Pengguna login menggunakan **Google OAuth ("Sign in with Google")**.
2. **Onboarding Wajib:** Jika pengguna belum memiliki `username`, sistem menampilkan modal penyiapan profil. Pengguna wajib memasukkan username unik (karakter alfanumerik dan garis bawah, 3–20 karakter, *case-insensitive*).
3. Profil tersimpan di koleksi `users`.

### 3.2. Dashboard State (User Baru)
* **Kondisi Tanpa Undangan:** Menampilkan antarmuka kosong dengan tombol utama `[+ Buat Toko Baru]`.
* **Kondisi Terundang:** Jika username pengguna telah didaftarkan oleh Owner toko lain, kartu unit bisnis tersebut langsung tampil di dashboard saat login.

### 3.3. Logika Undangan (Store Isolation)
* Owner membuka menu **Pengaturan Toko > Anggota > Undang Anggota**.
* Owner memasukkan `username` tujuan dan memilih peran (`Admin` atau `Viewer`).
* Backend memverifikasi keberadaan username di koleksi `users`, lalu membuat relasi di koleksi `store_members`.
* Anggota hanya memiliki akses ke toko tempat ia diundang. Toko lain milik Owner yang sama tetap tersembunyi total.

---

## 4. Functional Requirements

### Modul A: Multi-Toko & Manajemen Dompet (P0)
* **FR-STR-1 (Multi-Store Switcher):** Pengguna dapat berpindah unit bisnis secara dinamis melalui dropdown header tanpa perlu keluar dari aplikasi (*logout*).
* **FR-WLT-1 (Multi-Wallet):** Setiap toko dapat memiliki beberapa akun kas (contoh: *Kas Tunai Toko*, *BCA Operasional*, *QRIS/GoPay*).
* **FR-WLT-2 (Atomic Balance Update):** Setiap transaksi keuangan memicu pembaruan saldo menggunakan operator atomik `$inc`. Pengeluaran otomatis ditolak jika saldo tidak mencukupi untuk mencegah nilai minus.
* **FR-WLT-3 (Transfer Antar-Dompet):** Pemindahan dana internal (misalnya setor tunai ke bank) memotong dompet asal dan menambah dompet tujuan tanpa mencatat beban pengeluaran maupun omzet baru.

### Modul B: Permodalan Keluarga / Equity Tracker (P0)
* **FR-CAP-1 (Pemisahan Akun Modal):** Setoran modal wajib diklasifikasikan sebagai *Capital Contribution*, terisolasi dari kategori omzet kas harian.
* **FR-CAP-2 (Input Setoran):** Admin mencatat nama penyetor, tanggal, nominal, dan dompet tujuan penerimaan dana. Saldo dompet penerima otomatis bertambah.
* **FR-CAP-3 (Perhitungan Rasio Kepemilikan):** Sistem menghitung porsi modal secara otomatis dengan rumus:
  $$\text{Persentase} = \left(\frac{\text{Total Setoran Anggota}}{\text{Total Modal Keseluruhan Toko}}\right) \times 100\%$$
* **FR-CAP-4 (Audit Trail Permodalan):** Log riwayat setoran disajikan kronologis dan dapat dipantau oleh anggota keluarga dengan role *Viewer*.

### Modul C: Arus Kas Operasional / Cash Flow (P0)
* **FR-TRX-1 (Pencatatan Transaksi):** Input data kas keluar dan masuk: tanggal, nominal, jenis (*Income/Expense*), kategori (Bahan Baku, Listrik, Operasional, Penjualan), dompet kas, dan keterangan.
* **FR-TRX-2 (Laporan Arus Kas):** Dashboard ringkasan kas menampilkan total kas masuk, total kas keluar, dan selisih bersih (*net cash flow*) berdasarkan filter tanggal, kategori, dan dompet kas.

### Modul D: Staf, Kasbon & Payslip Engine (P0)
* **FR-STF-1 (Master Staf):** Form input data staf berisi nama, posisi, status kerja, serta nominal acuan `baseSalary` dan `allowances`.
* **FR-ADV-1 (Pencatatan Kasbon / Gaji Duluan):**
  * Admin mencatat penarikan kasbon di tengah bulan dengan memilih staf, tanggal, nominal, dan dompet kas sumber.
  * Saldo dompet langsung berkurang saat kasbon disetujui.
  * Status kasbon ditandai sebagai `unsettled`.
* **FR-PAY-1 (Kalkulasi Payroll & Snapshot Pattern):**
  * Admin memilih periode bulan dan nama staf.
  * Sistem mengumpulkan seluruh kasbon berstatus `unsettled` milik staf pada periode tersebut:
    $$\text{Take Home Pay} = (\text{Gaji Pokok} + \text{Bonus}) - \text{Total Kasbon Unsettled}$$
  * Saat tombol `Approve & Selesaikan Gaji` ditekan:
    1. Saldo dompet kas terpotong sebesar sisa transfer (*Net Payout*).
    2. Status kasbon berubah menjadi `settled`.
    3. Seluruh rincian nominal disalin permanen ke record payslip (*freeze snapshot*) agar tidak berubah jika master gaji staf diperbarui di kemudian hari.
* **FR-PAY-2 (Cetak / Ekspor Payslip):** Antarmuka cetak slip gaji teroptimasi untuk perangkat mobile, siap dicetak atau diekspor ke PDF.

---

## 5. Technical & Non-Functional Requirements (NFR)

* **PWA & Mobile-First Execution:**
  * Berkas `manifest.json` memuat `name: "Ticco: Cash Flow Tracker"` dan `short_name: "Ticco"`.
  * Service worker menerapkan strategi *Cache-First* untuk UI shell dan *Network-First* untuk seluruh endpoint transaksi finansial.
  * Modul mutasi kas dinonaktifkan saat *offline* demi menjaga konsistensi data riil.
* **Optimasi Serverless (Vercel + MongoDB Atlas M0):**
  * Koneksi Mongoose wajib di-cache secara global pada level runtime untuk mencegah kehabisan koneksi (*connection pool exhaustion*) akibat *cold starts*.
  * Seluruh mutasi saldo kas menggunakan query atomik:
    ```javascript
    await Wallet.updateOne(
      { _id: walletId, balance: { $gte: amount } },
      { $inc: { balance: -amount } }
    );
    ```
* **Keamanan Endpoint:** Setiap API Route wajib memvalidasi sesi Google OAuth dan keanggotaan pengguna di `store_members`. Akses dari role `viewer` langsung diblokir (*403 Forbidden*) jika memanggil metode selain `GET`.

---

## 6. Database Schema Design (MongoDB)

```javascript
// 1. users
{
  _id: ObjectId,
  email: String,       // Indexed, Unique
  username: String,    // Indexed, Unique, Lowercase
  name: String,
  avatarUrl: String,
  createdAt: Date
}

// 2. stores
{
  _id: ObjectId,
  name: String,
  ownerId: ObjectId,   // Ref: users
  createdAt: Date
}

// 3. store_members
{
  _id: ObjectId,
  storeId: ObjectId,   // Ref: stores (Indexed)
  userId: ObjectId,    // Ref: users (Indexed)
  role: String,        // 'owner' | 'admin' | 'viewer'
  joinedAt: Date
}

// 4. wallets
{
  _id: ObjectId,
  storeId: ObjectId,   // Ref: stores
  name: String,        // e.g., 'Kas Tunai Laci', 'Rekening BCA'
  balance: Number,
  isArchived: Boolean
}

// 5. capital_contributions (Setoran Modal)
{
  _id: ObjectId,
  storeId: ObjectId,
  userId: ObjectId,        // Ref: users (Opsional jika investor keluarga non-aplikasi)
  contributorName: String, // Snapshot nama investor
  amount: Number,
  walletId: ObjectId,      // Masuk ke dompet mana
  date: Date,
  notes: String,
  recordedBy: ObjectId
}

// 6. transactions (Mutasi Arus Kas)
{
  _id: ObjectId,
  storeId: ObjectId,
  walletId: ObjectId,
  type: String,            // 'income' | 'expense' | 'transfer'
  category: String,        // 'Penjualan', 'Bahan Baku', 'Listrik', dll.
  amount: Number,
  date: Date,
  notes: String,
  destinationWalletId: ObjectId // Hanya jika type === 'transfer'
}

// 7. staff
{
  _id: ObjectId,
  storeId: ObjectId,
  name: String,
  baseSalary: Number,
  allowances: Number,
  status: String           // 'active' | 'inactive'
}

// 8. cash_advances (Kasbon)
{
  _id: ObjectId,
  storeId: ObjectId,
  staffId: ObjectId,
  amount: Number,
  walletId: ObjectId,
  date: Date,
  status: String,          // 'unsettled' | 'settled'
  settledAtPeriod: String  // Format: 'YYYY-MM'
}

// 9. payslips (Snapshot Arsip Gaji)
{
  _id: ObjectId,
  storeId: ObjectId,
  staffId: ObjectId,
  period: String,          // 'YYYY-MM'
  baseSalarySnapshot: Number,
  allowanceSnapshot: Number,
  bonus: Number,
  advanceDeduction: Number, // Total kasbon yang dipotong
  netPayout: Number,       // Sisa transfer riil
  paymentWalletId: ObjectId,
  paidAt: Date
}