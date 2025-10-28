const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ParentSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true // Nama wali murid harus unik
  }
});

module.exports = mongoose.model('parent', ParentSchema);