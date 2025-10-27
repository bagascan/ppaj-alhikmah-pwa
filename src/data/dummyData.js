
export const dummyStudents = [
  { id: 1, name: 'Ahmad Zaki', address: 'Jl. Merdeka 1, Surabaya', status: 'Active', parent: 'Budi Santoso', zone: 'A', pickupStatus: 'Pending', location: [-7.26, 112.75], school: 'SD Al-Hikmah', schedule: { pickup: '06:30', dropoff: '13:00' } },
  { id: 2, name: 'Citra Lestari', address: 'Jl. Pahlawan 2, Surabaya', status: 'Active', parent: 'Siti Aminah', zone: 'B', pickupStatus: 'Pending', location: [-7.25, 112.76], school: 'SMP Al-Irsyad', schedule: { pickup: '07:00', dropoff: '14:00' } },
  // CONTOH SERAH TERIMA: Bima Sakti dipindahkan dari Zona A (Supardi) ke Zona B (Joko)
  { id: 3, name: 'Bima Sakti', address: 'Jl. Diponegoro 3, Surabaya', status: 'Active', parent: 'Joko Widodo', zone: 'B', pickupStatus: 'Picked Up', location: [-7.265, 112.752], school: 'SD Al-Hikmah', schedule: { pickup: '06:30', dropoff: '13:00' } },
  // Siswa kedua untuk wali murid Budi Santoso, sekolah berbeda
  { id: 4, name: 'Annisa Putri', address: 'Jl. Merdeka 1, Surabaya', status: 'Active', parent: 'Budi Santoso', zone: 'B', pickupStatus: 'Pending', location: [-7.26, 112.75], school: 'SMP Al-Irsyad', schedule: { pickup: '07:00', dropoff: '14:00' } },
  // Siswa ketiga untuk supir Supardi (Zona A), sekolah berbeda
  { id: 5, name: 'Eko Prasetyo', address: 'Jl. Kartini 4, Surabaya', status: 'Active', parent: 'Dewi Lestari', zone: 'A', pickupStatus: 'Pending', location: [-7.27, 112.755], school: 'SMP Al-Irsyad', schedule: { pickup: '06:45', dropoff: '14:00' } },
];

export const dummySchools = [
  { id: 1, name: 'SD Al-Hikmah', location: [-7.28, 112.78] },
  { id: 2, name: 'SMP Al-Irsyad', location: [-7.29, 112.79] },
];

export const dummyDrivers = [
  { id: 1, name: 'Supardi', phone: '081234567890', zone: 'A', vehicle: 'Toyota Avanza (L 1234 AB)' },
  { id: 2, name: 'Joko', phone: '087654321098', zone: 'B', vehicle: 'Daihatsu Xenia (L 5678 CD)' },
];

export const dummyDriverLocation = {
  lat: -7.2575, // Surabaya
  lng: 112.7521,
};

export const dummyRoute = [
  { lat: -7.2575, lng: 112.7521 },
  { lat: -7.26, lng: 112.75 },
  { lat: -7.265, lng: 112.752 },
];

export const dummyMessages = [
    { from: 'parent', text: 'Supirnya sudah sampai mana ya?', time: '10:30' },
    { from: 'driver', text: 'Sudah di Jl. Pahlawan, bu. Sebentar lagi sampai.', time: '10:31' },
];

export const dummyTripHistory = [
  { id: 1, date: '2024-07-28', route: 'Jemput Pagi - SD Al-Hikmah', students: 5, status: 'Selesai' },
  { id: 2, date: '2024-07-28', route: 'Pulang Siang - SD Al-Hikmah', students: 5, status: 'Selesai' },
  { id: 3, date: '2024-07-27', route: 'Jemput Pagi - SD Al-Hikmah', students: 4, status: 'Selesai' },
  { id: 4, date: '2024-07-27', route: 'Pulang Siang - SD Al-Hikmah', students: 4, status: 'Selesai' },
];

export const dummyZones = [
  {
    id: 'zone-1',
    geojson: {
      "type": "Feature",
      "properties": { "name": "Zona Surabaya Timur", "color": "#ff7800" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [112.74, -7.25], [112.76, -7.25], [112.76, -7.27], [112.74, -7.27], [112.74, -7.25]
          ]
        ]
      }
    }
  }
];
