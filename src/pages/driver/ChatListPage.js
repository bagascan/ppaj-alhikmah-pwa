import React, { useState, useEffect } from 'react';
import { Spinner, Alert, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth'; // Impor hook baru

function ChatListPage() {
  const [parentList, setParentList] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, loading: authLoading } = useAuth(); // Gunakan hook

  useEffect(() => {
    const fetchParentList = async () => {
      if (authLoading || !auth || auth.user.role !== 'driver') {
        if (!authLoading) setError("Akses ditolak.");
        setDataLoading(false);
        return;
      }

      try {
        // 1. Ambil data supir yang login
        const driverRes = await api.get(`/drivers/${auth.user.profileId}`);
        const myDriver = driverRes.data;

        // 2. Ambil semua siswa
        const studentsRes = await api.get('/students');

        // 3. Filter siswa yang ada di zona supir
        const studentsInZone = studentsRes.data.filter(s => s.zone === myDriver.zone);

        // 4. Buat daftar wali murid yang unik dari siswa-siswa tersebut
        const uniqueParents = [...new Map(studentsInZone.map(item => [item.parent, item])).values()];
        setParentList(uniqueParents.map(s => ({ parentId: s.parent, studentName: s.name })));

      } catch (err) {
        setError(err.message);
        toast.error("Gagal memuat daftar wali murid.");
      } finally {
        setDataLoading(false);
      }
    };

    fetchParentList();
  }, [auth, authLoading]);

  if (authLoading || dataLoading) return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat daftar...</p></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <h2 className="mt-3">Pilih Wali Murid</h2>
      {parentList.length > 0 ? (
        parentList.map(({ parentId, studentName }) => (
          <Card as={Link} to={`/driver/chat/${parentId}`} key={parentId} className="mb-3 text-decoration-none text-dark shadow-sm">
            <Card.Body>
              <Card.Title className="mb-1">{parentId}</Card.Title>
              <Card.Text className="text-muted small">Wali dari ananda {studentName}</Card.Text>
            </Card.Body>
          </Card>
        ))
      ) : (
        <Alert variant="info">Tidak ada wali murid di zona Anda.</Alert>
      )}
    </>
  );
}

export default ChatListPage;