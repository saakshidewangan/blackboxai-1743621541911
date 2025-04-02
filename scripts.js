// Global variables
let currentUser = null;
let authToken = null;

// Initialize Authentication Page
function initAuthPage() {
    // Tab switching functionality
    const restaurantTab = document.getElementById('restaurant-tab');
    const volunteerTab = document.getElementById('volunteer-tab');
    const restaurantForm = document.getElementById('restaurant-form');
    const volunteerForm = document.getElementById('volunteer-form');
    const restaurantLogin = document.getElementById('restaurant-login');
    const volunteerLogin = document.getElementById('volunteer-login');

    // Show restaurant form by default
    restaurantTab.classList.add('tab-active');
    restaurantForm.classList.remove('hidden');
    volunteerForm.classList.add('hidden');

    // Tab click handlers
    restaurantTab.addEventListener('click', function(e) {
        e.preventDefault();
        restaurantTab.classList.add('tab-active');
        volunteerTab.classList.remove('tab-active');
        restaurantForm.classList.remove('hidden');
        volunteerForm.classList.add('hidden');
        if (!restaurantLogin.classList.contains('hidden')) {
            restaurantLogin.classList.add('hidden');
            document.getElementById('restaurant-signup').classList.remove('hidden');
        }
    });

    volunteerTab.addEventListener('click', function(e) {
        e.preventDefault();
        volunteerTab.classList.add('tab-active');
        restaurantTab.classList.remove('tab-active');
        volunteerForm.classList.remove('hidden');
        restaurantForm.classList.add('hidden');
        if (!volunteerLogin.classList.contains('hidden')) {
            volunteerLogin.classList.add('hidden');
            document.getElementById('volunteer-signup').classList.remove('hidden');
        }
    });

    // Toggle between signup and login forms
    document.getElementById('r-show-login').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('restaurant-signup').classList.add('hidden');
        restaurantLogin.classList.remove('hidden');
    });

    document.getElementById('r-show-signup').addEventListener('click', function(e) {
        e.preventDefault();
        restaurantLogin.classList.add('hidden');
        document.getElementById('restaurant-signup').classList.remove('hidden');
    });

    document.getElementById('v-show-login').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('volunteer-signup').classList.add('hidden');
        volunteerLogin.classList.remove('hidden');
    });

    document.getElementById('v-show-signup').addEventListener('click', function(e) {
        e.preventDefault();
        volunteerLogin.classList.add('hidden');
        document.getElementById('volunteer-signup').classList.remove('hidden');
    });

    // Geolocation functionality
    document.getElementById('r-locate-me').addEventListener('click', getCurrentLocation.bind(null, 'r'));
    document.getElementById('v-locate-me').addEventListener('click', getCurrentLocation.bind(null, 'v'));

    // Form submission handlers
    document.getElementById('restaurant-signup').addEventListener('submit', handleRestaurantSignup);
    document.getElementById('restaurant-login-form').addEventListener('submit', handleRestaurantLogin);
    document.getElementById('volunteer-signup').addEventListener('submit', handleVolunteerSignup);
    document.getElementById('volunteer-login-form').addEventListener('submit', handleVolunteerLogin);
}

// Get current location using Geolocation API
function getCurrentLocation(prefix) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById(`${prefix}-latitude`).value = lat.toFixed(6);
                document.getElementById(`${prefix}-longitude`).value = lng.toFixed(6);
                
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById(`${prefix}-location`).value = data.display_name || 'Location found';
                    })
                    .catch(error => {
                        console.error('Geocoding error:', error);
                        document.getElementById(`${prefix}-location`).value = 'Location found';
                    });
            },
            function(error) {
                console.error('Geolocation error:', error);
                alert('Unable to retrieve your location. Please enter it manually.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser. Please enter your location manually.');
    }
}

// Handle Restaurant Signup
async function handleRestaurantSignup(e) {
    e.preventDefault();
    
    const restaurant = {
        name: document.getElementById('r-name').value,
        email: document.getElementById('r-email').value,
        password: document.getElementById('r-password').value,
        type: 'restaurant',
        location: [
            parseFloat(document.getElementById('r-longitude').value),
            parseFloat(document.getElementById('r-latitude').value)
        ]
    };

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(restaurant)
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            window.location.href = 'restaurant-dashboard.html';
        } else {
            alert(data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during signup');
    }
}

// Handle Restaurant Login
async function handleRestaurantLogin(e) {
    e.preventDefault();
    
    const credentials = {
        email: document.getElementById('r-login-email').value,
        password: document.getElementById('r-login-password').value
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...credentials, type: 'restaurant' })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            window.location.href = 'restaurant-dashboard.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
}

// Handle Volunteer Signup
async function handleVolunteerSignup(e) {
    e.preventDefault();
    
    const volunteer = {
        name: document.getElementById('v-name').value,
        email: document.getElementById('v-email').value,
        password: document.getElementById('v-password').value,
        type: 'volunteer',
        location: [
            parseFloat(document.getElementById('v-longitude').value),
            parseFloat(document.getElementById('v-latitude').value)
        ]
    };

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(volunteer)
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            window.location.href = 'volunteer-dashboard.html';
        } else {
            alert(data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during signup');
    }
}

// Handle Volunteer Login
async function handleVolunteerLogin(e) {
    e.preventDefault();
    
    const credentials = {
        email: document.getElementById('v-login-email').value,
        password: document.getElementById('v-login-password').value
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...credentials, type: 'volunteer' })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            window.location.href = 'volunteer-dashboard.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
}

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'auth.html';
        return false;
    }
    return true;
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('restaurant-tab')) {
        initAuthPage();
    }
});