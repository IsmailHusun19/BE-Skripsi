const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); 
require('dotenv').config();// Tambahkan ini untuk parsing cookie

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cookieParser()); // Gunakan middleware cookie-parser

const cors = require('cors');

// Gunakan cors dengan pengaturan yang sesuai
app.use(cors({
    origin: 'http://localhost:5173', // Ganti dengan URL frontend Anda
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
function generateKodeGabung(tanggalMulai, dosenId, mataKuliahId) {
  const randomPart = crypto.randomBytes(3).toString('hex'); // Generate 6 random hex characters
  const datePart = new Date(tanggalMulai).toISOString().split('T')[0].replace(/-/g, ''); // Format tanggal (YYYYMMDD)
  const combinedId = `${datePart}${dosenId}${mataKuliahId}${randomPart}`;
  
  // Acak urutan dan batasi panjang kodeGabung hanya 20 karakter
  return combinedId.split('').sort(() => Math.random() - 0.5).join('').substring(0, 20);
}

// Rute untuk membuat mata kuliah
app.post('/mata-kuliah', authenticateToken, async (req, res) => {
  const { nama, tanggalMulai, tanggalAkhir } = req.body;

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
        tanggalMulai,
        tanggalAkhir,
        kodeGabung: generateKodeGabung(tanggalMulai, req.user.id, 163732), // Ganti '163732' dengan ID mata kuliah yang sebenarnya jika sudah ada
        dosen: {
          connect: { id: req.user.id } // Mengaitkan dosen yang sedang login
        }
      },
      include: {
        dosen: true, // Menyertakan informasi dosen
      },
    });

    // Mengambil nama dosen
    const namaDosen = user.nama; // Mengambil nama dosen dari data pengguna

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
  const { nama, tanggalMulai, tanggalAkhir } = req.body;

  try {
    // Mendapatkan data pengguna berdasarkan ID
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Validasi role pengguna
    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers can edit courses' });
    }

    // Mengupdate mata kuliah
    const mataKuliah = await prisma.MataKuliah.update({
      where: {
        id: parseInt(id),
      },
      data: {
        nama,
        tanggalMulai,
        tanggalAkhir,
        // Kode gabung tidak perlu diupdate di sini, jika perlu Anda bisa menambahkannya.
        kodeGabung: generateKodeGabung(tanggalMulai, req.user.id, parseInt(id)), // Menghasilkan kodeGabung baru jika diperlukan
      },
    });
    res.json(mataKuliah);
  } catch (error) {
    console.error('Error updating mata kuliah:', error);
    res.status(400).json({ error: 'Failed to update mata kuliah' });
  }
});

// Delete a course by ID (protected route)
app.delete('/mata-kuliah/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Mendapatkan data pengguna berdasarkan ID
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
    });

    // Validasi role pengguna
    if (user.role !== 'Dosen') {
      return res.status(403).json({ error: 'Forbidden: Only lecturers can delete courses' });
    }

    // Menghapus mata kuliah
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
    const mataKuliah = await prisma.MataKuliah.findUnique({
      where: { kodeGabung: kodeGabung },
      include: {
        mahasiswa: true, // Ambil data mahasiswa yang mengikuti mata kuliah
      },
    });

    if (!mataKuliah) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan' });
    }

    // Periksa apakah mahasiswa sudah terdaftar di mata kuliah tersebut
    if (mataKuliah.mahasiswa.some(mahasiswa => mahasiswa.id === req.user.id)) {
      return res.status(400).json({ error: 'Anda sudah terdaftar di mata kuliah ini' });
    }

    // Menambahkan mahasiswa ke mata kuliah
    await prisma.users.update({
      where: { id: req.user.id },
      data: {
        mataKuliahDiikuti: {
          connect: { id: mataKuliah.id },
        },
      },
    });

    res.status(200).json({ message: 'Berhasil bergabung ke mata kuliah' });
  } catch (error) {
    console.error('Error joining mata kuliah:', error);
    res.status(400).json({ error: 'Gagal bergabung ke mata kuliah' });
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
    const { id, role } = req.user; // Mengambil ID dan role dari user yang login

    let mataKuliahDiikuti = [];
    let mataKuliahDiajarkan = [];

    // Jika role adalah "Mahasiswa", ambil mata kuliah yang diikuti
    if (role === 'Mahasiswa') {
      const mahasiswa = await prisma.users.findUnique({
        where: { id: id },
        include: { mataKuliahDiikuti: true }, // Relasi ke mataKuliahDiikuti
      });

      if (mahasiswa) {
        mataKuliahDiikuti = mahasiswa.mataKuliahDiikuti;
      }
    }

    // Jika role adalah "Dosen", ambil mata kuliah yang diajarkan
    if (role === 'Dosen') {
      const dosen = await prisma.users.findUnique({
        where: { id: id },
        include: { mataKuliahDiajarkan: true }, // Relasi ke mataKuliahDiajarkan
      });

      if (dosen) {
        mataKuliahDiajarkan = dosen.mataKuliahDiajarkan;
      }
    }

    // Mengembalikan hasil sesuai dengan peran
    res.status(200).json({
      mataKuliahDiikuti: role === 'Mahasiswa' ? mataKuliahDiikuti : [],
      mataKuliahDiajarkan: role === 'Dosen' ? mataKuliahDiajarkan : [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
