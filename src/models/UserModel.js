
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  is_admin: {
    type: String,
    required: false
  },
  is_varified: {
    type: String,
    default: 0
  }
});

module.exports = mongoose.model('User', UserSchema);