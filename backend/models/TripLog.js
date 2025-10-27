const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TripLogSchema = new Schema({
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  // Mencatat setiap perubahan status beserta waktunya
  events: [
    {
      status: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model('TripLog', TripLogSchema);