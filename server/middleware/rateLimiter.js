import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Middleware Configuration
 * 
 * Protects the API from abuse by limiting the number of requests
 * from a single IP address within a time window.
 */

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/auth routes
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        console.log(`[Rate Limit] Auth endpoint blocked for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many authentication attempts. Please try again later.',
            retryAfter: '15 minutes'
        });
    },
});

/**
 * Moderate rate limiter for contact operations
 * Prevents spam when adding contacts
 */
export const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many contact operations. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log(`[Rate Limit] Contact operation blocked for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many contact operations. Please try again later.',
            retryAfter: '15 minutes'
        });
    },
});

/**
 * General rate limiter for all API endpoints
 * Allows normal usage while preventing excessive requests
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log(`[Rate Limit] General API blocked for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests. Please try again later.',
            retryAfter: '15 minutes'
        });
    },
    // Skip rate limiting for health check endpoint
    skip: (req) => req.path === '/health',
});
