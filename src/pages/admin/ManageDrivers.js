import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Table, Button, ButtonGroup, Modal, Form, Row, Col, InputGroup, Pagination } from 'react-bootstrap';
import { BsPlus, BsPencil, BsTrash, BsSearch } from 'react-icons/bs';

function ManageDrivers({ drivers, setDrivers }) {
  const [showModal, setShowModal] = useState(false);
  const [currentDriver, setCurrentDriver] = useState(null); // null for 'add', driver object for 'edit'
  const [formData, setFormData] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await axios.get('/api/drivers');
        setDrivers(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDrivers();
  }, [setDrivers]);

  const handleClose = () => {
    setShowModal(false);
    setCurrentDriver(null);
    setFormData({});
  };

  const handleShow = (driver = null) => {
    setCurrentDriver(driver);
    setFormData(driver ? { ...driver } : { name: '', phone: '', zone: '', vehicle: '' });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (currentDriver) {
        // Edit existing driver
        await axios.put(`/api/drivers/${currentDriver._id}`, formData);
        toast.success('Driver updated successfully!');
      } else {
        // Add new driver
        await axios.post('/api/drivers', formData);
        toast.success('Driver added successfully!');
      }
      const res = await axios.get('/api/drivers');
      setDrivers(res.data);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong!');
    }
  };

  const handleDelete = async (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await axios.delete(`/api/drivers/${driverId}`);
        toast.success('Driver deleted successfully!');
        const res = await axios.get('/api/drivers');
        setDrivers(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Something went wrong!');
      }
    }
  };

  const allZones = useMemo(() => [...new Set(drivers.map(driver => driver.zone))], [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter(driver => {
        if (filterZone === 'All') return true;
        return driver.zone === filterZone;
      })
      .filter(driver => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          driver.name.toLowerCase().includes(term) ||
          driver.phone.toLowerCase().includes(term) ||
          driver.vehicle.toLowerCase().includes(term)
        );
      });
  }, [drivers, searchTerm, filterZone]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDrivers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);

  const renderPaginationItems = () => {
    let items = [];
    if (totalPages <= 1) return null;
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => setCurrentPage(number)}>
          {number}
        </Pagination.Item>,
      );
    }
    return <Pagination>{items}</Pagination>;
  };


  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Manage Drivers</h3>
        <Button variant="primary" onClick={() => handleShow()}>
          <BsPlus size={20} /> Add New Driver
        </Button>
      </div>
      <Row className="mb-3">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text><BsSearch /></InputGroup.Text>
            <Form.Control
              placeholder="Search by name, phone, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option value="All">All Zones</option>
            {allZones.map(zone => (
              <option key={zone} value={zone}>Zone {zone}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>
      <Table striped bordered hover responsive className="shadow-sm">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Zone</th>
            <th>Vehicle</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((driver, index) => (
            <tr key={driver._id}>
              <td>{indexOfFirstItem + index + 1}</td>
              <td>{driver.name}</td>
              <td>{driver.phone}</td>
              <td>{driver.zone}</td>
              <td>{driver.vehicle}</td>
              <td>
                <ButtonGroup size="sm">
                  <Button variant="outline-primary" onClick={() => handleShow(driver)}><BsPencil /></Button>
                  <Button variant="outline-danger" onClick={() => handleDelete(driver._id)}><BsTrash /></Button>
                </ButtonGroup>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center">
          {renderPaginationItems()}
        </div>
      )}

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{currentDriver ? 'Edit Driver' : 'Add New Driver'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formDriverName">
              <Form.Label>Driver Name</Form.Label>
              <Form.Control type="text" name="name" value={formData.name || ''} onChange={handleFormChange} placeholder="Enter name" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formDriverPhone">
              <Form.Label>Phone</Form.Label>
              <Form.Control type="text" name="phone" value={formData.phone || ''} onChange={handleFormChange} placeholder="Enter phone number" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formDriverZone">
              <Form.Label>Zone</Form.Label>
              <Form.Control type="text" name="zone" value={formData.zone || ''} onChange={handleFormChange} placeholder="Enter zone (e.g., A, B)" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formDriverVehicle">
              <Form.Label>Vehicle</Form.Label>
              <Form.Control type="text" name="vehicle" value={formData.vehicle || ''} onChange={handleFormChange} placeholder="e.g., Toyota Avanza (L 1234 AB)" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ManageDrivers;