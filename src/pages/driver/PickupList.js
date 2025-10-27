import React, { useState } from 'react';
import { Button, Card, Toast, ToastContainer } from 'react-bootstrap';
import { BsCheckCircle, BsCircle, BsHouseDoor, BsBuilding, BsArrowRepeat } from 'react-icons/bs';
import useWakeLock from '../../hooks/useWakeLock';
import { dummyDrivers } from '../../data/dummyData';

function PickupList({ students, setStudents, trip, setTripHistory }) {
  useWakeLock(); // Automatically activate wake lock
  const [showWarning, setShowWarning] = useState(true);

  // Asumsikan supir yang login adalah supir pertama dari data dummy
  const loggedInDriver = dummyDrivers[0];

  // Filter siswa yang perlu dijemput berdasarkan zona tugas supir
  const pickupList = students
    .filter(s => s.zone === loggedInDriver.zone && s.status === 'Active' && s.pickupStatus !== 'Dropped Off' && s.pickupStatus !== 'Absent')
    .sort((a, b) => a.schedule.pickup.localeCompare(b.schedule.pickup));

  const getNextAction = (status) => {
    switch (status) {
      case 'Pending':
        return { nextStatus: 'Picked Up', label: 'Pick Up', icon: <BsCircle className="me-2"/>, variant: 'outline-primary' };
      case 'Picked Up':
        return { nextStatus: 'At School', label: 'Drop at School', icon: <BsBuilding className="me-2"/>, variant: 'outline-info' };
      case 'At School':
        return { nextStatus: 'Returning', label: 'Pick Up for Return', icon: <BsArrowRepeat className="me-2"/>, variant: 'outline-warning' };
      case 'Returning':
        return { nextStatus: 'Dropped Off', label: 'Drop at Home', icon: <BsHouseDoor className="me-2"/>, variant: 'outline-success' };
      default:
        return { nextStatus: 'Dropped Off', label: 'Completed', icon: <BsCheckCircle className="me-2"/>, variant: 'success', disabled: true };
    }
  };

  const handleStatusUpdate = (studentId, nextStatus) => {
    setStudents(currentStudents => {
      const updatedStudents = currentStudents.map(student =>
        student.id === studentId ? { ...student, pickupStatus: nextStatus } : student
      );

      // --- PERBAIKAN LOGIKA RIWAYAT PERJALANAN ---
      // Cek apakah semua siswa aktif telah selesai diantar
      const activeStudents = updatedStudents.filter(s => s.status === 'Active');
      const allTasksFinished = activeStudents.length > 0 && activeStudents.every(s => s.pickupStatus === 'Dropped Off');

      // Cek apakah sebelumnya belum semua selesai
      const previousStudents = currentStudents.filter(s => s.status === 'Active');
      const wasTripOngoing = previousStudents.length > 0 && !previousStudents.every(s => s.pickupStatus === 'Dropped Off');

      if (allTasksFinished && wasTripOngoing) {
        console.log(`Daily trip finished. Recording to history.`);
        const tripName = `Perjalanan Harian - ${new Date().toLocaleDateString('id-ID')}`;
        const newHistoryEntry = { id: Date.now(), date: new Date().toISOString().slice(0, 10), route: tripName, students: activeStudents.length, status: 'Selesai' };
        // Gunakan callback untuk memastikan state history terbaru
        setTripHistory(prevHistory => [newHistoryEntry, ...prevHistory]);
      }
      // --- AKHIR PERBAIKAN ---
      return updatedStudents;
    });
    // In a real app, you would also send this update to the backend here.
    console.log(`Student ${studentId} status updated to '${nextStatus}'.`);
  };

  return (
    <>
      <h2>Daftar Jemputan Hari Ini</h2>
      <ToastContainer position="top-center" className="p-3" style={{ zIndex: 1055 }}>
        <Toast 
          onClose={() => setShowWarning(false)} 
          show={showWarning} 
          delay={6000} 
          autohide
          bg="warning"
        >
          <Toast.Header>
            <strong className="me-auto">Penting!</strong>
            <small>Baru saja</small>
          </Toast.Header>
          <Toast.Body>
            Layar akan tetap menyala secara otomatis selama Anda bertugas.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {pickupList.length > 0 ? (
        pickupList.map((item, index) => {
          const action = getNextAction(item.pickupStatus);
          return (
            <Card key={item.id} className="mb-3 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <Card.Title>{index + 1}. {item.name}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">{item.address}</Card.Subtitle>
                    <small className="text-info">{item.school} - Jemput: {item.schedule.pickup}</small>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer className="p-2">
                <Button 
                  variant={action.variant}
                  onClick={() => handleStatusUpdate(item.id, action.nextStatus)}
                  disabled={action.disabled}
                  className="w-100 d-flex align-items-center justify-content-center"
                >
                  {action.icon}
                  {action.label}
                </Button>
              </Card.Footer>
            </Card>
          );
        })
      ) : (
        <Card className="text-center p-4 shadow-sm">
          <Card.Body>
            <BsCheckCircle size={40} className="text-success mb-3" />
            <h4>Semua Tugas Selesai!</h4>
            <p className="text-muted">Tidak ada lagi jadwal penjemputan atau pengantaran untuk hari ini.</p>
          </Card.Body>
        </Card>
      )}
    </>
  );
}

export default PickupList;