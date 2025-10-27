
const express = require('express');
const router = express.Router();
const School = require('../models/School');

// @route   GET api/schools
// @desc    Get all schools
// @access  Public
router.get('/', async (req, res) => {
  try {
    const schools = await School.find();
    res.json(schools);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/schools
// @desc    Add a new school
// @access  Public
router.post('/', async (req, res) => {
  const { name, address, location } = req.body;

  try {
    const newSchool = new School({
      name,
      address,
      location
    });

    const school = await newSchool.save();
    res.json(school);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/schools/:id
// @desc    Update a school
// @access  Public
router.put('/:id', async (req, res) => {
  const { name, address, location } = req.body;

  // Build school object
  const schoolFields = {};
  if (name) schoolFields.name = name;
  if (address) schoolFields.address = address;
  if (location) schoolFields.location = location;

  try {
    let school = await School.findById(req.params.id);

    if (!school) return res.status(404).json({ msg: 'School not found' });

    school = await School.findByIdAndUpdate(
      req.params.id,
      { $set: schoolFields },
      { new: true }
    );

    res.json(school);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/schools/:id
// @desc    Delete a school
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    let school = await School.findById(req.params.id);

    if (!school) return res.status(404).json({ msg: 'School not found' });

    await School.findByIdAndRemove(req.params.id);

    res.json({ msg: 'School removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
