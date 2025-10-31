const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Zone = require('../models/Zone');
const auth = require('../auth');

// @route   GET api/zones
// @desc    Get all zones
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Pastikan untuk mengambil semua field, termasuk _id dan name
    const zonesFromDB = await Zone.find().sort({ name: 1 });

    // PERBAIKAN: Buat ulang objek secara manual untuk memastikan 'geometry' disertakan.
    const plainZones = zonesFromDB.map(zone => ({
      _id: zone._id,
      name: zone.name,
      geojson: zone.geojson || null, // PERBAIKAN: Beri nilai default null jika geojson tidak ada
    }));

    res.json(plainZones);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/zones/by-coords
// @desc    Find a zone and its assigned driver by geographic coordinates
// @access  Private
router.get('/by-coords', auth, async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ msg: 'Latitude and Longitude are required.' });
  }

  try {
    const zone = await Zone.findOne({
      "geojson.geometry": { // Perbaiki path query
        $geoIntersects: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } }
      }
    });

    if (!zone) {
      return res.json(null); // Jika tidak ada zona, kembalikan null
    }

    // Jika zona ditemukan, cari supir yang ditugaskan ke zona tersebut
    const driver = await Driver.findOne({ zone: zone.name });

    res.json({ zone, driver }); // Kembalikan objek yang berisi zona dan supir (supir bisa jadi null)
  } catch (err) {
    console.error('Error finding zone by coords:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/zones
// @desc    Add a new zone
// @access  Private (Admin)
router.post('/', auth, async (req, res) => {
  // Sekarang menerima 'name' dan 'geometry' dari frontend
  const { name, geojson } = req.body; // Ganti geometry menjadi geojson
  try {
    let zone = await Zone.findOne({ name });
    if (zone) {
      return res.status(400).json({ msg: 'Zona sudah ada.' });
    }
    // Buat zona baru dengan nama dan geometri poligon
    zone = new Zone({ name, geojson }); // Ganti geometry menjadi geojson
    await zone.save();
    res.json(zone);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/zones/:id
// @desc    Update a zone's geometry
// @access  Private (Admin)
router.put('/:id', auth, async (req, res) => {
  const { geojson } = req.body; // Ganti geometry menjadi geojson
  try {
    const updatedZone = await Zone.findByIdAndUpdate(
      req.params.id,
      { $set: { geojson: geojson } }, // Ganti geometry menjadi geojson
      { new: true }
    );
    if (!updatedZone) return res.status(404).json({ msg: 'Zona tidak ditemukan.' });
    res.json(updatedZone);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/zones/:id
// @desc    Delete a zone
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ msg: 'Zona tidak ditemukan.' });
    }
    await Zone.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Zona berhasil dihapus.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;