const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeliverySchema = new Schema({
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['in_progress', 'completed'],
        default: 'in_progress'
    },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

module.exports = mongoose.model('Delivery', DeliverySchema);