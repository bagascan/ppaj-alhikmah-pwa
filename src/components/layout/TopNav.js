import React from 'react';
import { Navbar, Container, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { BsHouseDoorFill } from 'react-icons/bs';

function TopNav({ title }) {
  return (
    <Navbar bg="light" variant="light" fixed="top" className="top-nav shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold">
          {title || 'PPAJ Al-Hikmah'}
        </Navbar.Brand>
        <Nav className="ms-auto">
          <Nav.Link as={Link} to="/">
            <BsHouseDoorFill size={24} />
          </Nav.Link>
        </Nav>
      </Container>
    </Navbar>
  );
}

export default TopNav;