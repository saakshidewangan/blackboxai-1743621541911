const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    type: { type: String, required: true, enum: ['restaurant', 'volunteer'] },
    location: { 
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    address: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Create 2dsphere index for geospatial queries
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);