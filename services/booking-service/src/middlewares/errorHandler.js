// Global Error Handler Middleware

const errorHandler = (err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Payload Too Large',
            timestamp: new Date()
        });
    }

    console.error('Error:', err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message,
        timestamp: new Date()
    });
};

module.exports = errorHandler;
