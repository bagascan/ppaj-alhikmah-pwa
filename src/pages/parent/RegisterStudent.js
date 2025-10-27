import React from 'react';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
import { dummySchools } from '../../data/dummyData';

function RegisterStudent() {
  return (
    <Container>
      <h2>Daftarkan Siswa Baru</h2>
      <Card className="shadow-sm">
        <Card.Body>
          <Alert variant="info">
            Setelah mendaftar, data akan diverifikasi oleh admin.
          </Alert>
          <Form>
            <Form.Group className="mb-3" controlId="formStudentName">
              <Form.Label>Nama Lengkap Siswa</Form.Label>
              <Form.Control type="text" placeholder="Masukkan nama siswa" />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formStudentAddress">
              <Form.Label>Alamat Jemput</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Masukkan alamat lengkap" />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formSchool">
              <Form.Label>Sekolah</Form.Label>
              <Form.Select>
                <option value="">Pilih sekolah...</option>
                {dummySchools.map(school => <option key={school.id} value={school.name}>{school.name}</option>)}
              </Form.Select>
            </Form.Group>

            <Button variant="primary" type="submit">Daftar</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default RegisterStudent;