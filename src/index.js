const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); 
require('dotenv').config();// Tambahkan ini untuk parsing cookie
const multer = require('multer');
const path = require('path');
const cron = require("node-cron");
const { Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cookieParser()); // Gunakan middleware cookie-parser
const cors = require('cors')
app.use(express.urlencoded({ extended: true }));
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads'); // Folder uploads di luar src
const { GoogleGenAI } = require("@google/genai");
const { format } = require('date-fns');
const { id } = require('date-fns/locale');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const bodyParser = require('body-parser');
app.use(bodyParser.json());

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Gunakan cors dengan pengaturan yang sesuai
app.use(cors({
  origin: 'http://localhost:5173', // Ganti dengan URL frontend Anda
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'], // Menambahkan X-CSRF-Token di allowedHeaders
  credentials: true // Izinkan pengiriman cookie
}));


const JWT_SECRET = process.env.JWT_SECRET; // Ganti dengan secret Anda

// Middleware untuk verifikasi JWT
function authenticateToken(req, res, next) {
  const token = req.cookies.jwt; // Mengambil token dari cookie
  console.log('Token:', token); // Log untuk melihat apakah token ada

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Invalid token:', err);
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
    
    req.user = user; 
    next();
  });
}
app.use("/uploads", express.static(uploadDir));



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Gunakan uploadDir yang sudah benar
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});


const upload = multer({ storage: storage });


// Menerima banyak file dengan key "files"
app.post("/upload", upload.array("files", 5), (req, res) => {
  try {
    console.log('Files in uploads folder:', fs.readdirSync(path.join(__dirname, 'uploads'))); // Log setelah upload
    res.json({ message: "File berhasil diunggah", files: req.files });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Error uploading files' });
  }
});

// Gambar SubMateri Editor
cron.schedule("* * * * *", async () => {
  console.log("⏳ Menjalankan cron job...");

  try {
    const sekarang = new Date(); // Ambil waktu sekarang (UTC)
    const satuJamLalu = new Date(sekarang.getTime() - 60 * 60 * 1000); // Kurangi 1 jam dalam milidetik
    // console.log("🕒 Waktu sekarang UTC:", sekarang.toISOString());
    // console.log("🕒 Batas waktu UTC untuk hapus:", satuJamLalu.toISOString());

    const gambarDihapus = await prisma.gambarMateri.deleteMany({
      where: {
        subMateriId: null,
        createdAt: { lte: satuJamLalu }, // Pastikan format waktu cocok
      },
    });

    if (gambarDihapus.count > 0) {
      console.log(`🗑️ ${gambarDihapus.count} gambar tanpa subMateriId dihapus`);
    } else {
      console.log("✅ Tidak ada gambar yang perlu dihapus");
    }
  } catch (error) {
    console.error("❌ Error saat menghapus gambar:", error.message);
  }
});

app.post("/gambar-materi", authenticateToken, upload.single("upload"), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    const file = req.file;
    const fileUrl = `http://localhost:3000/uploads/${file.filename}`;

    // Ambil subMateriId jika ada, jika tidak, set null
    let subMateriId = req.body.subMateriId ? parseInt(req.body.subMateriId, 10) : null;

    const gambarMateri = await prisma.gambarMateri.create({
      data: {
        url: fileUrl,
        subMateriId: subMateriId, // Simpan null jika belum ada SubMateri
      },
    });

    res.json({
      success: true,
      data: gambarMateri,
    });
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/gambar-materi", authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: "URL gambar tidak ditemukan" });

    const filename = url.split("/").pop();
    const filePath = path.join(__dirname, "uploads", filename);

    // Hapus dari database
    const deletedImage = await prisma.gambarMateri.deleteMany({ where: { url } });

    if (deletedImage.count > 0) {
      // Hapus file dari server
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true, message: "Gambar berhasil dihapus" });
    } else {
      res.status(404).json({ success: false, message: "Gambar tidak ditemukan di database" });
    }
  } catch (error) {
    console.error("❌ Error saat menghapus gambar:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/gambar-materi/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { subMateriId } = req.body;

    if (!subMateriId) {
      throw new Error("subMateriId is required");
    }

    const updatedGambarMateri = await prisma.gambarMateri.update({
      where: { id: parseInt(id, 10) },
      data: { subMateriId: parseInt(subMateriId, 10) },
    });

    res.json({
      success: true,
      data: updatedGambarMateri,
    });
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gambar SubMateri Editor End

// Simulasi penyimpanan OTP sementara (in-memory)
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
}

async function sendOtpEmail(toEmail, otp) {
  const msg = {
    to: toEmail,
    from: "ismailhusun2002@gmail.com",
    subject: "Universitas Banten Jaya - Kode OTP Verifikasi",
    text: `Kode OTP Anda untuk verifikasi akun E-Learning Universitas Banten Jaya adalah: ${otp}. Kode ini berlaku selama 5 menit sejak Anda menerima email ini.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #004080; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Universitas Banten Jaya</h1>
          <p style="margin: 5px 0 0; font-size: 14px;">Sistem E-Learning</p>
        </div>
        <div style="padding: 30px; color: #333;">
          <h2 style="color: #004080;">Kode OTP Verifikasi Anda</h2>
          <p>Halo,</p>
          <p>Terima kasih telah menggunakan layanan E-Learning Universitas Banten Jaya.</p>
          <p>Gunakan <strong style="font-size: 24px; letter-spacing: 3px;">${otp}</strong> sebagai kode OTP Anda untuk melanjutkan proses verifikasi.</p>
          <p><em>Kode ini berlaku selama 5 menit sejak Anda menerima email ini.</em></p>
          <p>Kode ini hanya berlaku dalam waktu singkat, mohon jangan berikan kode ini kepada siapapun.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #777;">
            Jika Anda tidak melakukan permintaan ini, abaikan email ini atau hubungi tim IT kami.
          </p>
        </div>
        <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #666;">
          © 2025 Universitas Banten Jaya - All rights reserved.<br />
          Jl. Syekh Moh. Nawawi Albantani No.2, Kp. Boru, Kec. Curug, Kota Serang, Banten 42171
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("OTP sent successfully to", toEmail);
  } catch (error) {
    console.error("Send OTP error:", error);
    if (error.response) {
      console.error("SendGrid error details:", error.response.body.errors);
    }
    throw error;
  }
}

app.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Email tidak terdaftar di sistem' });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

  const otpRecord = await prisma.otpToken.create({
    data: {
      email,
      otp,
      expiresAt,
    },
  });

  await sendOtpEmail(email, otp);

  res.json({
    message: 'OTP sent to email',
    otpId: otpRecord.id,
  });
});

app.post('/verify-otp', async (req, res) => {
  const { id, otp } = req.body;
  if (!id || !otp) return res.status(400).json({ error: 'ID dan OTP wajib diisi' });

  const record = await prisma.otpToken.findUnique({
    where: { id },
  });

  if (!record) {
    return res.status(400).json({ error: 'OTP tidak ditemukan' });
  }

  if (record.used) {
    return res.status(400).json({ error: 'OTP sudah digunakan' });
  }

  if (record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'OTP sudah kedaluwarsa' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'OTP tidak valid' });
  }

  await prisma.otpToken.update({
    where: { id },
    data: { used: true },
  });

  res.json({ message: 'OTP valid dan berhasil diverifikasi' });
});


app.get('/otp/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const otpRecord = await prisma.otpToken.findUnique({
      where: { id },
    });

    if (!otpRecord) {
      return res.status(404).json({ error: 'OTP not found' });
    }

    res.json({
      id: otpRecord.id,
      email: otpRecord.email,
      expiresAt: otpRecord.expiresAt,
      used: otpRecord.used,
      createdAt: otpRecord.createdAt,
    });
  } catch (error) {
    console.error('Error getting OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/change-password', async (req, res) => {
  const { id, newPassword } = req.body;
  if (!id || !newPassword) {
    return res.status(400).json({ error: 'ID token dan password baru wajib diisi' });
  }

  try {
    // Cari token OTP yang sudah digunakan
    const tokenRecord = await prisma.otpToken.findUnique({ where: { id } });

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token OTP tidak ditemukan' });
    }

    if (!tokenRecord.used) {
      return res.status(400).json({ error: 'Token OTP belum digunakan/verifikasi' });
    }

    // Cari user berdasarkan email dari token
    const user = await prisma.users.findUnique({ where: { email: tokenRecord.email } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password user
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Hapus token OTP yang sudah dipakai
    await prisma.otpToken.delete({ where: { id } });

    res.json({ message: 'Password berhasil diubah dan token terhapus' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengubah password' });
  }
});


async function deleteExpiredOtpTokens() {
  try {
    const now = new Date();

    const deleted = await prisma.otpToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(`Deleted ${deleted.count} expired OTP token(s).`);
  } catch (error) {
    console.error('Error deleting expired OTP tokens:', error);
  }
}


// Jalankan fungsi setiap 1 menit
setInterval(() => {
  deleteExpiredOtpTokens();
}, 1 * 60 * 1000);









// Rute utama (protected)
app.get('/', authenticateToken, (req, res) => {
  // Mengakses informasi pengguna dari req.user
  const userInfo = req.user;
  const token = req.cookies.jwt;

  // Mengirimkan informasi pengguna dan token sebagai objek JSON
  res.json({
    userInfo: userInfo,
    token: token
  });
});

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY_GEMINI });

app.post("/chat",  authenticateToken, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [{ parts: [{ text: message }] }],
    });

    const botReply = response.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak bisa menjawab saat ini.";
    res.json({ reply: botReply });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan saat menghubungi Gemini AI." });
  }
});

// Register user baru
app.post('/register', async (req, res) => {
  const { nomorinduk, nama, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.users.create({
      data: {
        nomorinduk,
        nama,
        email,
        password: hashedPassword,
        role
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'User already exists' });
  }
});

// Login dan dapatkan token
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.users.findUnique({ where: { email } });
    
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Invalid credentials' });
  
    const token = jwt.sign({ id: user.id, nomorinduk: user.nomorinduk, nama:user.nama, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  
    // Mengatur cookie dengan HttpOnly dan Secure
    res.cookie('jwt', token, {
      httpOnly: true, // Mencegah akses cookie dari JavaScript
      // secure: process.env.NODE_ENV === 'production', // Hanya kirim cookie melalui HTTPS jika di lingkungan produksi
      secure: false, 
      maxAge: 86400000, // Kedaluwarsa 1 jam dalam milidetik (3600000 ms)
      sameSite: 'Strict' // Mencegah pengiriman cookie dari domain lain
    });
    console.log('Setting cookie with token:', token);
  
    res.status(200).json({ message: 'Login successful', token: token, role: user.role, });
});

// Dashboard Admin
app.get('/dashboard/counts', authenticateToken, async (req, res) => {
  try {
    const jumlahMahasiswa = await prisma.users.count({
      where: { role: "Mahasiswa" },
    });

    const jumlahDosen = await prisma.users.count({
      where: { role: "Dosen" },
    });

    const jumlahMataKuliah = await prisma.mataKuliah.count();

    const jumlahFeedback = await prisma.HubungiKami.count();

    res.json({
      mahasiswa: jumlahMahasiswa,
      dosen: jumlahDosen,
      mataKuliah: jumlahMataKuliah,
      feedback: jumlahFeedback,
    });
  } catch (error) {
    console.error("Gagal mengambil data:", error);
    res.status(500).json({ message: "Gagal mengambil data" });
  }
});


// Get all users (protected route)
app.get('/users', authenticateToken, async (req, res) => {
  const users = await prisma.users.findMany();
  res.json(users);
});

// Get all users (Mahasiswa)
app.get('/mahasiswa', authenticateToken, async (req, res) => {
  try {
    const mahasiswa = await prisma.users.findMany({
      where: { role: "Mahasiswa" },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        role: true,
        tanggalDaftar: true,
      },
    });

    res.json(mahasiswa);
  } catch (error) {
    console.error("Gagal mengambil data mahasiswa:", error);
    res.status(500).json({ message: "Gagal mengambil data mahasiswa" });
  }
});


// Get user by ID (protected route)
app.get('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Mencari pengguna berdasarkan id
  const user = await prisma.users.findUnique({
    where: {
      id: parseInt(id), // Pastikan id dikonversi menjadi angka
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json(user);
});

// PUT profile me
app.put('/users/me', authenticateToken, async (req, res) => {
  try {

    const { nama, email, role, newNomorInduk, password } = req.body;

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
      console.log("Hashed password:", hashedPassword);  // Log hashed password untuk debug
    }
    const userId = req.user?.id;

    const user = await prisma.users.update({
      where: {
        id: userId,  // Menggunakan userId dari token yang diambil
      },
      data: {
        nama,
        email,
        role,
        nomorinduk: newNomorInduk,
        ...(hashedPassword && { password: hashedPassword }),  // Simpan password hanya jika ada
      },
    });

    res.json(user);  // Kirimkan user yang sudah diupdate ke response
  } catch (error) {
    console.error("Update failed:", error);  // Log error untuk debugging
    res.status(400).json({ error: 'Update failed' });
  }
});

// Put profile by admin
app.put('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nama, email, role, newNomorInduk, password } = req.body;

  try {
    // Cek apakah password baru diberikan
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
      console.log("Hashed password:", hashedPassword); // Log hashed password untuk debug
    }

    const user = await prisma.users.update({
      where: {
        id: parseInt(id),
      },
      data: {
        nama,
        email,
        role,
        nomorinduk: newNomorInduk,
        ...(hashedPassword && { password: hashedPassword }), // Hanya simpan hashedPassword jika ada
      },
    });
    res.json(user);
  } catch (error) {
    console.error("Update failed:", error); // Log error untuk debugging
    res.status(400).json({ error: 'Update failed' });
  }
});


// Delete user by ID (protected route)
app.delete('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.users.delete({
      where: {
        id: parseInt(id), // Pastikan id diubah menjadi integer
      },
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  res.cookie('jwt', '', { 
    httpOnly: true, 
    secure: false, // Atur ke true jika Anda menggunakan HTTPS
    sameSite: 'Strict', 
    expires: new Date(0) // Set expires ke tanggal yang sudah lewat
  });
  res.status(200).json({ message: 'Logout successful' });
});


const crypto = require('crypto'); // Import crypto untuk menghasilkan kode acak

// Fungsi untuk menghasilkan kode gabung
function generateKodeGabung( dosenId, mataKuliahId) {
  const randomPart = crypto.randomBytes(10).toString('hex'); // Generate 6 random hex characters
  const combinedId = `${dosenId}${mataKuliahId}${randomPart}`;
  
  // Acak urutan dan batasi panjang kodeGabung hanya 20 karakter
  return combinedId.split('').sort(() => Math.random() - 0.5).join('').substring(0, 20);
}


// Get All Mahasiswa
app.get('/mahasiswa', authenticateToken, async (req, res) => {
  try {
    const mahasiswa = await prisma.users.findMany({
      where: {
        role: 'Mahasiswa',
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
      },
    });

    res.status(200).json({ success: true, data: mahasiswa });
  } catch (error) {
    console.error('Error saat mengambil data mahasiswa:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// Get Mahasiswa By Id
app.get('/mahasiswa/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const mahasiswa = await prisma.users.findUnique({
      where: {
        id: parseInt(id),
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
        role: true,
      },
    });

    if (!mahasiswa || mahasiswa.role !== 'Mahasiswa') {
      return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
    }

    res.status(200).json({ success: true, data: mahasiswa });
  } catch (error) {
    console.error('Error saat mengambil data mahasiswa berdasarkan ID:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

app.get('/matakuliah/admin', authenticateToken, async (req, res) => {
  try {
    const mataKuliah = await prisma.mataKuliah.findMany({
      include: {
        dosen: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
        mahasiswa: {
          select: {
            id: true,
            mahasiswaId: true,
            mahasiswa: {
              select: {
                id: true,
                nama: true,
                email: true,
              },
            },
          },
        },
        materi: true,
        kuisioner: true,
      },
      orderBy: {
        tanggalDibuat: 'desc',
      },
    });

    const result = mataKuliah.map(mk => ({
      id: mk.id,
      nama: mk.nama,
      kodeGabung: mk.kodeGabung,
      tanggalDibuat: mk.tanggalDibuat,
      dosen: mk.dosen,
      jumlahMahasiswa: mk.mahasiswa.length,
      jumlahMateri: mk.materi.length,
      jumlahKuisioner: mk.kuisioner.length,
    }));

    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('Error fetching mata kuliah:', error);
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data mata kuliah' });
  }
});

// Get All Dosen
app.get('/dosen', authenticateToken, async (req, res) => {
  try {
    const dosen = await prisma.users.findMany({
      where: {
        role: 'Dosen',
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
      },
    });

    res.status(200).json({ success: true, data: dosen });
  } catch (error) {
    console.error('Error saat mengambil data dosen:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// Get Dosen By Id
app.get('/dosen/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const dosen = await prisma.users.findFirst({
      where: {
        id: parseInt(id),
        role: 'Dosen',
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
      },
    });

    if (!dosen) {
      return res.status(404).json({ success: false, message: 'Dosen tidak ditemukan' });
    }

    res.status(200).json({ success: true, data: dosen });
  } catch (error) {
    console.error('Error saat mengambil data dosen berdasarkan ID:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// Edit Dosen
app.put('/dosen/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nomorinduk, nama, email, tanggalDaftar } = req.body;

  try {
    // Cek apakah dosen dengan ID tersebut ada
    const existingDosen = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingDosen || existingDosen.role !== 'Dosen') {
      return res.status(404).json({ success: false, message: 'Dosen tidak ditemukan' });
    }

    // Update data dosen
    const updatedDosen = await prisma.users.update({
      where: { id: parseInt(id) },
      data: {
        nomorinduk,
        nama,
        email,
        tanggalDaftar,
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
      },
    });

    res.status(200).json({ success: true, data: updatedDosen });
  } catch (error) {
    console.error('Error saat memperbarui data dosen:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// Delete Dosen
app.delete('/dosen/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const dosenId = parseInt(id);

  try {
    // Ambil data dosen beserta mata kuliah yang diajarkan
    const dosen = await prisma.users.findUnique({
      where: { id: dosenId },
      include: {
        mataKuliahDiajarkan: {
          include: {
            materi: {
              include: {
                subMateri: {
                  include: {
                    GambarMateri: true,
                    fileMateri: true,
                    progressSubMateri: true,
                  }
                },
              },
            },
          },
        },
      },
    });

    if (!dosen || dosen.role !== 'Dosen') {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }

    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Cek role user (hanya Admin yang bisa hapus dosen, misal)
    if (user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: hanya admin yang bisa hapus dosen' });
    }

    // Hapus gambar materi dosen
    for (const mataKuliah of dosen.mataKuliahDiajarkan) {
      for (const materi of mataKuliah.materi) {
        for (const subMateri of materi.subMateri) {
          for (const gambar of subMateri.GambarMateri) {
            await prisma.gambarMateri.delete({ where: { id: gambar.id } });
          }
          for (const file of subMateri.fileMateri) {
            await prisma.fileMateri.delete({ where: { id: file.id } });
          }
          await prisma.MahasiswaProgressSubMateri.deleteMany({
            where: { subMateriId: subMateri.id },
          });
          await prisma.JawabanMahasiswaKuis.deleteMany({
            where: { subMateriId: subMateri.id },
          });
        }
        await prisma.SubMateri.deleteMany({ where: { materiId: materi.id } });
      }
      await prisma.Materi.deleteMany({ where: { mataKuliahId: mataKuliah.id } });
    }

    // Hapus mata kuliah yang dosen ajarkan
    await prisma.MataKuliah.deleteMany({ where: { dosen: { some: { id: dosenId } } } });

    // Hapus kuisioner dosen
    await prisma.Kuisioner.deleteMany({ where: { dosenId } });

    // Hapus dosen
    await prisma.users.delete({ where: { id: dosenId } });

    return res.json({ message: 'Dosen dan data jajarannya berhasil dihapus' });
  } catch (error) {
    console.error('Error hapus dosen:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// Delete Mahasiswa
app.delete('/mahasiswa/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const mahasiswaId = parseInt(id);

  try {
    // Ambil data mahasiswa beserta relasi yang perlu dihapus
    const mahasiswa = await prisma.users.findUnique({
      where: { id: mahasiswaId },
      include: {
        mataKuliahDiikuti: true,
        progressSubMateri: true,
        jawabanKuis: true,
        kuisionerMahasiswa: true,
      },
    });

    if (!mahasiswa || mahasiswa.role !== 'Mahasiswa') {
      return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    }

    // Cek role user, misal hanya Admin yang bisa hapus mahasiswa
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    if (user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: hanya admin yang bisa hapus mahasiswa' });
    }

    // Hapus data relasi yang terkait dengan mahasiswa
    await prisma.MataKuliahMahasiswa.deleteMany({
      where: { mahasiswaId },
    });

    await prisma.MahasiswaProgressSubMateri.deleteMany({
      where: { mahasiswaId },
    });

    await prisma.JawabanMahasiswaKuis.deleteMany({
      where: { mahasiswaId },
    });

    await prisma.Kuisioner.deleteMany({
      where: { mahasiswaId },
    });

    // Hapus mahasiswa
    await prisma.users.delete({
      where: { id: mahasiswaId },
    });

    return res.json({ message: 'Mahasiswa dan data jajarannya berhasil dihapus' });
  } catch (error) {
    console.error('Error hapus mahasiswa:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// Tambah Data Dosen
app.post('/dosen', authenticateToken, async (req, res) => {
  const { nomorinduk, nama, email, password, tanggalDaftar } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password wajib diisi' });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDosen = await prisma.users.create({
      data: {
        nomorinduk,
        nama,
        email,
        password: hashedPassword,
        tanggalDaftar: tanggalDaftar || new Date(),
        role: 'Dosen',
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
        role: true,
      },
    });

    res.status(201).json({ success: true, data: newDosen });
  } catch (error) {
    console.error('Error saat menambah data dosen:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// Edit Mahasiswa
app.put('/mahasiswa/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nomorinduk, nama, email, tanggalDaftar } = req.body;

  try {
    // Cek apakah mahasiswa dengan ID tersebut ada
    const existingMahasiswa = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingMahasiswa || existingMahasiswa.role !== 'Mahasiswa') {
      return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
    }

    // Update data mahasiswa
    const updatedMahasiswa = await prisma.users.update({
      where: { id: parseInt(id) },
      data: {
        nomorinduk,
        nama,
        email,
        tanggalDaftar,
      },
      select: {
        id: true,
        nomorinduk: true,
        nama: true,
        email: true,
        tanggalDaftar: true,
      },
    });

    res.status(200).json({ success: true, data: updatedMahasiswa });
  } catch (error) {
    console.error('Error saat memperbarui data mahasiswa:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// Rute untuk membuat mata kuliah
app.post('/mata-kuliah', authenticateToken, async (req, res) => {
  const { nama } = req.body; // Menambahkan hari ke body request

  try {
    // Mendapatkan data pengguna berdasarkan ID
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Validasi role pengguna
    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers can create courses' });
    }

    // Membuat mata kuliah
    const mataKuliah = await prisma.MataKuliah.create({
      data: {
        nama,
        kodeGabung: generateKodeGabung( req.user.id), // Menghasilkan kode gabung
        dosen: {
          connect: { id: req.user.id } // Mengaitkan dosen yang sedang login
        }
      },
      include: {
        dosen: true, // Menyertakan informasi dosen
      },
    });

    // Mengambil nama dosen
    const namaDosen = user.nama;

    // Kembalikan respons dengan data mata kuliah dan nama dosen
    res.status(201).json({
      mataKuliah,
      namaDosen, // Menyertakan nama dosen pada respons
    });
  } catch (error) {
    console.error('Error creating mata kuliah:', error);
    res.status(400).json({ error: 'Failed to create mata kuliah' });
  }
});

// Get All Mata Kuliah
app.get('/mata-kuliah', authenticateToken, async (req, res) => {
  try {
    const mataKuliahList = await prisma.MataKuliah.findMany({
      include: {
        dosen: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(mataKuliahList);
  } catch (error) {
    console.error('Error fetching mata kuliah:', error);
    res.status(500).json({ error: 'Failed to fetch mata kuliah' });
  }
});


// Perbarui Code Mata Kuliah
app.put('/mata-kuliah/:id/update-kode', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Cek apakah user adalah dosen
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers can update the course code' });
    }

    // Cek apakah mata kuliah ada dan dimiliki oleh dosen yang sedang login
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(id) },
      include: { dosen: true },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah not found' });
    }

    const isDosenAuthorized = mataKuliah.dosen.some((d) => d.id === req.user.id);

    if (!isDosenAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to update this course code' });
    }

    // Generate kode baru
    const newKodeGabung = generateKodeGabung(req.user.id);

    // Update kode gabung
    const updatedMataKuliah = await prisma.MataKuliah.update({
      where: { id: parseInt(id) },
      data: { kodeGabung: newKodeGabung },
    });

    res.status(200).json({
      message: 'Kode gabung updated successfully',
      updatedMataKuliah,
    });
  } catch (error) {
    console.error('Error updating kode gabung:', error);
    res.status(400).json({ error: 'Failed to update kode gabung' });
  }
});

// Get Detail Mata Kuliah
app.get('/mata-kuliah/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Mencari mata kuliah berdasarkan ID
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(id) },
      include: {
        dosen: {
          select: {
            id: true,
            nama: true,
            email: true,
            nomorinduk: true,
          },
        },
        mahasiswa: true,
      },
    });
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }
    
    const isOwner = mataKuliah.dosen?.some(dosen => dosen.id === user.id) ?? false;
    const isStudentEnrolled = mataKuliah.mahasiswa?.some(mahasiswa => mahasiswa.mahasiswaId === user.id) ?? false;
    console.log(isStudentEnrolled)
    

    if (user.role === 'Dosen') {
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: Only the lecturer who created the course can edit it' });
      }
    } else if (user.role === 'Mahasiswa') {
      if (!isStudentEnrolled) {
        return res.status(403).json({ error: 'Forbidden: Only enrolled students can access this course' });
      }
    } else if (user.role === 'Admin') {
      // Admin bebas akses
    } else {
      return res.status(403).json({ error: 'Forbidden: Unauthorized access' });
    }



    res.json(mataKuliah);
  } catch (error) {
    console.error('Error fetching mata kuliah:', error);
    res.status(500).json({ error: 'Gagal mengambil data mata kuliah' });
  }
});

// Edit a course by ID (protected route)
app.put('/mata-kuliah/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nama} = req.body;

  try {
    // Mendapatkan data pengguna berdasarkan ID
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Validasi role pengguna
    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers can edit courses' });
    }

    // Mendapatkan data mata kuliah
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(id) },
      include: { dosen: true }, // Menyertakan dosen yang mengajar
    });

    // Validasi jika mata kuliah ditemukan
    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah not found' });
    }

    // Validasi jika dosen yang membuat mata kuliah
    const isOwner = mataKuliah.dosen.some(dosen => dosen.id === user.id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: Only the lecturer who created the course can edit it' });
    }

    // Mengupdate mata kuliah
    const updatedMataKuliah = await prisma.MataKuliah.update({
      where: {
        id: parseInt(id),
      },
      data: {
        nama,
      },
    });

    // Kembalikan respons dengan data mata kuliah yang diperbarui
    res.json(updatedMataKuliah);
  } catch (error) {
    console.error('Error updating mata kuliah:', error);
    res.status(400).json({ error: 'Failed to update mata kuliah' });
  }
});

// Delete a course by ID (protected route)
app.delete('/mata-kuliah/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Ambil data mata kuliah beserta relasi
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(id) },
      include: {
        dosen: true,
        materi: {
          include: {
            subMateri: {
              include: {
                GambarMateri: true,
                fileMateri: true,
                progressSubMateri: true,
              }
            },
          },
        },
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah not found' });
    }

    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Admin bisa langsung hapus tanpa cek kepemilikan
    if (user.role !== 'Dosen' && user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers or admins can delete courses' });
    }

    if (user.role === 'Dosen') {
      // Cek dosen owner
      const isOwner = mataKuliah.dosen.some(dosen => dosen.id === user.id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: Only the lecturer who created the course can delete it' });
      }
    }

    // Hapus gambar terkait
    for (const materi of mataKuliah.materi) {
      const subMateriList = await prisma.SubMateri.findMany({
        where: { materiId: materi.id },
        include: { GambarMateri: true },
      });

      for (const subMateri of subMateriList) {
        for (const gambar of subMateri.GambarMateri) {
          await prisma.gambarMateri.delete({
            where: { id: gambar.id },
          });
        }
      }
    }

    // Hapus subMateri
    await prisma.SubMateri.deleteMany({
      where: {
        materi: {
          mataKuliahId: parseInt(id),
        },
      },
    });

    // Hapus materi
    await prisma.Materi.deleteMany({
      where: {
        mataKuliahId: parseInt(id),
      },
    });

    // Hapus mata kuliah
    await prisma.MataKuliah.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.json({ message: 'Mata kuliah deleted successfully' });
  } catch (error) {
    console.error('Error deleting mata kuliah:', error);
    res.status(400).json({ error: 'Failed to delete mata kuliah' });
  }
});


// Mahasiswa bergabung ke mata kuliah menggunakan kode gabung
app.post('/mata-kuliah/join', authenticateToken, async (req, res) => {
  const { kodeGabung } = req.body; // Kode gabung mata kuliah yang ingin diikuti

  try {
    // Cek apakah mata kuliah dengan kode gabung tersebut ada
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { kodeGabung: kodeGabung },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Periksa apakah mahasiswa sudah terdaftar di mata kuliah tersebut
    const sudahTerdaftar = await prisma.mataKuliahMahasiswa.findFirst({
      where: {
        mahasiswaId: req.user.id,
        mataKuliahId: mataKuliah.id,
      },
    });

    if (sudahTerdaftar) {
      return res.status(400).json({ error: 'Anda sudah terdaftar di mata kuliah ini' });
    }

    // Tambahkan mahasiswa ke mata kuliah (melalui tabel pivot)
    await prisma.mataKuliahMahasiswa.create({
      data: {
        mahasiswa: { connect: { id: req.user.id } }, // Hubungkan dengan mahasiswa
        mataKuliah: { connect: { id: mataKuliah.id } }, // Hubungkan dengan mata kuliah
        tanggalGabung: new Date(), // Simpan tanggal bergabung
      },
    });

    res.status(200).json({ message: 'Berhasil bergabung ke mata kuliah' });
  } catch (error) {
    console.error('Error joining mata kuliah:', error);
    res.status(500).json({ error: 'Gagal bergabung ke mata kuliah' });
  }
});

// Mahasiswa menghapus mata kuliah yang diikuti
app.delete('/mata-kuliah/leave/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = Number(req.user.id);

  try {
    console.log('🔍 Mencari mata kuliah dengan ID:', id);

    // Ambil data mata kuliah beserta daftar mahasiswa
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(id) },
      include: { mahasiswa: { select: { mahasiswaId: true } } },
    });

    // Jika mata kuliah tidak ditemukan
    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Periksa apakah mahasiswa terdaftar di mata kuliah
    const isMahasiswaTerdaftar = mataKuliah.mahasiswa.some(m => Number(m.mahasiswaId) === userId);

    if (!isMahasiswaTerdaftar) {
      return res.status(400).json({ error: 'Anda tidak terdaftar di mata kuliah ini' });
    }

    // Hapus jawaban kuis mahasiswa
    await prisma.jawabanMahasiswaKuis.deleteMany({
      where: { mahasiswaId: userId }
    });

    // Hapus progress sub-materi mahasiswa
    await prisma.mahasiswaProgressSubMateri.deleteMany({
      where: { mahasiswaId: userId }
    });

    // Hapus hubungan mahasiswa dengan mata kuliah
    await prisma.mataKuliahMahasiswa.deleteMany({
      where: {
        mahasiswaId: userId,
        mataKuliahId: parseInt(id),
      },
    });

    res.status(200).json({ message: 'Berhasil meninggalkan mata kuliah' });

  } catch (error) {
    res.status(500).json({ error: 'Gagal meninggalkan mata kuliah' });
  }
});

// Dosen menghapus mata kuliah yang diikuti Mahasiswa
app.delete('/mata-kuliah/:mataKuliahId/mahasiswa/:mahasiswaId', authenticateToken, async (req, res) => {
  const { mataKuliahId, mahasiswaId } = req.params;
  const userId = Number(req.user.id);

  try {
    // Ambil data user dan mata kuliah yang diajarkan
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        mataKuliahDiajarkan: true,
      },
    });

    if (!user || (user.role !== 'Dosen' && user.role !== 'Admin')) {
      return res.status(403).json({ error: 'Hanya dosen atau admin yang dapat menghapus mahasiswa dari mata kuliah' });
    }

    console.log(`🔍 ${user.role} (ID: ${userId}) mencoba menghapus Mahasiswa (ID: ${mahasiswaId}) dari Mata Kuliah (ID: ${mataKuliahId})`);

    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: parseInt(mataKuliahId) },
      include: {
        dosen: true,
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Jika user adalah dosen, cek apakah dia dosen pengajar pada mata kuliah ini
    if (user.role === 'Dosen') {
      const isDosenPengajar = mataKuliah.dosen.some(d => d.id === userId);
      if (!isDosenPengajar) {
        return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengelola mata kuliah ini' });
      }
    }

    // Cek apakah mahasiswa terdaftar
    const isMahasiswaTerdaftar = await prisma.mataKuliahMahasiswa.findFirst({
      where: {
        mataKuliahId: parseInt(mataKuliahId),
        mahasiswaId: parseInt(mahasiswaId),
      },
    });

    if (!isMahasiswaTerdaftar) {
      return res.status(400).json({ error: 'Mahasiswa tidak terdaftar di mata kuliah ini' });
    }

    // Hapus data terkait mahasiswa dari mata kuliah tersebut
    await prisma.$transaction([
      prisma.jawabanMahasiswaKuis.deleteMany({ where: { mahasiswaId: parseInt(mahasiswaId) } }),
      prisma.mahasiswaProgressSubMateri.deleteMany({ where: { mahasiswaId: parseInt(mahasiswaId) } }),
      prisma.mataKuliahMahasiswa.deleteMany({
        where: {
          mahasiswaId: parseInt(mahasiswaId),
          mataKuliahId: parseInt(mataKuliahId),
        }
      })
    ]);

    res.status(200).json({ message: 'Mahasiswa berhasil dihapus dari mata kuliah' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menghapus mahasiswa dari mata kuliah' });
  }
});


// Hpaus semua mahasiswa dalam mata kuliah (Dosen)
app.delete('/mata-kuliah/:mataKuliahId/mahasiswa', authenticateToken, async (req, res) => {
  const { mataKuliahId } = req.params;
  const userId = Number(req.user.id);

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        mataKuliahDiajarkan: true,
      },
    });

    if (!user || (user.role !== 'Dosen' && user.role !== 'Admin')) {
      return res.status(403).json({ error: 'Hanya dosen atau admin yang dapat menghapus mahasiswa dari mata kuliah' });
    }

    console.log(`🔍 User (ID: ${userId}, role: ${user.role}) mencoba menghapus semua mahasiswa dari Mata Kuliah (ID: ${mataKuliahId})`);

    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(mataKuliahId) },
      include: {
        dosen: true,
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    const isDosenPengajar = mataKuliah.dosen.some(d => d.id === userId);
    if (user.role !== 'Admin' && !isDosenPengajar) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengelola mata kuliah ini' });
    }

    const mahasiswaTerdaftar = await prisma.mataKuliahMahasiswa.findMany({
      where: { mataKuliahId: parseInt(mataKuliahId) },
    });

    if (mahasiswaTerdaftar.length === 0) {
      return res.status(400).json({ error: 'Tidak ada mahasiswa yang terdaftar di mata kuliah ini' });
    }

    const mahasiswaIds = mahasiswaTerdaftar.map(m => m.mahasiswaId);

    await prisma.$transaction([
      prisma.jawabanMahasiswaKuis.deleteMany({
        where: { mahasiswaId: { in: mahasiswaIds } }
      }),
      prisma.mahasiswaProgressSubMateri.deleteMany({
        where: { mahasiswaId: { in: mahasiswaIds } }
      }),
      prisma.mataKuliahMahasiswa.deleteMany({
        where: { mataKuliahId: parseInt(mataKuliahId) }
      })
    ]);

    res.status(200).json({ message: 'Semua mahasiswa berhasil dihapus dari mata kuliah' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal menghapus semua mahasiswa dari mata kuliah' });
  }
});

// Route untuk mendapatkan semua mata kuliah yang diikuti mahasiswa atau diajarkan dosen
app.get('/matakuliah', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    let mataKuliahDiikuti = [];
    let mataKuliahDiajarkan = [];

    if (role === 'Mahasiswa') {
      const mahasiswa = await prisma.MataKuliahMahasiswa.findMany({
        where: { mahasiswaId: id },
        include: {
          mataKuliah: {
            include: {
              dosen: true,
            },
          },
        },
      });

      mataKuliahDiikuti = mahasiswa.map((mk) => ({
        id: mk.mataKuliah.id,
        namaMataKuliah: mk.mataKuliah.nama,
        namaDosen: mk.mataKuliah.dosen.map((d) => d.nama),
      }));
    }

    if (role === 'Dosen') {
      const dosen = await prisma.users.findUnique({
        where: { id: id },
        include: {
          mataKuliahDiajarkan: {
            include: {
              dosen: true,
            },
          },
        },
      });

      if (dosen) {
        mataKuliahDiajarkan = dosen.mataKuliahDiajarkan.map((mk) => ({
          id: mk.id,
          namaMataKuliah: mk.nama,
          namaDosen: mk.dosen.map((d) => d.nama),
        }));
      }
    }

    res.status(200).json({
      mataKuliahDiikuti,
      mataKuliahDiajarkan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// POST Duplikat data Mata Kuliah
app.post('/mata-kuliah/duplikat/:id', authenticateToken, async (req, res) => {
  const mataKuliahId = parseInt(req.params.id, 10);

  try {
    const original = await prisma.mataKuliah.findUnique({
      where: { id: mataKuliahId },
      include: {
        materi: {
          include: {
            subMateri: {
              include: {
                fileMateri: true,
                GambarMateri: true,
              }
            }
          }
        }
      }
    });

    if (!original) return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });

    // Buat duplikat mata kuliah
    const newMataKuliah = await prisma.mataKuliah.create({
      data: {
        nama: original.nama + ' (Copy)',
        kodeGabung: generateKodeGabung(req.user.id),
        dosen: {
          connect: { id: req.user.id }
        },
        materi: {
          create: original.materi.map(m => ({
            judul: m.judul,
            subMateri: {
              create: m.subMateri.map(sm => ({
                judul: sm.judul,
                type: sm.type,
                isi: sm.isi,
                pertanyaan: sm.pertanyaan,
                pilihan: sm.pilihan,
                jawabanBenar: sm.jawabanBenar,
                syaratKelulusan: sm.syaratKelulusan,
                durasiMengerjakan: sm.durasiMengerjakan,
                durasiUlang: sm.durasiUlang,
                urutan: sm.urutan,
                fileMateri: {
                  create: sm.fileMateri.map(fm => ({
                    url: fm.url,
                    idSoal: fm.idSoal,
                  }))
                },
                GambarMateri: {
                  create: sm.GambarMateri.map(gm => ({
                    url: gm.url,
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        dosen: true,
        materi: true
      }
    });

    res.status(201).json({ message: 'Berhasil menyalin mata kuliah', newMataKuliah });

  } catch (error) {
    console.error('Gagal menduplikat:', error);
    res.status(500).json({ error: 'Gagal menduplikat mata kuliah' });
  }
});

// Tambahkan materi baru ke mata kuliah
app.post('/materi', authenticateToken, async (req, res) => {
  const { mataKuliahId, judul } = req.body;

  try {
    // Cek apakah pengguna adalah dosen
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Hanya dosen yang dapat menambahkan materi' });
    }

    // Cek apakah mata kuliah tersebut ada dan apakah dosen tersebut mengajar mata kuliah tersebut
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: mataKuliahId },
      include: {
        dosen: true, // Ambil data dosen yang mengajar mata kuliah
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Cek apakah dosen yang mengajar mata kuliah adalah dosen yang saat ini logged in
    const isDosenPengajar = mataKuliah.dosen.some(dosen => dosen.id === req.user.id);

    if (!isDosenPengajar) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk menambahkan materi ke mata kuliah ini' });
    }

    // Tambahkan materi
    const materi = await prisma.Materi.create({
      data: {
        judul: judul,
        mataKuliahId: mataKuliahId,
      },
    });

    res.status(201).json({ message: 'Materi berhasil ditambahkan', materi });
  } catch (error) {
    console.error('Error adding materi:', error);
    res.status(500).json({ error: 'Gagal menambahkan materi' });
  }
});

// Endpoint untuk mendapatkan semua materi dari mata kuliah tertentu
app.get('/materi/:mataKuliahId', authenticateToken, async (req, res) => {
  const { mataKuliahId } = req.params;

  try {
    // Cek pengguna
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Ambil data mata kuliah beserta relasi dosen dan mahasiswa
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: parseInt(mataKuliahId) },
      include: {
        dosen: true,
        mahasiswa: {
          include: {
            mahasiswa: true,
          },
        },
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Cek apakah user adalah dosen pemilik mata kuliah
    const isOwner = mataKuliah.dosen.some(dosen => dosen.id === user.id);
    
    // Cek apakah user adalah mahasiswa yang terdaftar dalam mata kuliah ini
    const isStudentEnrolled = mataKuliah.mahasiswa.some(mkm => mkm.mahasiswa.id === user.id);

    console.log({ isOwner, isStudentEnrolled });

    // Validasi akses berdasarkan role
    if (user.role === 'Dosen' && !isOwner) {
      return res.status(403).json({ error: 'Forbidden: Hanya dosen yang mengajar mata kuliah ini yang dapat mengedit' });
    }

    if (user.role === 'Mahasiswa' && !isStudentEnrolled) {
      return res.status(403).json({ error: 'Forbidden: Hanya mahasiswa yang terdaftar yang dapat mengakses' });
    }

    // Ambil semua materi dari mata kuliah tersebut
    const materi = await prisma.materi.findMany({
      where: { mataKuliahId: parseInt(mataKuliahId) },
    });

    res.status(200).json(materi);
  } catch (error) {
    console.error('Error getting materi:', error);
    res.status(500).json({ error: 'Gagal mendapatkan materi' });
  }
});

// Endpoint untuk memperbarui materi
app.put('/materi/:materiId', authenticateToken, async (req, res) => {
  const { materiId } = req.params;
  const { judul, isi, gambar } = req.body; // Data yang akan di-update

  try {
    // Ambil pengguna yang sedang login
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Hanya dosen yang dapat mengedit materi.' });
    }

    // Ambil materi berdasarkan ID
    const materi = await prisma.Materi.findUnique({
      where: { id: parseInt(materiId) },
      include: {
        mataKuliah: {
          include: {
            dosen: true, // Ambil dosen yang mengajar mata kuliah ini
          },
        },
      },
    });

    if (!materi) {
      return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    }

    // Cek apakah dosen yang sedang login mengajar mata kuliah tersebut
    const isDosenMengajar = materi.mataKuliah.dosen.some(d => d.id === user.id);
    if (!isDosenMengajar) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengedit materi ini.' });
    }

    // Update materi
    const updatedMateri = await prisma.Materi.update({
      where: { id: parseInt(materiId) },
      data: {
        judul,
        subMateri: {
          updateMany: gambar ? gambar.map((url) => ({
            where: { id: materiId }, // Kondisi berdasarkan materi terkait
            data: { gambar: { update: { url } } } // Update gambar
          })) : [],
        },
      },
    });

    res.status(200).json(updatedMateri);
  } catch (error) {
    console.error('Error updating materi:', error);
    res.status(500).json({ error: 'Gagal mengupdate materi.' });
  }
});

// Endpoint untuk menghapus materi
app.delete('/materi/:materiId', authenticateToken, async (req, res) => {
  const { materiId } = req.params;

  try {
    // Cek apakah pengguna adalah dosen
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      include: {
        mataKuliahDiajarkan: true, // Ambil mata kuliah yang diajarkan dosen
      },
    });

    if (!user || user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Hanya dosen yang dapat menghapus materi' });
    }

    // Ambil materi untuk validasi
    const materi = await prisma.Materi.findUnique({
      where: { id: parseInt(materiId) },
      include: {
        mataKuliah: {
          include: {
            dosen: true, // Ambil data dosen yang mengajar mata kuliah terkait
          },
        },
      },
    });

    if (!materi) {
      return res.status(404).json({ error: 'Materi tidak ditemukan' });
    }

    const isDosenPengajar = materi.mataKuliah.dosen.some(d => d.id === user.id);
    if (!isDosenPengajar) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk menghapus materi ini' });
    }

    await prisma.subMateri.deleteMany({
      where: { materiId: parseInt(materiId) },
    });
    // Hapus materi
    await prisma.Materi.delete({
      where: { id: parseInt(materiId) },
    });

    res.status(200).json({ message: 'Materi berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting materi:', error);
    res.status(500).json({ error: 'Gagal menghapus materi' });
  }
});

//Endpoin untuk aktifkan materi atau tidak
app.put('/materi/:id/status', authenticateToken, async (req, res) => {
  try {
    const materiId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const user = req.user; // Dapatkan data user dari token

    // ✅ Validasi role user harus "Dosen"
    if (!user || user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Hanya dosen yang dapat mengubah status materi' });
    }

    // ✅ Ambil materi + relasi mata kuliah + dosennya
    const materi = await prisma.materi.findUnique({
      where: { id: materiId },
      include: {
        mataKuliah: {
          include: {
            dosen: true,
          },
        },
      },
    });

    // ✅ Cek apakah materi ada
    if (!materi) {
      return res.status(404).json({ error: 'Materi tidak ditemukan' });
    }

    // ✅ Validasi bahwa user adalah dosen pengampu dari mata kuliah tersebut
    const isDosenPengajar = materi.mataKuliah.dosen.some(d => d.id === user.id);
    if (!isDosenPengajar) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengubah status materi ini' });
    }

    // ✅ Validasi input status
    if (typeof status !== 'boolean') {
      return res.status(400).json({ error: 'Status harus berupa boolean (true atau false)' });
    }

    // ✅ Update status
    const updatedMateri = await prisma.materi.update({
      where: { id: materiId },
      data: { status },
    });

    return res.status(200).json({
      message: `Status materi berhasil diubah menjadi ${status ? 'aktif' : 'nonaktif'}.`,
      materi: updatedMateri,
    });

  } catch (error) {
    console.error('Error updating materi status:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat mengubah status materi' });
  }
});

// Endpoint untuk menambah submateri
app.post('/sub-materi', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { judul, type, isi, materiId, pilihan, jawabanBenar, pertanyaan, syaratKelulusan, durasiMengerjakan, durasiUlang } = req.body;

    if (!materiId) {
      return res.status(400).json({ message: "materiId diperlukan" });
    }


    let pilihanArray = [];
    let jawabanBenarArray = [];
    let pertanyaanArray = [];
    
    // Ambil idSoal dari query params dan urutkan
    const idSoalQuery = req.query.idSoal; // Contoh: "3,1"
    let idSoalArray = idSoalQuery ? idSoalQuery.split(',').map(id => parseInt(id)) : [];
    idSoalArray.sort((a, b) => a - b); // Urutkan dari yang terkecil

    // Proses upload file
    let filePaths = req.files.map(file => `/uploads/${file.filename}`);

    // Pastikan jumlah file dan idSoal cocok, jika tidak isi null
    let fileMateriData = filePaths.map((path, index) => ({
      url: path,
      idSoal: type === 'kuis' && index < idSoalArray.length ? JSON.stringify(idSoalArray[index]) : null
    }));
    if (type === 'kuis') {
      try {
        pilihanArray = pilihan ? JSON.parse(pilihan) : [];
        jawabanBenarArray = jawabanBenar ? JSON.parse(jawabanBenar) : [];
        pertanyaanArray = pertanyaan ? JSON.parse(pertanyaan) : [];
      } catch (err) {
        return res.status(400).json({ message: "Format pilihan tidak valid" });
      }
    }

    const lastSubMateri = await prisma.subMateri.findFirst({
      where: { materiId: parseInt(materiId) },
      orderBy: { urutan: "desc" }
    });

    const newOrder = lastSubMateri ? lastSubMateri.urutan + 1 : 1;
    

    // Simpan ke database
    const newSubMateri = await prisma.subMateri.create({
      data: {
        judul,
        type,
        isi: type === 'materi' ? isi : null,
        syaratKelulusan: type === 'kuis' ? parseInt(syaratKelulusan) : null,
        durasiMengerjakan: type === 'kuis' ? parseInt(durasiMengerjakan) : null,
        durasiUlang: type === 'kuis' ? parseInt(durasiUlang) : null,
        materiId: parseInt(materiId),
        pilihan: type === 'kuis' ? pilihanArray : [],
        jawabanBenar: type === 'kuis' ? jawabanBenarArray : [],
        pertanyaan: type === 'kuis' ? pertanyaanArray : [],
        urutan: newOrder, // Tambahkan urutan di sini
        fileMateri: {
          create: fileMateriData
        }
      },
      include: {
        fileMateri: true,
      }
    });

    console.log("Data yang disimpan:", newSubMateri);
    res.status(201).json(newSubMateri);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menambahkan sub-materi' });
  }
});

// Endpoint untuk mengubah submateri
app.put('/sub-materi/:id', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, type, isi, materiId, pilihan, jawabanBenar, pertanyaan, syaratKelulusan, durasiMengerjakan, durasiUlang, existingFiles } = req.body;

    let pilihanArray = [];
    let jawabanBenarArray = [];
    let pertanyaanArray = [];

    // Parsing JSON untuk kuis
    if (type === 'kuis') {
      try {
        pilihanArray = pilihan ? JSON.parse(pilihan) : [];
        jawabanBenarArray = jawabanBenar ? JSON.parse(jawabanBenar) : [];
        pertanyaanArray = pertanyaan ? JSON.parse(pertanyaan) : [];
      } catch (err) {
        return res.status(400).json({ message: "Format pilihan tidak valid" });
      }
    }

    // Ambil idSoal dari query params dan urutkan
    const idSoalQuery = req.query.idSoal; // Contoh: "3,1"
    let idSoalArray = idSoalQuery ? idSoalQuery.split(',').map(id => parseInt(id)) : [];
    idSoalArray.sort((a, b) => a - b); // Urutkan dari yang terkecil

    // Periksa apakah subMateri ada
    const existingSubMateri = await prisma.subMateri.findUnique({
      where: { id: parseInt(id) },
      include: { fileMateri: true }
    });

    if (!existingSubMateri) {
      return res.status(404).json({ message: "SubMateri tidak ditemukan" });
    }

    // Ambil daftar file lama dari FE yang masih digunakan
    const existingFileList = existingFiles ? JSON.parse(existingFiles) : [];

    // Proses file baru
    let filePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    // Gabungkan file lama yang masih digunakan dengan file baru
    let fileMateriData = [
      ...existingFileList.map(file => ({ url: file.url, idSoal: file.idSoal || null })),
      ...filePaths.map((path, index) => ({
        url: path,
        idSoal: type === 'kuis' && index < idSoalArray.length ? JSON.stringify(idSoalArray[index]) : null
      }))
    ];

    // Update subMateri tanpa menghapus file lama
    const updatedSubMateri = await prisma.subMateri.update({
      where: { id: parseInt(id) },
      data: {
        judul,
        type,
        isi: type === 'materi' ? isi : null,
        syaratKelulusan: type === 'kuis' ? parseInt(syaratKelulusan) : null,
        durasiMengerjakan: type === 'kuis' ? parseInt(durasiMengerjakan) : null,
        durasiUlang: type === 'kuis' ? parseInt(durasiUlang) : null,
        materiId: parseInt(materiId),
        pilihan: type === 'kuis' ? pilihanArray : [],
        jawabanBenar: type === 'kuis' ? jawabanBenarArray : [],
        pertanyaan: type === 'kuis' ? pertanyaanArray : [],
        fileMateri: {
          create: fileMateriData // Tambahkan file yang masih digunakan + yang baru
        }
      },
      include: { fileMateri: true }
    });

    res.status(200).json(updatedSubMateri);
  } catch (error) {
    console.error("Error saat memperbarui sub-materi:", error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui sub-materi', error: error.message });
  }
});

// ✅ Endpoint untuk mengambil semua submateri dari id matakuliah
app.get('/sub-materi/:matakuliahId', authenticateToken, async (req, res) => {
  try {
    const matakuliahId = parseInt(req.params.matakuliahId, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Cek apakah mata kuliah ada
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: matakuliahId },
      include: { dosen: true }
    });
    if (!mataKuliah) return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });

    // ✅ Validasi mahasiswa terdaftar dalam mata kuliah
    if (userRole === "Mahasiswa") {
      const isEnrolled = await prisma.mataKuliahMahasiswa.findFirst({
        where: { mahasiswaId: userId, mataKuliahId: matakuliahId }
      });
      if (!isEnrolled) return res.status(403).json({ message: "Anda belum bergabung dalam mata kuliah ini" });
    }

    // ✅ Ambil semua sub-materi yang ada dalam mata kuliah ini
    const subMateri = await prisma.subMateri.findMany({
      where: { materi: { mataKuliahId: matakuliahId } },
      orderBy: { urutan: "asc" },
      include: { fileMateri: true, GambarMateri: true  }
    });

    let mahasiswaProgress = {};
    if (userRole === "Mahasiswa") {
      const progressData = await prisma.mahasiswaProgressSubMateri.findMany({
        where: { mahasiswaId: userId },
        select: { subMateriId: true, selesai: true }
      });
      mahasiswaProgress = progressData.reduce((acc, item) => {
        acc[item.subMateriId] = item.selesai;
        return acc;
      }, {});
    }

    let allowedSubMateri = subMateri;
    const formattedSubMateri = allowedSubMateri.map(item => ({
      id: item.id,
      materiId: item.materiId,
      judul: item.judul,
      type: item.type,
      urutan: item.urutan,
      status: mahasiswaProgress[item.id] ? "selesai" : "belum_selesai",
    }));

    res.status(200).json(formattedSubMateri.length ? formattedSubMateri : { message: "Sub-materi tidak ditemukan" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam mengambil sub-materi" });
  }
});

// ✅ Endpoint untuk mengambil detail submateri dengan validasi urutan
app.get('/sub-materi/detail/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      include: {
        materi: { include: { mataKuliah: { include: { dosen: true } } } },
        fileMateri: true,
        GambarMateri: true,
      }
    });
    if (!subMateri) return res.status(404).json({ message: "Sub-materi tidak ditemukan" });

    if (userRole === "Mahasiswa") {
      const previousSubMateri = await prisma.subMateri.findFirst({
        where: { materiId: subMateri.materiId, urutan: subMateri.urutan - 1 }
      });
      if (previousSubMateri) {
        const progress = await prisma.mahasiswaProgressSubMateri.findFirst({
          where: { mahasiswaId: userId, subMateriId: previousSubMateri.id, selesai: true }
        });
        if (!progress) return res.status(403).json({ message: "Selesaikan sub-materi sebelumnya terlebih dahulu" });
      }
    }

    res.status(200).json(subMateri);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam mengambil sub-materi" });
  }
});

// ✅ Endpoint untuk menandai sub-materi selesai dengan validasi urutan
app.post('/sub-materi/selesai/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const userId = req.user.id;

    // Cek apakah sub-materi ada
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      include: { 
        materi: { 
          select: { 
            id: true, 
            mataKuliahId: true, 
            status: true // ⬅️ Tambahkan ini!
          } 
        } 
      }
    });
    

    if (!subMateri) return res.status(404).json({ message: "Sub-materi tidak ditemukan" });
    if (!subMateri.materi.status) {
      return res.status(403).json({ message: "Materi ini masih dikunci. Harap tunggu dibuka oleh dosen." });
    }

    // Cek apakah progres sudah ada
    const existingProgress = await prisma.mahasiswaProgressSubMateri.findFirst({
      where: { mahasiswaId: userId, subMateriId }
    });

    if (existingProgress) {
      return res.status(200).json({ message: "Sub-materi sudah ditandai selesai sebelumnya." });
    }

    const allSubMateri = await prisma.subMateri.findMany({
      where: { materi: { mataKuliahId: subMateri.materi.mataKuliahId } },
      orderBy: [{ materiId: 'asc' }, { urutan: 'asc' }]
    });

    // Buat daftar sub-materi berdasarkan materiId
    const materiGroups = {};
    allSubMateri.forEach((sm) => {
      if (!materiGroups[sm.materiId]) {
        materiGroups[sm.materiId] = [];
      }
      materiGroups[sm.materiId].push(sm);
    });

    // Cari urutan materi dari sub-materi ini
    const materiIdOrder = Object.keys(materiGroups).map(id => parseInt(id));
    const currentMateriIndex = materiIdOrder.indexOf(subMateri.materi.id);

    // Validasi: Semua sub-materi sebelumnya dalam **materi yang sama** harus selesai
    const previousSubMateriIds = materiGroups[subMateri.materi.id]
      .filter(sm => sm.urutan < subMateri.urutan)
      .map(sm => sm.id);


    const completedProgress = await prisma.mahasiswaProgressSubMateri.findMany({
      where: {
        mahasiswaId: userId,
        subMateriId: { in: previousSubMateriIds },
        selesai: true
      }
    });

    if (completedProgress.length !== previousSubMateriIds.length) {
      return res.status(403).json({ message: "Selesaikan semua sub-materi sebelumnya dalam materi ini terlebih dahulu." });
    }

    // Validasi: Semua sub-materi dari **materiId sebelumnya** harus selesai sebelum memulai materi baru
    if (currentMateriIndex > 0) {
      const previousMateriId = materiIdOrder[currentMateriIndex - 1];
      const previousMateriSubMateriIds = materiGroups[previousMateriId].map(sm => sm.id);

      const previousMateriProgress = await prisma.mahasiswaProgressSubMateri.findMany({
        where: {
          mahasiswaId: userId,
          subMateriId: { in: previousMateriSubMateriIds },
          selesai: true,
        }
      });

      if (previousMateriProgress.length !== previousMateriSubMateriIds.length) {
        return res.status(403).json({ message: "Selesaikan semua sub-materi dalam materi sebelumnya terlebih dahulu." });
      }
    }

    const isKuis = subMateri.type === 'kuis';
    // Simpan progres baru dengan upsert untuk mencegah duplikasi
    await prisma.mahasiswaProgressSubMateri.upsert({
      where: {
        mahasiswaId_subMateriId: {
          mahasiswaId: userId,
          subMateriId: subMateriId,
        },
      },
      update: { selesai: !isKuis, tanggalSelesai: new Date() }, // Jika sudah ada, update
      create: { // Jika belum ada, insert baru
        mahasiswaId: userId,
        subMateriId: subMateriId,
        selesai: !isKuis,
        type: subMateri.type,
        tanggalSelesai: new Date(),
      },
    });


    res.status(200).json({ message: "Sub-materi telah diselesaikan." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat menyimpan progres." });
  }
});

//Ambil Nilai Kuis Mahasiswa
app.get('/jawaban-mahasiswa/kuis/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const userId = req.user.id; // ID mahasiswa yang login

    // Cek apakah ada jawaban mahasiswa untuk kuis ini
    const jawabanMahasiswa = await prisma.jawabanMahasiswaKuis.findFirst({
      where: { mahasiswaId: userId, subMateriId },
      select: {
        id: true,
        subMateriId: true,
        mahasiswaId: true,
        nilai: true,
        nilaiPertamaLulus: true,
        waktuMulai: true
      }
    });

    if (!jawabanMahasiswa) {
      return res.status(404).json({ 
        message: "Jawaban mahasiswa untuk kuis ini tidak ditemukan.", 
        waktuMulai: null 
      });
    }
    res.status(200).json(jawabanMahasiswa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil jawaban mahasiswa."});
  }
});

// Mulai Kuis
app.post('/kuis/mulai/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Cek apakah sub-materi ada
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      select: {
        durasiMengerjakan: true,
        durasiUlang: true,
        syaratKelulusan: true,
        materi: true
      }
    });

    const durasiMengerjakan = subMateri.durasiMengerjakan;
    const syaratKelulusan = subMateri.syaratKelulusan;

    if (!subMateri) return res.status(404).json({ message: "Sub-materi tidak ditemukan" });

    const mataKuliahId = subMateri.materi.mataKuliahId;

    // ✅ Validasi mahasiswa terdaftar dalam mata kuliah
    if (userRole === "Mahasiswa") {
      const isEnrolled = await prisma.mataKuliahMahasiswa.findFirst({
        where: { mahasiswaId: userId, mataKuliahId: mataKuliahId }
      });
      if (!isEnrolled) return res.status(403).json({ message: "Anda belum bergabung dalam mata kuliah ini" });
    }

    // ✅ Periksa apakah mahasiswa sudah pernah memulai kuis ini
    const existingAttempt = await prisma.jawabanMahasiswaKuis.findFirst({
      where: { mahasiswaId: userId, subMateriId: subMateriId }
    });

    if (existingAttempt) {
      // Jika mahasiswa sudah pernah mengerjakan, reset data tapi JANGAN reset nilaiPertamaLulus
      const updatedAttempt = await prisma.jawabanMahasiswaKuis.update({
        where: { id: existingAttempt.id },
        data: {
          jawabanMahasiswa: Prisma.JsonNull,
          statusSelesai: false,
          isOngoing: true,
          attempts: { increment: 1 },
          waktuMulai: new Date()
        }
      });

      return res.status(200).json({ 
        message: "Kuis diulang", 
        kuis: updatedAttempt, 
      });
    }

    // ✅ Jika mahasiswa baru pertama kali mengerjakan, buat entri baru
    const newAttempt = await prisma.jawabanMahasiswaKuis.create({
      data: {
        mahasiswaId: userId,
        subMateriId: subMateriId,
        isOngoing: true,
        attempts: 1,
        jawabanMahasiswa: Prisma.JsonNull,
        nilai: [], // Array kosong karena belum ada nilai yang diinput
        nilaiPertamaLulus: -1,
        waktuMulai: new Date(),
      }
    });

    res.status(201).json({ 
      message: "Kuis berhasil dimulai", 
      kuis: newAttempt, 
      durasiMengerjakan, 
      syaratKelulusan 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam memulai kuis" });
  }
});

// Selesaikan Kuis
app.put('/kuis/selesai/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const mahasiswaId = req.user.id;
    const userRole = req.user.role;
    const { jawabanMahasiswa } = req.body;

    // ✅ Pastikan hanya mahasiswa yang bisa menyelesaikan kuis
    if (userRole !== "Mahasiswa") {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk menyelesaikan kuis ini" });
    }

    // ✅ Cari entri kuis mahasiswa
    let attempt = await prisma.jawabanMahasiswaKuis.findFirst({
      where: { mahasiswaId, subMateriId }
    });

    // ✅ Jika tidak ditemukan, berarti mahasiswa belum memulai kuis
    if (!attempt) {
      return res.status(400).json({ message: "Anda belum memulai kuis. Silakan mulai kuis terlebih dahulu." });
    }

    // ✅ Cek apakah kuis sedang berjalan (isOngoing === true)
    if (!attempt.isOngoing) {
      return res.status(400).json({ message: "Kuis belum dimulai atau sudah selesai. Silakan mulai kuis dulu." });
    }

    // ✅ Ambil jawaban benar dari subMateri
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      select: { jawabanBenar: true, syaratKelulusan: true }
    });

    if (!subMateri || !subMateri.jawabanBenar) {
      return res.status(400).json({ message: "Jawaban benar belum tersedia untuk kuis ini" });
    }

    // ✅ Hitung skor mahasiswa
    const jawabanBenar = subMateri.jawabanBenar;
    let benarCount = 0;
    jawabanMahasiswa.forEach((jawaban, index) => {
      if (jawaban === jawabanBenar[index]) {
        benarCount++;
      }
    });

    const nilaiBaru = Math.round((benarCount / jawabanBenar.length) * 100);
    const tanggalPengerjaan = new Date().toISOString();

    // ✅ Tambahkan nilai ke daftar nilai sebelumnya
    let nilaiArray = attempt.nilai || [];
    nilaiArray.push([nilaiBaru, tanggalPengerjaan]);

    // ✅ **Jangan Reset nilaiPertamaLulus** setelah lulus pertama kali
    let nilaiPertamaLulus = attempt.nilaiPertamaLulus;
    if (nilaiBaru >= subMateri.syaratKelulusan && nilaiPertamaLulus === -1) {
      nilaiPertamaLulus = nilaiArray.length - 1; // Simpan hanya pertama kali lulus
    }

    console.log(attempt.nilai[attempt.nilaiPertamaLulus])

    // ✅ Update data kuis mahasiswa (akhiri kuis)
    attempt = await prisma.jawabanMahasiswaKuis.update({
      where: { id: attempt.id },
      data: {
        jawabanMahasiswa,
        nilai: nilaiArray,
        nilaiPertamaLulus,
        statusSelesai: true,
        isOngoing: false,
        waktuMulai: new Date,
      }
    });

    // ✅ Jika mahasiswa pertama kali lulus, tandai kuis sebagai selesai
    if (attempt.nilaiPertamaLulus !== -1) {
      await prisma.mahasiswaProgressSubMateri.updateMany({
        where: { mahasiswaId, subMateriId },
        data: { selesai: true,  tanggalSelesai: new Date() }
      });
    }

    // ✅ Kembalikan respons
    res.status(200).json({
      message: nilaiPertamaLulus !== -1 ? "Kuis selesai dan mahasiswa lulus." : "Kuis selesai, tapi mahasiswa belum lulus.",
      kuis: attempt,
      nilaiPertamaLulus: nilaiPertamaLulus !== -1 ? nilaiArray[nilaiPertamaLulus][0] : null
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam menyelesaikan kuis" });
  }
});

// Cek Apakah Kuis sudah dimulai atau belum
app.get('/kuis/status/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const mahasiswaId = req.user.id;
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const userRole = req.user.role;

    // ✅ Pastikan hanya mahasiswa yang bisa mengakses status kuis
    if (userRole !== "Mahasiswa") {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk mengakses status kuis ini" });
    }

    // ✅ Cari entri kuis mahasiswa
    const attempt = await prisma.jawabanMahasiswaKuis.findFirst({
      where: { mahasiswaId, subMateriId }
    });

    if (!attempt) {
      return res.status(200).json({ 
        message: "Kuis belum pernah dimulai",
        statusOngoing: false });
    }

    res.status(200).json({
      message: "Status kuis ditemukan",
      id: attempt.id,
      statusOngoing: attempt.isOngoing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam mengambil status kuis" });
  }
});

// GET soal Kuis
app.get('/kuis/:mahasiswaId/:subMateriId/:idJawabanMahasiswaKuis', authenticateToken, async (req, res) => {
  try {
    const mahasiswaId = parseInt(req.params.mahasiswaId, 10);
    const subMateriId = parseInt(req.params.subMateriId, 10);
    const idJawabanMahasiswaKuis = parseInt(req.params.idJawabanMahasiswaKuis, 10);
    const userRole = req.user.role;
    if (userRole === "Mahasiswa" && req.user.id !== mahasiswaId) {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk mengakses kuis ini" });
    }

    // ✅ Ambil sub-materi (soal kuis)
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: subMateriId },
      select: {
        materi: {
          select: {
            mataKuliahId: true,
          }
        },
        jawabanKuis: {
          where: { mahasiswaId },
          select: {
            isOngoing: true
          },
        },
        fileMateri: true,
        type: true,
        pertanyaan: true,
        pilihan: true,
        durasiMengerjakan: true,
        syaratKelulusan: true,
      }
    });

    const jawabanMahasiswaKuis = await prisma.jawabanMahasiswaKuis.findUnique({
      where: { id: idJawabanMahasiswaKuis },
      select: { waktuMulai: true },
    });

    if (!subMateri) {
      return res.status(404).json({ message: "Sub-materi tidak ditemukan" });
    }

    // ✅ Pastikan sub-materi adalah kuis
    if (subMateri.type !== "kuis") {
      return res.status(400).json({ message: "Sub-materi ini bukan kuis" });
    }

    // ✅ Cek apakah mahasiswa terdaftar di mata kuliah yang sesuai
    const isMahasiswaTerdaftar = await prisma.mataKuliahMahasiswa.findFirst({
      where: {
        mahasiswaId,
        mataKuliahId: subMateri.materi.mataKuliahId
      }
    });

    if (userRole === "Mahasiswa" && !isMahasiswaTerdaftar) {
      return res.status(403).json({ message: "Anda tidak terdaftar dalam mata kuliah ini" });
    }
    

    // ✅ Cek apakah kuis sedang berlangsung (`isOngoing === true`)
    if (!subMateri.jawabanKuis.length || !subMateri.jawabanKuis[0].isOngoing) {
      return res.status(400).json({ message: "Kuis belum dimulai atau sudah selesai" });
    }

    // ✅ Kembalikan soal kuis
    res.status(200).json({
      message: "Berhasil mengambil soal kuis",
      soal: {
        pertanyaan: subMateri.pertanyaan,
        pilihan: subMateri.pilihan,
        durasiMengerjakan: subMateri.durasiMengerjakan,
        fileMateri: subMateri.fileMateri,
        waktuMulai: jawabanMahasiswaKuis.waktuMulai,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam mengambil soal kuis" });
  }
});

// GET Progress Mahasiswa
app.get('/sub-materi/selesai/:mahasiswaId/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const mahasiswaId = parseInt(req.params.mahasiswaId, 10);
    const subMateriId = parseInt(req.params.subMateriId, 10);

    // Cek apakah mahasiswa mengakses data sendiri atau admin
    if (req.user.id !== mahasiswaId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Anda tidak memiliki izin untuk mengakses data ini." });
    }

    const progress = await prisma.mahasiswaProgressSubMateri.findFirst({
      where: { mahasiswaId, subMateriId, selesai: true },
      include: {
        subMateri: {
          select: {
            id: true,
            judul: true,
            urutan: true,
            materiId: true,
          }
        }
      }
    });

    if (!progress) {
      return res.status(404).json({ message: "Progres tidak ditemukan atau belum selesai." });
    }

    res.status(200).json(progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil data." });
  }
});

// Get Progress Terakhir Mahasiswa
app.get('/progress/terakhir/:mataKuliahId/:idMahasiswa', authenticateToken, async (req, res) => {
  try {
    const mataKuliahId = parseInt(req.params.mataKuliahId, 10);
    const idMahasiswa = parseInt(req.params.idMahasiswa, 10);
    const materi = await prisma.materi.findFirst({
      where: { mataKuliahId },
    });


    if (!idMahasiswa) {
      return res.status(400).json({ message: "ID Mahasiswa diperlukan." });
    }

    // 1️⃣ Cari progress terakhir mahasiswa berdasarkan tanggal selesai terbaru
    const lastProgress = await prisma.mahasiswaProgressSubMateri.findFirst({
      where: { 
        mahasiswaId: idMahasiswa,
        subMateri: { materi: { mataKuliahId } } 
      },
      orderBy: { tanggalSelesai: 'desc' },
      include: { subMateri: true }
    });

    if (lastProgress) {
      return res.status(200).json({
        message: "Progress terakhir ditemukan.",
        progress: lastProgress.subMateri
      });
    }
    const firstSubMateri = await prisma.subMateri.findFirst({
      where: { materi: { mataKuliahId } },
      orderBy: [{ materiId: 'asc' }, { urutan: 'asc' }]
    });

    if (!firstSubMateri) {
      return res.status(404).json({ message: "Tidak ada sub-materi untuk mata kuliah ini." });
    }

    res.status(200).json({
      message: "Belum ada progress, mengambil sub-materi pertama.",
      progress: firstSubMateri,
      materi: materi.status
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengambil progress." });
  }
});

// Endpoint untuk menghapus file type materi disubmateri
app.delete('/sub-materi/deleteFile/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Cari file berdasarkan ID
    const fileMateri = await prisma.fileMateri.findUnique({
      where: { id: parseInt(id) }
    });

    if (!fileMateri) {
      return res.status(404).json({ message: "File tidak ditemukan" });
    }

    // Hapus file dari database
    await prisma.fileMateri.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "File berhasil dihapus" });
  } catch (error) {
    console.error("Error saat menghapus file:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat menghapus file" });
  }
});

// Endpoint untuk menghapus submateri
app.delete('/sub-materi/:idMataKuliah/:idMateri/:idSubMateri', authenticateToken, async (req, res) => {
  try {
    const { idMataKuliah, idMateri, idSubMateri } = req.params;
    const userId = req.user.id; // Ambil ID user yang sedang login

    // Pastikan semua ID adalah angka
    if ([idMataKuliah, idMateri, idSubMateri].some(id => isNaN(id))) {
      return res.status(400).json({ message: "Semua ID harus berupa angka" });
    }

    // Cek apakah mata kuliah ada dan apakah user adalah dosennya
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: parseInt(idMataKuliah) },
      include: { dosen: true }
    });

    if (!mataKuliah) {
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    // Validasi apakah user adalah dosen yang membuat mata kuliah
    const isOwner = mataKuliah.dosen.some(dosen => dosen.id === userId);
    if (!isOwner) {
      return res.status(403).json({ message: "Hanya dosen yang membuat mata kuliah ini yang bisa menghapus sub-materi" });
    }

    // Cek apakah materi ada di dalam mata kuliah tersebut
    const materi = await prisma.materi.findUnique({
      where: {
        id: parseInt(idMateri),
        mataKuliahId: parseInt(idMataKuliah)
      }
    });

    if (!materi) {
      return res.status(404).json({ message: "Materi tidak ditemukan dalam mata kuliah ini" });
    }

    // Cek apakah subMateri ada dalam materi tersebut
    const subMateri = await prisma.subMateri.findUnique({
      where: {
        id: parseInt(idSubMateri),
        materiId: parseInt(idMateri)
      },
      include: { fileMateri: true }
    });

    if (!subMateri) {
      return res.status(404).json({ message: "SubMateri tidak ditemukan dalam materi ini" });
    }

    // Hapus semua fileMateri terkait terlebih dahulu
    await prisma.fileMateri.deleteMany({
      where: { subMateriId: parseInt(idSubMateri) }
    });

    // Hapus subMateri setelah fileMateri terhapus
    await prisma.subMateri.delete({
      where: { id: parseInt(idSubMateri) }
    });

    res.status(200).json({ message: "SubMateri berhasil dihapus" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat menghapus sub-materi' });
  }
});

// Get Laporan Progress Mahasiswa
app.get('/laporan/progress/mahasiswa/:idMataKuliah/:idMahasiswa?', authenticateToken, async (req, res) => {
  try {
    const { idMataKuliah, idMahasiswa } = req.params;
    const userId = req.user.id;

    // Ambil data user
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        mataKuliahDiajarkan: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }

    let targetMahasiswaId;

    if (user.role === "Dosen") {
      // Validasi apakah dosen tersebut memang pengampu mata kuliah
      const mataKuliah = await prisma.mataKuliah.findUnique({
        where: { id: parseInt(idMataKuliah) },
        include: { dosen: true },
      });

      if (!mataKuliah) {
        return res.status(404).json({ success: false, message: "Mata kuliah tidak ditemukan." });
      }

      const isDosenPengampu = mataKuliah.dosen.some(d => d.id === userId);
      if (!isDosenPengampu) {
        return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk melihat data ini." });
      }

      if (!idMahasiswa) {
        return res.status(400).json({ success: false, message: "ID mahasiswa harus disertakan untuk dosen." });
      }

      targetMahasiswaId = parseInt(idMahasiswa);

    } else if (user.role === "Admin") {
      if (!idMahasiswa) {
        return res.status(400).json({ success: false, message: "ID mahasiswa harus disertakan untuk admin." });
      }

      targetMahasiswaId = parseInt(idMahasiswa);

    } else if (user.role === "Mahasiswa") {
      targetMahasiswaId = userId;

    } else {
      return res.status(403).json({ success: false, message: "Role tidak dikenali untuk aksi ini." });
    }

    // Ambil daftar semua subMateri dari mata kuliah
    const subMateriList = await prisma.subMateri.findMany({
      where: { materi: { mataKuliahId: parseInt(idMataKuliah) } },
      include: {
        materi: true,
        progressSubMateri: {
          where: { mahasiswaId: targetMahasiswaId },
        },
        jawabanKuis: {
          where: { mahasiswaId: targetMahasiswaId },
        },
      },
    });

    const laporan = subMateriList.map((subMateri, index) => {
      let nilai = "-";
      let status = "-";
      let tanggalLulus = "-";

      const progress = subMateri.progressSubMateri[0];
      if (progress && progress.selesai) {
        status = "Lulus";
        tanggalLulus = progress.tanggalSelesai
          ? new Date(progress.tanggalSelesai).toLocaleString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short',
              timeZone: 'Asia/Jakarta',
            })
          : "-";
      }

      if (subMateri.type.toLowerCase() === "kuis") {
        const jawabanKuis = subMateri.jawabanKuis[0];
        if (jawabanKuis && jawabanKuis.nilaiPertamaLulus !== -1) {
          const indexNilai = jawabanKuis.nilaiPertamaLulus;
          const nilaiArray = jawabanKuis.nilai;
          if (Array.isArray(nilaiArray) && nilaiArray[indexNilai]) {
            nilai = nilaiArray[indexNilai][0];
          }
        }
      }

      return {
        no: index + 1,
        materi: subMateri.materi.judul,
        subMateri: subMateri.judul,
        type: subMateri.type,
        nilai,
        status,
        tanggalLulus,
      };
    });

    res.json({ success: true, laporan });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan dalam mengambil laporan mahasiswa." });
  }
});

// Get Laporan Data Mahasiswa dan Mata Kuliah
app.get('/laporan/data/mahasiswa/:idMataKuliah', authenticateToken, async (req, res) => {
  try {
    const { idMataKuliah } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let mahasiswaId;

    if (userRole === "Mahasiswa") {
      mahasiswaId = userId;
    } else if (userRole === "Dosen" || userRole === "Admin") {
      mahasiswaId = req.query.idMahasiswa;
      if (!mahasiswaId) {
        return res.status(400).json({ success: false, message: "idMahasiswa harus disertakan untuk dosen atau admin" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Role tidak diizinkan" });
    }

    const mahasiswaData = await prisma.users.findUnique({
      where: { id: parseInt(mahasiswaId) },
      select: {
        nama: true,
        email: true,
        nomorinduk: true,
        mataKuliahDiikuti: {
          where: {
            mataKuliahId: parseInt(idMataKuliah),
          },
          select: {
            tanggalGabung: true,
            mataKuliah: {
              select: {
                nama: true,
                dosen: {
                  select: {
                    nama: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!mahasiswaData) {
      return res.status(404).json({ success: false, message: "Data mahasiswa tidak ditemukan" });
    }

    const formattedData = {
      ...mahasiswaData,
      mataKuliahDiikuti: mahasiswaData.mataKuliahDiikuti.map(item => ({
        tanggalGabung: format(new Date(item.tanggalGabung), "EEEE, dd MMMM yyyy", { locale: id }),
        namaMataKuliah: item.mataKuliah.nama,
        namaDosen: item.mataKuliah.dosen.length > 0
          ? item.mataKuliah.dosen.map(d => d.nama).join(", ")
          : "Dosen Tidak Ditemukan",
      })),
    };

    res.json({
      success: true,
      data: formattedData,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan dalam mengambil data" });
  }
});


// PUT bar Progress Mahasiswa
app.put('/progress/mahasiswa/:idMataKuliah', authenticateToken, async (req, res) => {
  try {
    const { idMataKuliah } = req.params;
    const userId = req.user.id;

    // Ambil semua submateri dalam mata kuliah tersebut
    const semuaSubMateri = await prisma.subMateri.findMany({
      where: {
        materi: {
          mataKuliahId: parseInt(idMataKuliah),
        },
      },
      select: { id: true },
    });

    const totalSubMateri = semuaSubMateri.length;

    if (totalSubMateri === 0) {
      return res.status(400).json({ success: false, message: 'Belum ada sub-materi dalam mata kuliah ini.' });
    }

    const subMateriIds = semuaSubMateri.map(sub => sub.id);

    // Hitung berapa submateri yang sudah diselesaikan mahasiswa
    const subMateriSelesai = await prisma.mahasiswaProgressSubMateri.count({
      where: {
        mahasiswaId: userId,
        subMateriId: { in: subMateriIds },
        selesai: true,
      },
    });

    // Hitung progress dalam persentase
    const progress = (subMateriSelesai / totalSubMateri) * 100;
    const progressBulatan = progress.toFixed(1)

    // Update progress di tabel MataKuliahMahasiswa
    await prisma.mataKuliahMahasiswa.updateMany({
      where: {
        mahasiswaId: userId,
        mataKuliahId: parseInt(idMataKuliah),
      },
      data: {
        progress: parseFloat(progressBulatan),
      },
    });

    res.json({ success: true, progress: progress.toFixed(2), message: 'Progress berhasil diperbarui' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan dalam mengambil data" });
  }
});

// GET bar Progress Mahasiswa
app.get('/progress/matakuliah/:idMataKuliah/mahasiswa', authenticateToken, async (req, res) => {
  try {
    const { idMataKuliah } = req.params;

    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      include: {
        mataKuliahDiajarkan: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: parseInt(idMataKuliah) },
      include: {
        dosen: true,
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({
        success: false,
        message: "Mata kuliah tidak ditemukan.",
      });
    }

    let whereCondition = {
      mataKuliahId: parseInt(idMataKuliah),
      mahasiswa: {
        is: {
          role: "Mahasiswa",
        },
      },
    };

    if (user.role === 'Dosen') {
      const isDosenPengajar = mataKuliah.dosen.some(d => d.id === user.id);

      if (!isDosenPengajar) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki izin untuk melihat data ini.",
        });
      }
      // Lanjutkan, dosen boleh melihat semua mahasiswa di mata kuliah ini

    } else if (user.role === 'Mahasiswa') {
      whereCondition.mahasiswaId = user.id;

    } else if (user.role === 'Admin') {
      // Admin boleh melihat semua mahasiswa, biarkan whereCondition tetap
    } else {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses untuk melihat data ini.",
      });
    }

    const mahasiswaProgress = await prisma.mataKuliahMahasiswa.findMany({
      where: whereCondition,
      select: {
        mahasiswaId: true,
        mahasiswa: {
          select: {
            nomorinduk: true,
            nama: true,
          },
        },
        progress: true,
        tanggalGabung: true,
      },
    });

    const data = mahasiswaProgress.map((item) => ({
      id: item.mahasiswaId,
      nomorInduk: item.mahasiswa.nomorinduk,
      nama: item.mahasiswa.nama,
      tanggalGabung: item.tanggalGabung,
      progress: parseFloat(item.progress.toFixed(1)),
    }));

    res.json({
      success: true,
      message: "Berhasil mendapatkan data progress mahasiswa",
      data,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan dalam mengambil data progress mahasiswa",
    });
  }
});

// Post Kuisioner (Mahasiswa)
app.post('/kuisioner/:idMatkul', authenticateToken, async (req, res) => {
  try {
    const { idMatkul } = req.params;
    const { jawabanKuisioner, saran } = req.body;

    // Validasi role user
    if (req.user.role !== 'Mahasiswa') {
      return res.status(403).json({ message: "Hanya mahasiswa yang dapat mengisi kuisioner" });
    }

    // Validasi input
    if (!jawabanKuisioner || !Array.isArray(jawabanKuisioner) || jawabanKuisioner.length === 0) {
      return res.status(400).json({ message: "Jawaban kuisioner wajib diisi" });
    }

    if (!saran || saran.trim() === "") {
      return res.status(400).json({ message: "Saran wajib diisi" });
    }

    const mahasiswaId = req.user.id;

    // Cari mahasiswa berdasarkan id dari token
    const mahasiswa = await prisma.users.findUnique({
      where: { id: mahasiswaId }
    });

    if (!mahasiswa) {
      return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });
    }

    // Cari mata kuliah
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: parseInt(idMatkul) },
      include: {
        dosen: true
      }
    });

    if (!mataKuliah) {
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    const dosen = mataKuliah.dosen[0];
    if (!dosen) {
      return res.status(400).json({ message: "Dosen untuk mata kuliah ini tidak ditemukan" });
    }

    // Cek apakah mahasiswa sudah pernah mengisi kuisioner untuk mata kuliah ini
    const existingKuisioner = await prisma.kuisioner.findFirst({
      where: {
        mahasiswaId: mahasiswaId,
        mataKuliahId: parseInt(idMatkul)
      }
    });

    if (existingKuisioner) {
      return res.status(400).json({ message: "Anda sudah mengisi kuisioner untuk mata kuliah ini" });
    }

    // Simpan kuisioner
    const kuisioner = await prisma.kuisioner.create({
      data: {
        mahasiswaId,
        dosenId: dosen.id,
        mataKuliahId: mataKuliah.id,
        jawabanKuisioner,
        saran
      }
    });

    return res.status(201).json({ message: "Kuisioner berhasil disimpan", data: kuisioner });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan" });
  }
});

// GET Kuisioner (Mahasiswa)
app.get('/kuisioner/:idMatkul', authenticateToken, async (req, res) => {
  try {
    const { idMatkul } = req.params;
    const mahasiswaId = req.user?.id;

    if (!mahasiswaId) {
      return res.status(401).json({ message: "Unauthorized: Mahasiswa tidak ditemukan" });
    }

    const mataKuliahId = parseInt(idMatkul);
    if (isNaN(mataKuliahId)) {
      return res.status(400).json({ message: "ID Mata Kuliah tidak valid" });
    }

    // Cek apakah mahasiswa terdaftar di mata kuliah ini
    const isMahasiswaTerdaftar = await prisma.mataKuliahMahasiswa.findFirst({
      where: {
        mahasiswaId: mahasiswaId,
        mataKuliahId: mataKuliahId
      }
    });

    if (!isMahasiswaTerdaftar) {
      return res.status(403).json({ message: "Mahasiswa tidak terdaftar di mata kuliah ini" });
    }

    // Ambil hanya data kuisioner untuk mahasiswa yang login
    const kuisioner = await prisma.kuisioner.findFirst({
      where: {
        mataKuliahId: mataKuliahId,
        mahasiswaId: mahasiswaId
      },
      include: {
        mahasiswa: {
          select: { id: true, nama: true, email: true }
        },
        dosen: {
          select: { id: true, nama: true, email: true }
        },
        mataKuliah: {
          select: { id: true, nama: true }
        }
      }
    });

    if (!kuisioner) {
      return res.status(404).json({ message: "Data kuisioner untuk mahasiswa ini belum ada" });
    }

    return res.status(200).json({ message: "Berhasil mengambil data kuisioner", data: kuisioner });
  } catch (error) {
    console.error("Error fetching kuisioner:", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil data kuisioner", error: error.message });
  }
});

// GET ALL Kuisioner (Dosen)
app.get('/kuisioner-dosen/:idMatkul', authenticateToken, async (req, res) => {
  try {
    const { idMatkul } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

if (!userId || (userRole !== 'Dosen' && userRole !== 'Admin')) {
      return res.status(403).json({ message: "Forbidden: Akses hanya untuk dosen" });
    }

    const mataKuliahId = parseInt(idMatkul);
    if (isNaN(mataKuliahId)) {
      return res.status(400).json({ message: "ID Mata Kuliah tidak valid" });
    }

    // Ambil data mata kuliah termasuk dosen pengampu
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: mataKuliahId },
      include: { dosen: true }
    });

    if (!mataKuliah) {
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    // Cek apakah dosen yang login adalah dosen pengampu
    if (userRole === 'Dosen') {
      const isOwner = mataKuliah.dosen.some(dosen => dosen.id === userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Hanya dosen pengampu yang bisa mengakses data kuisioner ini" });
      }
    }

    // Ambil semua data kuisioner untuk mata kuliah ini
    const kuisioners = await prisma.kuisioner.findMany({
      where: { mataKuliahId: mataKuliahId }
    });

    if (!kuisioners.length) {
      return res.status(404).json({ message: "Tidak ada data kuisioner untuk mata kuliah ini" });
    }

    // Mapping data supaya hanya tampil jawabanKuisioner, saran, tanggal
    const formattedKuisioners = kuisioners.map(k => ({
      id: k.id,
      jawabanKuisioner: k.jawabanKuisioner,
      saran: k.saran,
      tanggal: k.tanggal
    }));

    return res.status(200).json({ message: "Berhasil mengambil semua data kuisioner", data: formattedKuisioners });
  } catch (error) {
    console.error("Error fetching kuisioner dosen:", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil data kuisioner", error: error.message });
  }
});

// GET DETAIL Kuisioner (Dosen)
app.get('/kuisioner-dosen/:idMatkul/:idKuisioner', authenticateToken, async (req, res) => {
  try {
    const { idMatkul, idKuisioner } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Cek apakah user login dan role-nya Dosen atau Admin
    if (!userId || (userRole !== 'Dosen' && userRole !== 'Admin')) {
      return res.status(403).json({ message: "Forbidden: Akses hanya untuk dosen atau admin" });
    }

    const mataKuliahId = parseInt(idMatkul);
    const kuisionerId = parseInt(idKuisioner);

    if (isNaN(mataKuliahId) || isNaN(kuisionerId)) {
      return res.status(400).json({ message: "ID Mata Kuliah atau ID Kuisioner tidak valid" });
    }

    // Ambil data mata kuliah termasuk dosen pengampu
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: mataKuliahId },
      include: { dosen: true }
    });

    if (!mataKuliah) {
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    // Jika yang login adalah Dosen, cek apakah dia dosen pengampu
    if (userRole === 'Dosen') {
      const isOwner = mataKuliah.dosen.some(dosen => dosen.id === userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Hanya dosen pengampu yang bisa mengakses data kuisioner ini" });
      }
    }

    // Ambil satu data kuisioner
    const kuisioner = await prisma.kuisioner.findFirst({
      where: {
        id: kuisionerId,
        mataKuliahId: mataKuliahId
      }
    });

    if (!kuisioner) {
      return res.status(404).json({ message: "Data kuisioner tidak ditemukan" });
    }

    const formattedKuisioner = {
      id: kuisioner.id,
      jawabanKuisioner: kuisioner.jawabanKuisioner,
      saran: kuisioner.saran,
      tanggal: kuisioner.tanggal
    };

    return res.status(200).json({ message: "Berhasil mengambil data kuisioner", data: formattedKuisioner });
  } catch (error) {
    console.error("Error fetching kuisioner dosen:", error);
    return res.status(500).json({ message: "Terjadi kesalahan saat mengambil data kuisioner", error: error.message });
  }
});

app.post('/hubungikamisesudahlogin', authenticateToken, async (req, res) => {
  const { noTelp, pesan } = req.body;

  if (!noTelp || !pesan) {
    return res.status(400).json({ message: "Nomor telepon dan pesan wajib diisi." });
  }

  try {
    // Ambil data pengguna berdasarkan ID dari token
    const user = await prisma.users.findUnique({
      where: { id: req.user.id }, // Gunakan ID dari token
      select: { nama: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    // Simpan pesan yang dikirimkan ke tabel 'Hubungi Kami'
    const kirimPesan = await prisma.hubungiKami.create({
      data: {
        nama: user.nama,
        email: user.email,
        noTelp,
        pesan,
        info: 'Member'
      },
    });

    res.status(201).json({ message: "Pesan berhasil dikirim.", data: kirimPesan });
  } catch (error) {
    console.error("Gagal menyimpan pesan:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengirim pesan." });
  }
});

app.post('/hubungikami', async (req, res) => {
  const { nama, email, noTelp, pesan } = req.body;

  // Pastikan semua data wajib ada
  if (!nama || !email || !noTelp || !pesan) {
    return res.status(400).json({ message: "Nama, email, noTelp, dan pesan wajib diisi." });
  }

  try {
    const kirimPesan = await prisma.hubungiKami.create({
      data: {
        nama,
        email,
        noTelp,
        pesan,
        info: 'Pengunjung'
      },
    });

    res.status(201).json({ message: "Pesan berhasil dikirim.", data: kirimPesan });
  } catch (error) {
    console.error("Gagal menyimpan pesan:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat mengirim pesan." });
  }
});

app.get('/hubungi-kami', authenticateToken, async (req, res) => {
  try {
    // Opsional: paginasi, misal dari query ?page=1&limit=10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Ambil total data untuk pagination
    const totalData = await prisma.hubungiKami.count();

    // Ambil data hubungi kami dengan pagination dan urut dari terbaru
    const data = await prisma.hubungiKami.findMany({
      orderBy: { tanggal: 'desc' },
      skip,
      take: limit,
    });

    return res.status(200).json({
      message: "Berhasil mengambil data Hubungi Kami",
      page,
      limit,
      totalData,
      data,
    });
  } catch (error) {
    console.error("Error fetching Hubungi Kami:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat mengambil data Hubungi Kami",
      error: error.message,
    });
  }
});



























































































// Get token
app.get('/token', authenticateToken, (req, res) => {
  res.json({ token: req.token });
});

// Jalankan server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
