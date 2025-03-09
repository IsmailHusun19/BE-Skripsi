const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); 
require('dotenv').config();// Tambahkan ini untuk parsing cookie
const multer = require('multer');
const path = require('path');
const cron = require("node-cron");

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cookieParser()); // Gunakan middleware cookie-parser

const cors = require('cors')
app.use(express.urlencoded({ extended: true }));
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads'); // Folder uploads di luar src

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
  
    const token = jwt.sign({ id: user.id, nomorinduk: user.nomorinduk, nama:user.nama, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  
    // Mengatur cookie dengan HttpOnly dan Secure
    res.cookie('jwt', token, {
      httpOnly: true, // Mencegah akses cookie dari JavaScript
      // secure: process.env.NODE_ENV === 'production', // Hanya kirim cookie melalui HTTPS jika di lingkungan produksi
      secure: false, 
      maxAge: 86400000, // Kedaluwarsa 1 jam dalam milidetik (3600000 ms)
      sameSite: 'Strict' // Mencegah pengiriman cookie dari domain lain
    });
    console.log('Setting cookie with token:', token);
  
    res.status(200).json({ message: 'Login successful', token: token });
});

// Get all users (protected route)
app.get('/users', authenticateToken, async (req, res) => {
  const users = await prisma.users.findMany();
  res.json(users);
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


// Update user by ID (protected route) // Pastikan untuk mengimpor bcrypt

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
    // Mendapatkan data mata kuliah berdasarkan ID
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { id: parseInt(id) },
      include: {
        dosen: true,
        materi: {
          include: {
            subMateri: true, // Include subMateri untuk mendapatkan gambar
          },
        },
      },
    });

    // Validasi jika mata kuliah ditemukan
    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah not found' });
    }

    // Mendapatkan data pengguna berdasarkan ID
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Validasi role pengguna
    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers can delete courses' });
    }

    // Validasi apakah dosen yang membuat mata kuliah
    const isOwner = mataKuliah.dosen.some(dosen => dosen.id === user.id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: Only the lecturer who created the course can delete it' });
    }

    // Hapus gambar terkait dari tabel gambar
    for (const materi of mataKuliah.materi) {
      const subMateriList = await prisma.SubMateri.findMany({
        where: { materiId: materi.id },
        include: { gambar: true }, // Menyertakan gambar yang terkait dengan sub-materi
      });
    
      for (const subMateri of subMateriList) {
        // Menghapus gambar yang terkait dengan subMateri
        for (const gambar of subMateri.gambar) {
          await prisma.gambar.delete({
            where: { id: gambar.id }, // Menghapus gambar berdasarkan ID
          });
        }
      }
    }

    // Hapus sub-materi
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

    // Hapus mata kuliah setelah semua relasi dihapus
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
  const { id } = req.params; // ID mata kuliah yang ingin dihapus

  try {
    // Cek apakah mata kuliah tersebut diikuti oleh mahasiswa
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        mahasiswa: true, // Ambil data mahasiswa yang mengikuti
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Periksa apakah mahasiswa ada dalam daftar mahasiswa yang mengikuti mata kuliah
    if (!mataKuliah.mahasiswa.some(mahasiswa => mahasiswa.id === req.user.id)) {
      return res.status(400).json({ error: 'Anda tidak terdaftar di mata kuliah ini' });
    }

    // Menghapus keterkaitan mahasiswa dengan mata kuliah
    await prisma.users.update({
      where: { id: req.user.id },
      data: {
        mataKuliahDiikuti: {
          disconnect: { id: mataKuliah.id },
        },
      },
    });

    res.status(200).json({ message: 'Berhasil meninggalkan mata kuliah' });
  } catch (error) {
    console.error('Error leaving mata kuliah:', error);
    res.status(400).json({ error: 'Gagal meninggalkan mata kuliah' });
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
      include: {
        mataKuliahDiajarkan: true, // Ambil mata kuliah yang diajarkan dosen
        mataKuliahDiikuti: true, // Ambil mata kuliah yang diikuti mahasiswa
      },
    });

    // Cek apakah pengguna adalah dosen
    const isDosen = user.role === 'Dosen';

    // Jika pengguna adalah dosen, cek apakah mereka mengajar mata kuliah tersebut
    if (isDosen) {
      const mataKuliah = user.mataKuliahDiajarkan.find(mk => mk.id === parseInt(mataKuliahId));
      if (!mataKuliah) {
        return res.status(403).json({ error: 'Anda tidak memiliki izin untuk melihat materi mata kuliah ini' });
      }
    } else {
      // Jika pengguna adalah mahasiswa, cek apakah mereka terdaftar di mata kuliah tersebut
      const mataKuliah = user.mataKuliahDiikuti.find(mk => mk.id === parseInt(mataKuliahId));
      if (!mataKuliah) {
        return res.status(403).json({ error: 'Anda tidak memiliki izin untuk melihat materi mata kuliah ini' });
      }
    }

    // Ambil semua materi dari mata kuliah tersebut
    const materi = await prisma.Materi.findMany({
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


app.post('/sub-materi', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { judul, type, isi, materiId, pilihan, jawabanBenar, pertanyaan } = req.body;

    if (!materiId) {
      return res.status(400).json({ message: "materiId diperlukan" });
    }

    let pilihanArray = [];
    let jawabanBenarArray = [];
    let pertanyaanArray = [];

    if (type === 'kuis') {
      try {
        pilihanArray = pilihan ? JSON.parse(pilihan) : [];
        jawabanBenarArray = jawabanBenar ? JSON.parse(jawabanBenar) : [];
        pertanyaanArray = pertanyaan ? JSON.parse(pertanyaan) : [];
      } catch (err) {
        return res.status(400).json({ message: "Format pilihan tidak valid" });
      }
    }

    // Proses upload file
    let filePaths = [];
    if (req.files && req.files.length > 0) {
      filePaths = req.files.map(file => `/uploads/${file.filename}`);
    }

    // Simpan ke database
    const newSubMateri = await prisma.subMateri.create({
      data: {
        judul,
        type,
        isi: type === 'materi' ? isi : null,
        materiId: parseInt(materiId),
        pilihan: type === 'kuis' ? pilihanArray : [],
        jawabanBenar: type === 'kuis' ? jawabanBenarArray : [],
        pertanyaan: type === 'kuis' ? pertanyaanArray : [],
        fileMateri: {
          create: filePaths.map(path => ({ url: path }))
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

app.put('/sub-materi/:id', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, type, isi, materiId, pilihan, jawabanBenar, pertanyaan } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID subMateri diperlukan" });
    }

    let pilihanArray = [];
    let jawabanBenarArray = [];
    let pertanyaanArray = [];

    if (type === 'kuis') {
      try {
        pilihanArray = pilihan ? JSON.parse(pilihan) : [];
        jawabanBenarArray = jawabanBenar ? JSON.parse(jawabanBenar) : [];
        pertanyaanArray = pertanyaan ? JSON.parse(pertanyaan) : [];
      } catch (err) {
        return res.status(400).json({ message: "Format pilihan tidak valid" });
      }
    }

    // Proses upload file
    let filePaths = [];
    if (req.files && req.files.length > 0) {
      filePaths = req.files.map(file => `/uploads/${file.filename}`);
    }

    // Periksa apakah subMateri ada
    const existingSubMateri = await prisma.subMateri.findUnique({
      where: { id: parseInt(id) },
      include: { fileMateri: true }
    });

    if (!existingSubMateri) {
      return res.status(404).json({ message: "SubMateri tidak ditemukan" });
    }

    // Hapus file lama jika ada file baru diupload
    if (filePaths.length > 0) {
      await prisma.fileMateri.deleteMany({ where: { subMateriId: parseInt(id) } });
    }

    // Update subMateri
    const updatedSubMateri = await prisma.subMateri.update({
      where: { id: parseInt(id) },
      data: {
        judul,
        type,
        isi: type === 'materi' ? isi : null,
        materiId: parseInt(materiId),
        pilihan: type === 'kuis' ? pilihanArray : [],
        jawabanBenar: type === 'kuis' ? jawabanBenarArray : [],
        pertanyaan: type === 'kuis' ? pertanyaanArray : [],
        fileMateri: filePaths.length > 0 ? {
          create: filePaths.map(path => ({ url: path }))
        } : undefined
      },
      include: {
        fileMateri: true,
      }
    });

    console.log("Data yang diperbarui:", updatedSubMateri);
    res.status(200).json(updatedSubMateri);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memperbarui sub-materi' });
  }
});

app.get('/sub-materi/:matakuliahId', authenticateToken, async (req, res) => {
  try {
    const { matakuliahId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Cek apakah mata kuliah ini ada
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: parseInt(matakuliahId) },
      include: { dosen: true }
    });

    if (!mataKuliah) {
      return res.status(404).json({ message: "Mata kuliah tidak ditemukan" });
    }

    // ✅ Jika user adalah Mahasiswa, cek apakah dia mengikuti mata kuliah ini
    if (userRole === "Mahasiswa") {
      const isEnrolled = await prisma.mataKuliahMahasiswa.findFirst({
        where: {
          mahasiswaId: userId,
          mataKuliahId: parseInt(matakuliahId)
        }
      });

      if (!isEnrolled) {
        return res.status(403).json({ message: "Anda belum bergabung dalam mata kuliah ini" });
      }
    }

    // ✅ Jika user adalah Dosen, cek apakah dia mengajar mata kuliah ini
    if (userRole === "Dosen") {
      const isDosen = mataKuliah.dosen.some((dosen) => dosen.id === userId);
      if (!isDosen) {
        return res.status(403).json({ message: "Anda bukan dosen pengampu mata kuliah ini" });
      }
    }

    // ✅ Ambil semua sub-materi berdasarkan materi yang ada dalam mata kuliah ini
    const subMateri = await prisma.subMateri.findMany({
      where: {
        materi: {
          mataKuliahId: parseInt(matakuliahId)
        }
      },
      include: {
        fileMateri: true,
        GambarMateri: true
      }
    });

    if (!subMateri.length) {
      return res.status(404).json({ message: "Sub-materi tidak ditemukan" });
    }

    res.status(200).json(subMateri);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam mengambil sub-materi" });
  }
});

app.get('/sub-materi/detail/:subMateriId', authenticateToken, async (req, res) => {
  try {
    const { subMateriId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Cek apakah sub-materi ini ada
    const subMateri = await prisma.subMateri.findUnique({
      where: { id: parseInt(subMateriId) },
      include: {
        materi: {
          include: {
            mataKuliah: {
              include: { dosen: true }
            }
          }
        },
        fileMateri: true,
        GambarMateri: true
      }
    });

    if (!subMateri) {
      return res.status(404).json({ message: "Sub-materi tidak ditemukan" });
    }

    const mataKuliah = subMateri.materi.mataKuliah;

    // ✅ Jika user adalah Mahasiswa, cek apakah dia mengikuti mata kuliah ini
    if (userRole === "Mahasiswa") {
      const isEnrolled = await prisma.mataKuliahMahasiswa.findFirst({
        where: {
          mahasiswaId: userId,
          mataKuliahId: mataKuliah.id
        }
      });

      if (!isEnrolled) {
        return res.status(403).json({ message: "Anda belum bergabung dalam mata kuliah ini" });
      }
    }

    // ✅ Jika user adalah Dosen, cek apakah dia mengajar mata kuliah ini
    if (userRole === "Dosen") {
      const isDosen = mataKuliah.dosen.some((dosen) => dosen.id === userId);
      if (!isDosen) {
        return res.status(403).json({ message: "Anda bukan dosen pengampu mata kuliah ini" });
      }
    }

    res.status(200).json(subMateri);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan dalam mengambil sub-materi" });
  }
});

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


















































// Get token
app.get('/token', authenticateToken, (req, res) => {
  res.json({ token: req.token });
});

// Jalankan server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
