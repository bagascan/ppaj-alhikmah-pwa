import React, { useState } from 'react';
import { Form, Button, Card, Container, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.msg || 'Link reset telah dikirim ke email Anda.');
      toast.success('Link reset telah dikirim!');
    } catch (err) {
      toast.error('Terjadi kesalahan.');
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Card style={{ width: '25rem' }}>
        <Card.Body>
          <Card.Title className="text-center mb-4">Lupa Password</Card.Title>
          <p className="text-muted text-center">Masukkan email Anda untuk menerima link reset password.</p>
          {message && <Alert variant="info">{message}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">
              Kirim Link Reset
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ForgotPasswordPage;
