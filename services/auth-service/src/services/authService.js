const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserRepository = require('../repositories/userRepository');
const { tokenUtils } = require('../config/redis');
const { RabbitMQClient, EXCHANGES, EVENT_TYPES } = require('@cab-booking/shared');

require('dotenv').config();

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.rabbitMQClient = null;
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpire = process.env.JWT_EXPIRE || '15m'; // 15 minutes
    this.refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || '7d'; // 7 days
  }

  // Initialize RabbitMQ
  async initializeRabbitMQ() {
    try {
      this.rabbitMQClient = new RabbitMQClient();
      await this.rabbitMQClient.connect();
      console.log('✅ Auth Service: RabbitMQ connected');
    } catch (error) {
      console.error('❌ Auth Service: RabbitMQ connection failed:', error);
    }
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT tokens
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      // Zero Trust: Include device fingerprint and IP for additional verification
      deviceFingerprint: user.deviceFingerprint,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpire,
      issuer: 'cab-booking-auth-service',
      audience: 'cab-booking-system'
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'cab-booking-auth-service',
        audience: 'cab-booking-system'
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Register user
  async register(userData, deviceInfo = {}) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const existingPhone = await this.userRepository.findByPhone(userData.phone);
      if (existingPhone) {
        throw new Error('User with this phone number already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create user
      const newUser = await this.userRepository.create({
        ...userData,
        password: hashedPassword,
        deviceFingerprint: deviceInfo.fingerprint,
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent
      });

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      await tokenUtils.storeVerificationCode(newUser.email, verificationCode);

      // Publish user registered event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.registered',
          {
            type: 'UserRegistered',
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role
          }
        );
      }

      // Remove password from response
      const { password, ...userResponse } = newUser;

      return {
        user: userResponse,
        verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(credentials, deviceInfo = {}) {
    try {
      const { email, password } = credentials;

      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Check if account is locked
      if (await this.userRepository.isAccountLocked(user.id)) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        // Increment failed attempts
        await this.userRepository.incrementFailedAttempts(user.id);
        throw new Error('Invalid email or password');
      }

      // Check device fingerprint for Zero Trust
      if (user.deviceFingerprint && user.deviceFingerprint !== deviceInfo.fingerprint) {
        // Log suspicious login attempt
        console.warn(`Suspicious login attempt for user ${user.id} from different device`);
        // You could send notification or require additional verification here
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens({
        ...user,
        deviceFingerprint: deviceInfo.fingerprint
      });

      // Store refresh token
      await tokenUtils.storeRefreshToken(user.id, refreshToken);

      // Update user record
      await this.userRepository.updateRefreshToken(user.id, refreshToken);
      await this.userRepository.updateLastLogin(user.id);

      // Update device info
      await this.userRepository.update(user.id, {
        deviceFingerprint: deviceInfo.fingerprint,
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent
      });

      // Publish user logged in event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.logged_in',
          {
            type: 'UserLoggedIn',
            userId: user.id,
            email: user.email,
            role: user.role,
            ipAddress: deviceInfo.ip,
            userAgent: deviceInfo.userAgent
          }
        );
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: this.jwtExpire
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token exists in Redis
      const storedToken = await tokenUtils.getRefreshTokenFromRedis(refreshToken);
      if (!storedToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user from database
      const user = await this.userRepository.findById(storedToken.userId);
      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, newRefreshToken } = this.generateTokens(user);

      // Update refresh token
      await tokenUtils.storeRefreshToken(user.id, newRefreshToken);
      await this.userRepository.updateRefreshToken(user.id, newRefreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.jwtExpire
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(userId, accessToken) {
    try {
      // Blacklist access token
      await tokenUtils.blacklistToken(accessToken);

      // Clear refresh token
      await tokenUtils.deleteRefreshToken(userId);
      await this.userRepository.clearRefreshToken(userId);

      // Publish user logged out event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.logged_out',
          {
            type: 'UserLoggedOut',
            userId,
            timestamp: new Date().toISOString()
          }
        );
      }

      return { message: 'Logged out successfully' };

    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Verify email with code
  async verifyEmail(email, code) {
    try {
      // Get stored verification code
      const storedCode = await tokenUtils.getVerificationCode(email);
      if (!storedCode || storedCode !== code) {
        throw new Error('Invalid or expired verification code');
      }

      // Find user and verify email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      await this.userRepository.verifyEmail(user.id);
      await tokenUtils.deleteVerificationCode(email);

      // Publish email verified event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.email_verified',
          {
            type: 'UserEmailVerified',
            userId: user.id,
            email: user.email
          }
        );
      }

      return { message: 'Email verified successfully' };

    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(email) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not (security)
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      await this.userRepository.setPasswordResetToken(user.id, resetToken);

      // In production, send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`);

      return { message: 'If the email exists, a reset link has been sent' };

    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const user = await this.userRepository.findByPasswordResetToken(token);
      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password and clear reset token
      await this.userRepository.update(user.id, { password: hashedPassword });
      await this.userRepository.clearPasswordResetToken(user.id);

      // Publish password changed event
      if (this.rabbitMQClient) {
        await this.rabbitMQClient.publishEvent(
          EXCHANGES.BOOKING_EVENTS,
          'user.password_changed',
          {
            type: 'UserPasswordChanged',
            userId: user.id,
            email: user.email
          }
        );
      }

      return { message: 'Password reset successfully' };

    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { password, refreshToken, passwordResetToken, ...profile } = user;
      return profile;

    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent updating sensitive fields
      const { password, role, isVerified, ...allowedUpdates } = updateData;

      const updatedUser = await this.userRepository.update(userId, allowedUpdates);
      const { password: _, refreshToken, ...profile } = updatedUser;

      return profile;

    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Generate verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  }

  // Validate password strength
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }
  }

  // Cleanup method
  async cleanup() {
    if (this.rabbitMQClient) {
      await this.rabbitMQClient.disconnect();
    }
  }
}

module.exports = AuthService;