import React, { useState, useEffect, useMemo } from 'react';
import { Form, Button, Card, Row, Col, Spinner, Alert, ListGroup, Badge } from 'react-bootstrap';
import api from '../../api';
import { toast } from 'react-toastify';
import { BsCalendarDate, BsPerson, BsTruck } from 'react-icons/bs';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Daftarkan komponen Chart.js yang akan digunakan
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
function ReportPage() {
  const [reportData, setReportData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    driverId: '',
    zone: ''
  });
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch drivers and zones for filter dropdowns
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [driversRes, zonesRes] = await Promise.all([
          api.get('/drivers'),
          api.get('/zones')
        ]);
        setDrivers(driversRes.data);
        setZones(zonesRes.data);
      } catch (err) {
        toast.error("Gagal memuat data filter.");
      }
    };
    fetchFilterData();
  }, []); // Data ini statis, tidak perlu auth sebagai dependensi

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData([]);
    try {
      const res = await api.get('/reports/trips', { params: filters });
      setReportData(res.data);
      if (res.data.length === 0) {
        toast.info("Tidak ada data laporan yang ditemukan untuk filter ini.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Gagal membuat laporan.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Proses data untuk grafik menggunakan useMemo agar efisien
  const chartData = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return null;
    }

    // Hitung jumlah perjalanan per tanggal
    const tripsByDate = reportData.reduce((acc, log) => {
      const date = new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(tripsByDate).reverse(); // Balik urutan agar tanggal terbaru di kanan
    const data = Object.values(tripsByDate).reverse();

    return {
      labels,
      datasets: [
        {
          label: 'Jumlah Perjalanan',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [reportData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Grafik Jumlah Perjalanan per Hari',
      },
    },
  };

  return (
    <>
      <h2>Laporan Perjalanan</h2>
      <Card className="mb-4">
        <Card.Header>Filter Laporan</Card.Header>
        <Card.Body>
          <Row className="align-items-end">
            <Col md={3}><Form.Group><Form.Label>Tanggal Mulai</Form.Label><Form.Control type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} /></Form.Group></Col>
            <Col md={3}><Form.Group><Form.Label>Tanggal Selesai</Form.Label><Form.Control type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} /></Form.Group></Col>
            <Col md={2}><Form.Group><Form.Label>Supir</Form.Label><Form.Select name="driverId" value={filters.driverId} onChange={handleFilterChange}><option value="">Semua</option>{drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}</Form.Select></Form.Group></Col>
            <Col md={2}><Form.Group><Form.Label>Zona</Form.Label><Form.Select name="zone" value={filters.zone} onChange={handleFilterChange}><option value="">Semua</option>{zones.map(z => <option key={z._id} value={z.name}>{z.name}</option>)}</Form.Select></Form.Group></Col>
            <Col md={2}><Button onClick={handleGenerateReport} disabled={loading} className="w-100 mt-2">{loading ? <Spinner as="span" size="sm" /> : 'Buat Laporan'}</Button></Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && <div className="text-center"><Spinner animation="border" /></div>}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && reportData.length > 0 && (
        <>
          {/* Tampilkan Grafik di sini */}
          {chartData && (
            <Card className="mb-4">
              <Card.Body>
                <Bar options={chartOptions} data={chartData} />
              </Card.Body>
            </Card>
          )}

          <h3 className="mt-4">Hasil Laporan</h3>
          {reportData.map(log => (
            <Card key={log._id} className="mb-3 shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="fw-bold d-flex align-items-center"><BsPerson className="me-2" />{log.student?.name || 'Siswa Dihapus'}</div>
                <Badge bg="secondary" pill><BsCalendarDate className="me-1" />{new Date(log.date).toLocaleDateString('id-ID')}</Badge>
              </Card.Header>
              <Card.Body>
                <Card.Text className="d-flex align-items-center mb-3">
                  <BsTruck className="me-2" /> Supir: <strong>{log.driver?.name || 'N/A'}</strong>
                </Card.Text>
                <ListGroup variant="flush">
                  {log.events.map((event, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between px-0">
                      <span>{event.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-muted small">
                        {new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          ))}
        </>
      )}
    </>
  );
}

export default ReportPage;