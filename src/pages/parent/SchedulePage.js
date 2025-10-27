import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Alert, ListGroup } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';
import api from '../../api';

function SchedulePage() {
  const [myStudents, setMyStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [parentName, setParentName] = useState(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateString = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(atob(token.split('.')[1])).user;
      if (user.role === 'parent') setParentName(user.profileId);
    }
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!parentName) return;
      try {
        // Panggil endpoint yang aman dan efisien untuk wali murid
        const res = await api.get('/students/my-students');
        const studentsOfParent = res.data || []; // Data sudah terfilter dari backend
        setMyStudents(studentsOfParent.map(s => ({
          ...s,
          // Inisialisasi form berdasarkan data nextDayService jika ada dan valid
          scheduleChoice: s.nextDayService?.date?.startsWith(tomorrowDateString)
            ? (s.nextDayService.isAbsent ? 'absent' : (s.nextDayService.pickup && s.nextDayService.dropoff ? 'both' : (s.nextDayService.pickup ? 'pickup_only' : 'dropoff_only')))
            : 'both'
        })));
      } catch (err) {
        setError("Gagal memuat data siswa.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [parentName, tomorrowDateString]);

  const handleScheduleChange = (studentId, value) => {
    setMyStudents(prev => prev.map(s => s._id === studentId ? { ...s, scheduleChoice: value } : s));
  };

  const handleSaveSchedule = async (studentId) => {
    const student = myStudents.find(s => s._id === studentId);
    if (!student) return;

    const scheduleData = {
      date: tomorrowDateString,
      isAbsent: student.scheduleChoice === 'absent',
      pickup: student.scheduleChoice === 'both' || student.scheduleChoice === 'pickup_only',
      dropoff: student.scheduleChoice === 'both' || student.scheduleChoice === 'dropoff_only',
    };

    try {
      await api.put(`/students/${studentId}`, { nextDayService: scheduleData });
      toast.success(`Jadwal untuk ${student.name} berhasil disimpan!`);
    } catch (err) {
      toast.error(`Gagal menyimpan jadwal untuk ${student.name}.`);
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <h2>Atur Jadwal Anak</h2>
      <Alert variant="info">
        Atur jadwal antar-jemput untuk besok, <strong>{tomorrow.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
        Jadwal akan otomatis diterapkan pada pagi hari.
      </Alert>

      {myStudents.map(student => (
        <Card key={student._id} className="mb-3">
          <Card.Header as="h5">{student.name}</Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Check type="radio" id={`both-${student._id}`} name={`schedule-${student._id}`} value="both" label="Hadir (Jemput & Antar)" checked={student.scheduleChoice === 'both'} onChange={(e) => handleScheduleChange(student._id, e.target.value)} />
              <Form.Check type="radio" id={`pickup-${student._id}`} name={`schedule-${student._id}`} value="pickup_only" label="Hanya Jemput (Berangkat)" checked={student.scheduleChoice === 'pickup_only'} onChange={(e) => handleScheduleChange(student._id, e.target.value)} />
              <Form.Check type="radio" id={`dropoff-${student._id}`} name={`schedule-${student._id}`} value="dropoff_only" label="Hanya Antar (Pulang)" checked={student.scheduleChoice === 'dropoff_only'} onChange={(e) => handleScheduleChange(student._id, e.target.value)} />
              <Form.Check type="radio" id={`absent-${student._id}`} name={`schedule-${student._id}`} value="absent" label="Absen / Tidak Ikut" checked={student.scheduleChoice === 'absent'} onChange={(e) => handleScheduleChange(student._id, e.target.value)} />
            </Form.Group>
            <Button variant="primary" className="mt-3" onClick={() => handleSaveSchedule(student._id)}>Simpan Jadwal</Button>
          </Card.Body>
        </Card>
      ))}
    </>
  );
}

export default SchedulePage;