import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { BsPersonVideo, BsPersonWorkspace, BsCarFront } from 'react-icons/bs';


function Home() {
  return (
    <Container>
      <div className="text-center mb-5">
        <h1 className="page-title">PPAJ Al-Hikmah</h1>
        <p className="lead text-muted">Aplikasi Antar-Jemput Siswa Modern</p>
      </div>
      <Row className="justify-content-md-center">
        <Col md={4} className="mb-4">
          <Card as={Link} to="/parent" className="text-center text-decoration-none h-100">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              <BsPersonVideo size={50} className="mb-3 text-primary" />
              <Card.Title className="mb-2">Wali Murid</Card.Title>
              <Card.Text className="text-muted small">
                Lacak lokasi, lihat ETA, dan berkomunikasi dengan supir.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card as={Link} to="/driver" className="text-center text-decoration-none h-100">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              <BsCarFront size={50} className="mb-3 text-success" />
              <Card.Title className="mb-2">Supir</Card.Title>
              <Card.Text className="text-muted small">
                Lihat daftar jemputan, navigasi rute, dan perbarui status.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card as={Link} to="/admin" className="text-center text-decoration-none h-100">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
              <BsPersonWorkspace size={50} className="mb-3 text-info" />
              <Card.Title className="mb-2">Administrator</Card.Title>
              <Card.Text className="text-muted small">
                Kelola data, atur zona, dan monitor seluruh armada.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Home;