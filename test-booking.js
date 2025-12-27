```javascript
const axios = require('axios');

async function main() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/local/login', {
            email: 'admin@sera.com',
            password: 'P@$$w0rd',
        });

        const token = loginRes.data.access_token;
        const userId = loginRes.data.user.id;
        console.log('Logged in. Token received.');

        // 2. Book Meeting
        console.log('Attempting to book meeting...');

        // Test Time: Saturday 15:00 Local (+03:00) => 12:00 UTC
        // Working Hours: 09:00 - 17:00

        const startTime = '2025-12-27T15:00:00+03:00';
        const endTime = '2025-12-27T15:30:00+03:00';

        const bookingRes = await axios.post(
            'http://localhost:3001/api/meetings',
            {
                vpId: userId, // Book with self
                startTime,
                endTime,
                title: 'Debug Meeting',
                type: 'VIRTUAL',
                attendeeEmail: 'test-attendee@example.com'
            },
            {
                headers: { Authorization: `Bearer ${ token } ` }
            }
        );

        console.log('Booking Successful:', bookingRes.data);

    } catch (error) {
        if (error.response) {
            console.error('Booking Failed:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

main();
