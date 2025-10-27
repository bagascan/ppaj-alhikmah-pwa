import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, ButtonGroup, Modal, Form, Badge, Row, Col, InputGroup, Pagination, Card } from 'react-bootstrap';
import { BsPlus, BsPencil, BsTrash, BsSearch } from 'react-icons/bs';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Component to automatically adjust map view
function MapBounds({ bounds }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds);
  }
  return null;
}

function ManageStudents({ students, setStudents }) {
  const [showModal, setShowModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null); // null for 'add', student object for 'edit'
  const [formData, setFormData] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPickup, setFilterPickup] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [locationEdit, setLocationEdit] = useState(null); // For editing locations

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get('/api/students');
        setStudents(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStudents();
  }, [setStudents]);

  const handleLocationSave = () => {
    if (locationEdit) {
      setStudents(students.map(s => s.id === locationEdit.id ? locationEdit : s));
      alert('Student location updated!');
      setLocationEdit(null); // Close the editor
    }
  };

  const handleLocationCancel = () => {
    setLocationEdit(null);
  };

  const handleClose = () => {
    setShowModal(false);
    setCurrentStudent(null);
    setFormData({});
  };

  const handleShow = (student = null) => {
    setCurrentStudent(student);
    setFormData(student ? { ...student } : { name: '', address: '', parent: '', zone: '', status: 'Active', pickupStatus: 'Pending', school: '', schoolAddress: '', schedule: { pickup: '00:00', dropoff: '00:00' } });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('schedule.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      if (currentStudent) {
        // Edit existing student
        await axios.put(`/api/students/${currentStudent._id}`, formData);
        toast.success('Student updated successfully!');
      } else {
        // Add new student
        await axios.post('/api/students', formData);
        toast.success('Student added successfully!');
      }
      const res = await axios.get('/api/students');
      setStudents(res.data);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong!');
    }
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await axios.delete(`/api/students/${studentId}`);
        toast.success('Student deleted successfully!');
        const res = await axios.get('/api/students');
        setStudents(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Something went wrong!');
      }
    }
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        if (filterStatus === 'All') return true;
        return student.status === filterStatus;
      })
      .filter(student => {
        if (filterPickup === 'All') return true;
        return student.pickupStatus === filterPickup;
      })
      .filter(student => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          student.name.toLowerCase().includes(term) ||
          student.address.toLowerCase().includes(term) ||
          student.parent.toLowerCase().includes(term) ||
          (student.school && student.school.toLowerCase().includes(term))
        );
      });
  }, [students, searchTerm, filterStatus, filterPickup]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const renderPaginationItems = () => {
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => setCurrentPage(number)}>
          {number}
        </Pagination.Item>,
      );
    }
    return items;
  };

  const handleRowClick = (student) => {
    if (student.location && student.schoolLocation) {
      setSelectedStudent(student);
    } else {
      alert('Lokasi rumah atau sekolah untuk siswa ini belum ditentukan.');
    }
  };

  return (
    <>
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Manage Students</h4>
          <Button variant="primary" onClick={() => handleShow()}>
            <BsPlus size={20} /> Add New Student
          </Button>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text><BsSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Search by name, address, or parent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">All Registration Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select value={filterPickup} onChange={(e) => setFilterPickup(e.target.value)}>
                <option value="All">All Pickup Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Picked Up">Picked Up</option>
                <option value="At School">At School</option>
                <option value="Returning">Returning</option>
                <option value="Dropped Off">Dropped Off</option>
              </Form.Select>
            </Col>
          </Row>
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Parent</th>
                  <th>Zone</th>
                  <th>School</th>
                  <th>Status</th>
                  <th>Pickup Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((student, index) => {
                  const getStatusBadge = (status) => {
                    switch (status) {
                      case 'Pending': return 'secondary';
                      case 'Picked Up': return 'primary';
                      case 'At School': return 'info';
                      case 'Returning': return 'warning';
                      case 'Dropped Off': return 'success';
                      default: return 'light';
                    }
                  };
                  return (
                  <tr key={student._id} onClick={() => handleRowClick(student)} style={{ cursor: 'pointer' }}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{student.name}</td>
                    <td>{student.address}</td>
                    <td>{student.parent}</td>
                    <td>{student.zone}</td>
                    <td>{student.school}</td>
                    <td>{student.status}</td>
                    <td>
                      <Badge bg={getStatusBadge(student.pickupStatus)}>
                        {student.pickupStatus}
                      </Badge>
                    </td>
                    <td>
                      <ButtonGroup size="sm" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline-primary" onClick={() => handleShow(student)}><BsPencil /></Button>
                        <Button variant="outline-danger" onClick={() => handleDelete(student._id)}><BsTrash /></Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>{renderPaginationItems()}</Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {selectedStudent && (
        <Card className="mt-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Location Verification: {selectedStudent.name}</h5>
            {!locationEdit && (
              <Button variant="outline-secondary" size="sm" onClick={() => setLocationEdit({ ...selectedStudent })}>
                Correct Location
              </Button>
            )}
          </Card.Header>
          <Card.Body>
            <MapContainer center={(locationEdit || selectedStudent).location} zoom={13} style={{ height: '400px', width: '100%', borderRadius: 'var(--border-radius)' }} key={(locationEdit || selectedStudent).id}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {locationEdit ? (
                <>
                  <Marker
                    draggable={true}
                    position={locationEdit.location}
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        setLocationEdit(prev => ({ ...prev, location: [lat, lng] }));
                      },
                    }}
                  >
                    <Popup>Drag to correct home location.</Popup>
                  </Marker>
                  <Marker
                    draggable={true}
                    position={locationEdit.schoolLocation}
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        setLocationEdit(prev => ({ ...prev, schoolLocation: [lat, lng] }));
                      },
                    }}
                  >
                    <Popup>Drag to correct school location.</Popup>
                  </Marker>
                  <MapBounds bounds={[locationEdit.location, locationEdit.schoolLocation]} />
                </>
              ) : (
                <>
                  <Marker position={selectedStudent.location}>
                    <Popup><b>Rumah:</b> {selectedStudent.address}</Popup>
                  </Marker>
                  <Marker position={selectedStudent.schoolLocation}>
                    <Popup><b>Sekolah:</b> {selectedStudent.schoolAddress}</Popup>
                  </Marker>
                  <MapBounds bounds={[selectedStudent.location, selectedStudent.schoolLocation]} />
                </>
              )}
            </MapContainer>
            {locationEdit && (
              <div className="mt-3 text-end">
                <Button variant="secondary" onClick={handleLocationCancel} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleLocationSave}>
                  Save Locations
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>{currentStudent ? 'Edit Student' : 'Add New Student'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formStudentName">
              <Form.Label>Student Name</Form.Label>
              <Form.Control type="text" name="name" value={formData.name || ''} onChange={handleFormChange} placeholder="Enter name" />
            </Form.Group>
             <Form.Group className="mb-3" controlId="formStudentAddress">
              <Form.Label>Address</Form.Label>
              <Form.Control type="text" name="address" value={formData.address || ''} onChange={handleFormChange} placeholder="Enter address" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formStudentParent">
              <Form.Label>Parent's Name</Form.Label>
              <Form.Control type="text" name="parent" value={formData.parent || ''} onChange={handleFormChange} placeholder="Enter parent's name" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formStudentZone">
              <Form.Label>Zone</Form.Label>
              <Form.Control type="text" name="zone" value={formData.zone || ''} onChange={handleFormChange} placeholder="Enter zone (e.g., A, B)" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formStudentSchool">
              <Form.Label>School</Form.Label>
              <Form.Control type="text" name="school" value={formData.school || ''} onChange={handleFormChange} placeholder="Enter school name" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formSchoolAddress">
              <Form.Label>School Address</Form.Label>
              <Form.Control type="text" name="schoolAddress" value={formData.schoolAddress || ''} onChange={handleFormChange} placeholder="Enter school address" />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3" controlId="formStudentPickupTime">
                  <Form.Label>Pickup Time</Form.Label>
                  <Form.Control type="time" name="schedule.pickup" value={formData.schedule?.pickup || ''} onChange={handleFormChange} />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3" controlId="formStudentDropoffTime">
                  <Form.Label>Dropoff Time</Form.Label>
                  <Form.Control type="time" name="schedule.dropoff" value={formData.schedule?.dropoff || ''} onChange={handleFormChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3" controlId="formStudentStatus">
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" value={formData.status || 'Active'} onChange={handleFormChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Form.Select>
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
    </>
  );
}

export default ManageStudents;
