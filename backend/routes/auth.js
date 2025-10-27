const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const SibApiV3Sdk = require('@sendinblue/client');
const auth = require('../auth'); // Impor middleware auth

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password, role, profileId } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ name, email, password, role, profileId });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = { user: { id: user.id, role: user.role, profileId: user.profileId } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Tambahkan JWT_SECRET di file .env Anda
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role, profileId: user.profileId, name: user.name } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/forgot-password
// @desc    Request password reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      // Kirim respons sukses palsu untuk keamanan, agar penyerang tidak tahu email mana yang terdaftar
      return res.json({ msg: 'Jika email Anda terdaftar, Anda akan menerima link reset password.' });
    }

    // 1. Buat token reset
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Simpan token dan tanggal kedaluwarsa (1 jam) ke user
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 jam
    await user.save();

    // 3. Kirim email
    const resetURL = `https://ppaj-alhikmah.vercel.app/reset-password/${resetToken}`;

    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = "Reset Password PPAJ Al-Hikmah";
    sendSmtpEmail.htmlContent = `
      <p>Anda menerima email ini karena Anda (atau orang lain) telah meminta untuk mereset password akun Anda.</p>
      <p>Silakan klik link berikut untuk menyelesaikan proses:</p>
      <a href="${resetURL}" target="_blank">${resetURL}</a>
      <p>Jika Anda tidak meminta ini, abaikan email ini dan password Anda akan tetap sama.</p>
    `;
    sendSmtpEmail.sender = { name: process.env.EMAIL_FROM_NAME, email: process.env.EMAIL_FROM_ADDRESS };
    sendSmtpEmail.to = [{ email: user.email, name: user.name }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.json({ msg: 'Email reset password telah dikirim.' });

  } catch (err) {
    console.error('Error di /forgot-password:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    // 1. Cari user berdasarkan token dan pastikan belum kedaluwarsa
    const user = await User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Token reset password tidak valid atau telah kedaluwarsa.' });
    }

    // 2. Jika token valid, set password baru
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // (Opsional) Login user secara otomatis setelah reset
    // ... logika JWT sign ...

    res.json({ msg: 'Password berhasil direset. Silakan login dengan password baru Anda.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/change-password
// @desc    Change user's password
// @access  Private
router.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // 1. Temukan user berdasarkan ID dari token yang sudah diverifikasi oleh middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User tidak ditemukan.' });
    }

    // 2. Verifikasi password saat ini
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Password saat ini salah.' });
    }

    // 2a. Validasi password baru
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ msg: 'Password baru harus memiliki minimal 8 karakter.' });
    }

    // 3. Hash dan simpan password baru
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password berhasil diubah.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;