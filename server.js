require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodshare', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const User = require('./models/user.model');
const Match = require('./models/match.model');
const Delivery = require('./models/delivery.model');

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send({ message: 'Access denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'foodshare-secret');
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).send({ message: 'Invalid token' });
    }
};

// Routes

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        // Validate input
        const { name, email, password, type, location } = req.body;
        if (!name || !email || !password || !type || !location) {
            return res.status(400).send({ message: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            type,
            location
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, type: user.type }, 
            process.env.JWT_SECRET || 'foodshare-secret',
            { expiresIn: '1d' }
        );

        res.status(201).send({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, type } = req.body;
        const user = await User.findOne({ email, type });

        if (!user) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, type: user.type }, 
            process.env.JWT_SECRET || 'foodshare-secret',
            { expiresIn: '1d' }
        );

        res.send({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

// User Routes
app.get('/api/users/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.send(user);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

// Restaurant Routes
app.post('/api/restaurants/nearby', authenticate, async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10 } = req.body;

        const restaurants = await User.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [longitude, latitude] },
                    distanceField: 'distance',
                    maxDistance: maxDistance * 1000, // Convert km to meters
                    query: { type: 'restaurant' },
                    spherical: true
                }
            },
            {
                $project: {
                    password: 0,
                    __v: 0
                }
            }
        ]);

        res.send(restaurants);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

// Match Routes
app.post('/api/matches/request', authenticate, async (req, res) => {
    try {
        const { restaurantId } = req.body;
        
        // Check if user is a volunteer
        if (req.user.type !== 'volunteer') {
            return res.status(403).send({ message: 'Only volunteers can request matches' });
        }

        // Check if restaurant exists
        const restaurant = await User.findById(restaurantId);
        if (!restaurant || restaurant.type !== 'restaurant') {
            return res.status(404).send({ message: 'Restaurant not found' });
        }

        // Create match request
        const match = new Match({
            volunteer: req.user.id,
            restaurant: restaurantId,
            status: 'pending'
        });

        await match.save();

        res.status(201).send(match);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

app.get('/api/matches/requests', authenticate, async (req, res) => {
    try {
        // Check if user is a restaurant
        if (req.user.type !== 'restaurant') {
            return res.status(403).send({ message: 'Only restaurants can view requests' });
        }

        const requests = await Match.find({ restaurant: req.user.id, status: 'pending' })
            .populate('volunteer', 'name email location')
            .lean();

        // Calculate distance for each request
        const restaurant = await User.findById(req.user.id);
        const restaurantLocation = restaurant.location;

        const requestsWithDistance = requests.map(request => {
            const volunteerLocation = request.volunteer.location;
            const distance = calculateDistance(
                restaurantLocation[1],
                restaurantLocation[0],
                volunteerLocation[1],
                volunteerLocation[0]
            );
            return { ...request, distance };
        });

        res.send(requestsWithDistance);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

app.post('/api/matches/:id/accept', authenticate, async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        
        // Validate
        if (!match || match.restaurant.toString() !== req.user.id) {
            return res.status(404).send({ message: 'Match not found' });
        }

        if (match.status !== 'pending') {
            return res.status(400).send({ message: 'Match already processed' });
        }

        // Update match status
        match.status = 'accepted';
        await match.save();

        // Create delivery record
        const delivery = new Delivery({
            match: match._id,
            status: 'in_progress'
        });

        await delivery.save();

        res.send({ match, delivery });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

app.post('/api/matches/:id/decline', authenticate, async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        
        // Validate
        if (!match || match.restaurant.toString() !== req.user.id) {
            return res.status(404).send({ message: 'Match not found' });
        }

        if (match.status !== 'pending') {
            return res.status(400).send({ message: 'Match already processed' });
        }

        // Update match status
        match.status = 'declined';
        await match.save();

        res.send(match);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

// Delivery Routes
app.get('/api/deliveries/active', authenticate, async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ 
            status: 'in_progress',
            $or: [
                { 'match.volunteer': req.user.id },
                { 'match.restaurant': req.user.id }
            ]
        })
        .populate({
            path: 'match',
            populate: [
                { path: 'volunteer', select: 'name location' },
                { path: 'restaurant', select: 'name location address' }
            ]
        });

        if (!delivery) {
            return res.status(404).send({ message: 'No active delivery found' });
        }

        res.send(delivery);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

app.post('/api/deliveries/complete', authenticate, async (req, res) => {
    try {
        const delivery = await Delivery.findOneAndUpdate(
            { 
                status: 'in_progress',
                'match.volunteer': req.user.id 
            },
            { 
                status: 'completed',
                completedAt: new Date() 
            },
            { new: true }
        )
        .populate('match');

        if (!delivery) {
            return res.status(404).send({ message: 'No active delivery found' });
        }

        res.send(delivery);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

app.get('/api/deliveries/latest', authenticate, async (req, res) => {
    try {
        const delivery = await Delivery.findOne(
            { 
                status: 'completed',
                'match.volunteer': req.user.id 
            },
            {},
            { sort: { completedAt: -1 } }
        )
        .populate({
            path: 'match',
            populate: [
                { path: 'restaurant', select: 'name' }
            ]
        });

        if (!delivery) {
            return res.status(404).send({ message: 'No completed deliveries found' });
        }

        // Calculate duration in minutes
        const duration = Math.round((delivery.completedAt - delivery.createdAt) / (1000 * 60));

        res.send({
            foodType: 'Various meals', // Would come from restaurant in real implementation
            recipient: 'Local shelter', // Would come from destination in real implementation
            duration
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

// Helper function to calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});