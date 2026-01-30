const AuthService = require('../services/authService');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  // Initialize service
  async initialize() {
    await this.authService.initializeRabbitMQ();
  }

  // Register user
  register = async (req, res) => {
    try {
      const { email, phone, password, firstName, lastName, role = 'customer' } = req.body;

      // Validate required fields
      if (!email || !phone || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['email', 'phone', 'password', 'firstName', 'lastName']
        });
      }

      // Validate password strength
      try {
        this.authService.validatePassword(password);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // Get device info for Zero Trust
      const deviceInfo = {
        fingerprint: this.getDeviceFingerprint(req),
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent')
      };

      const result = await this.authService.register({
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role
      }, deviceInfo);

      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        verificationRequired: true,
        ...(result.verificationCode && { verificationCode: result.verificationCode })
      });

    } catch (error) {
      console.error('Registration controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Login user
  login = async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // Get device info for Zero Trust
      const deviceInfo = {
        fingerprint: this.getDeviceFingerprint(req),
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent')
      };

      const result = await this.authService.login({
        email: email.toLowerCase().trim(),
        password
      }, deviceInfo);

      res.json({
        message: 'Login successful',
        ...result
      });

    } catch (error) {
      console.error('Login controller error:', error);
      res.status(401).json({ error: error.message });
    }
  };

  // Refresh token
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token is required'
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });

    } catch (error) {
      console.error('Token refresh controller error:', error);
      res.status(401).json({ error: error.message });
    }
  };

  // Logout user
  logout = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const accessToken = req.headers.authorization?.replace('Bearer ', '');

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      await this.authService.logout(userId, accessToken);

      res.json({ message: 'Logged out successfully' });

    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  };

  // Verify email
  verifyEmail = async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          error: 'Email and verification code are required'
        });
      }

      const result = await this.authService.verifyEmail(email.toLowerCase().trim(), code);

      res.json(result);

    } catch (error) {
      console.error('Email verification controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Request password reset
  requestPasswordReset = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required'
        });
      }

      const result = await this.authService.requestPasswordReset(email.toLowerCase().trim());

      res.json(result);

    } catch (error) {
      console.error('Password reset request controller error:', error);
      res.status(500).json({ error: 'Failed to request password reset' });
    }
  };

  // Reset password
  resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Reset token and new password are required'
        });
      }

      // Validate password strength
      try {
        this.authService.validatePassword(newPassword);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      const result = await this.authService.resetPassword(token, newPassword);

      res.json(result);

    } catch (error) {
      console.error('Password reset controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Get user profile
  getProfile = async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.authService.getProfile(userId);

      res.json({ profile });

    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(404).json({ error: error.message });
    }
  };

  // Update user profile
  updateProfile = async (req, res) => {
    try {
      const userId = req.user?.userId;
      const updateData = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
      }

      const profile = await this.authService.updateProfile(userId, updateData);

      res.json({
        message: 'Profile updated successfully',
        profile
      });

    } catch (error) {
      console.error('Update profile controller error:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // Health check
  healthCheck = async (req, res) => {
    res.json({
      service: 'auth-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  // Get user statistics (admin only)
  getUserStats = async (req, res) => {
    try {
      // This would typically check if user is admin
      const stats = await this.authService.userRepository.getUserStats();

      res.json({
        message: 'User statistics retrieved successfully',
        stats
      });

    } catch (error) {
      console.error('Get user stats controller error:', error);
      res.status(500).json({ error: 'Failed to get user statistics' });
    }
  };

  // Validate token (for API Gateway)
  validateToken = async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Token is required',
          code: 'MISSING_TOKEN'
        });
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.authService.tokenUtils.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      }

      // Verify JWT token
      const decoded = this.authService.verifyToken(token);

      // Zero Trust: Additional device verification (optional for gateway validation)
      const currentFingerprint = this.getDeviceFingerprint(req);
      if (decoded.deviceFingerprint && decoded.deviceFingerprint !== currentFingerprint) {
        console.warn(`Zero Trust Alert: Token validation from different device for user ${decoded.userId}`);
        // Still allow validation but log suspicious activity
      }

      res.json({
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          deviceFingerprint: decoded.deviceFingerprint
        }
      });

    } catch (error) {
      console.error('Token validation error:', error);
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
  };

  // Helper: Get device fingerprint
  getDeviceFingerprint(req) {
    // Simple fingerprint based on user agent and IP
    // In production, use a proper device fingerprinting library
    const userAgent = req.get('User-Agent') || '';
    const ip = this.getClientIP(req);
    return require('crypto').createHash('sha256')
      .update(`${userAgent}:${ip}`)
      .digest('hex');
  }

  // Helper: Get client IP address
  getClientIP(req) {
    // Check for forwarded IP headers
    const forwarded = req.get('X-Forwarded-For');
    const realIP = req.get('X-Real-IP');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    return req.connection.remoteAddress || req.socket.remoteAddress || req.ip || 'unknown';
  }

  // Cleanup
  async cleanup() {
    await this.authService.cleanup();
  }
}

module.exports = AuthController;