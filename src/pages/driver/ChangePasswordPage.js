import React, { useState } from 'react';
import { Form, Button, Card, Container, Alert } from 'react-bootstrap';
import api from '../../api'; // Gunakan instance api kustom
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password baru tidak cocok.');
      return;
    }

    try {
      // Interceptor di `api.js` akan menangani token secara otomatis
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      toast.success('Password berhasil diubah!');
      navigate('/driver/profile'); // Kembali ke halaman profil

    } catch (err) {
      setError(err.response?.data?.msg || 'Gagal mengubah password.');
    }
  };

  return (
    <Container>
      <h2 className="mt-3">Ubah Password</h2>
      <Card>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Password Saat Ini</Form.Label>
              <Form.Control type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password Baru</Form.Label>
              <Form.Control type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Konfirmasi Password Baru</Form.Label>
              <Form.Control type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
            </Form.Group>
            <Button variant="primary" type="submit">Simpan Perubahan</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ChangePasswordPage;