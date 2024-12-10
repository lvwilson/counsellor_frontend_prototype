const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = 3000;

// API Configuration
const API_CONFIG = {
    hostname: 'localhost',
    port: 5000,  // Confirm this is the correct port for the counsellor API
    protocol: 'http'
};

// Add morgan for request logging
app.use(morgan('dev'));

// Add CORS support
app.use(cors());

// Body parsing middleware
app.use(express.static('public'));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// API proxy middleware
const apiProxy = (targetPath) => async (req, res) => {
    const requestBody = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
    
    const options = {
        hostname: API_CONFIG.hostname,
        port: API_CONFIG.port,
        path: targetPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''),
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
            'Accept': 'application/json'
        },
    };

    try {
        console.log(`[${new Date().toISOString()}] Proxying request to: ${API_CONFIG.protocol}://${API_CONFIG.hostname}:${API_CONFIG.port}${targetPath}`);
        console.log('Request options:', JSON.stringify(options, null, 2));
        
        const proxyReq = http.request(options, (proxyRes) => {
            let data = '';
            
            proxyRes.on('data', (chunk) => {
                data += chunk;
            });
            
            proxyRes.on('end', () => {
                try {
                    console.log(`[${new Date().toISOString()}] API Response Status:`, proxyRes.statusCode);
                    console.log(`[${new Date().toISOString()}] API Response Headers:`, proxyRes.headers);
                    console.log(`[${new Date().toISOString()}] API Response Body:`, data);

                    // Check if response is JSON
                    if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('application/json')) {
                        res.status(proxyRes.statusCode).json(JSON.parse(data));
                    } else {
                        // Handle non-JSON response
                        console.error('Received non-JSON response from API');
                        res.status(502).json({
                            error: 'Bad Gateway',
                            message: 'Received invalid response from API server',
                            details: data.substring(0, 200) // Include first 200 chars of response for debugging
                        });
                    }
                } catch (error) {
                    console.error('Error handling API response:', error);
                    res.status(502).json({
                        error: 'Bad Gateway',
                        message: 'Failed to process API response',
                        details: error.message
                    });
                }
            });
        });

        proxyReq.on('error', (error) => {
            console.error('Proxy request error:', error);
            res.status(503).json({
                error: 'Service Unavailable',
                message: 'Failed to reach API server',
                details: error.message
            });
        });

        // Write request body if it exists
        if (requestBody) {
            console.log('Sending request body:', requestBody);
            proxyReq.write(requestBody);
        }
        
        proxyReq.end();

    } catch (error) {
        console.error('Proxy middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process request',
            details: error.message
        });
    }
};

// API routes
app.post('/create_conversation', apiProxy('/create_conversation'));
app.post('/send_message', apiProxy('/send_message'));
app.post('/generate_message', apiProxy('/generate_message'));
app.get('/get_messages', apiProxy('/get_messages'));
app.post('/generate_report', apiProxy('/generate_report'));
app.post('/delete_conversation', apiProxy('/delete_conversation'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Application error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Create HTTP server
const server = http.createServer(app);

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Attempt to close server gracefully
    server.close(() => {
        console.log('Server closed due to uncaught exception');
        process.exit(1);
    });
    // If server hasn't closed in 5 seconds, force exit
    setTimeout(() => {
        console.error('Forced server shutdown');
        process.exit(1);
    }, 5000);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    // Attempt to close server gracefully
    server.close(() => {
        console.log('Server closed due to unhandled rejection');
        process.exit(1);
    });
    // If server hasn't closed in 5 seconds, force exit
    setTimeout(() => {
        console.error('Forced server shutdown');
        process.exit(1);
    }, 5000);
});

// Start server
server.listen(port, () => {
    console.log(`Frontend server running at http://localhost:${port}`);
    console.log(`Proxying requests to ${API_CONFIG.protocol}://${API_CONFIG.hostname}:${API_CONFIG.port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});
