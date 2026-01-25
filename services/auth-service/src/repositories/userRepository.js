const { sequelize } = require('../config/database');

class UserRepository {
    constructor() {
        this.User = sequelize.models.User;
    }

    // Create user
    async create(userData) {
        try {
            const user = await this.User.create(userData);
            return user.toJSON();
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Find user by ID
    async findById(id) {
        try {
            const user = await this.User.findByPk(id);
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    // Find user by email
    async findByEmail(email) {
        try {
            const user = await this.User.findOne({ where: { email } });
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    // Find user by phone
    async findByPhone(phone) {
        try {
            const user = await this.User.findOne({ where: { phone } });
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error finding user by phone:', error);
            throw error;
        }
    }

    // Update user
    async update(id, updateData) {
        try {
            const [affectedRows] = await this.User.update(updateData, {
                where: { id },
                returning: true
            });
            if (affectedRows === 0) {
                return null;
            }
            return await this.findById(id);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Update last login
    async updateLastLogin(id) {
        try {
            await this.User.update({
                lastLoginAt: new Date(),
                failedLoginAttempts: 0, // Reset failed attempts on successful login
                lockedUntil: null // Unlock account
            }, { where: { id } });
        } catch (error) {
            console.error('Error updating last login:', error);
            throw error;
        }
    }

    // Increment failed login attempts
    async incrementFailedAttempts(id, maxAttempts = 5, lockDuration = 15 * 60 * 1000) { // 15 minutes
        try {
            const user = await this.User.findByPk(id);
            if (!user) return null;

            const newAttempts = user.failedLoginAttempts + 1;
            const updateData = { failedLoginAttempts: newAttempts };

            if (newAttempts >= maxAttempts) {
                updateData.lockedUntil = new Date(Date.now() + lockDuration);
            }

            return await this.update(id, updateData);
        } catch (error) {
            console.error('Error incrementing failed attempts:', error);
            throw error;
        }
    }

    // Reset failed login attempts
    async resetFailedAttempts(id) {
        try {
            await this.User.update({ failedLoginAttempts: 0, lockedUntil: null }, { where: { id } });
        } catch (error) {
            console.error('Error resetting failed attempts:', error);
            throw error;
        }
    }

    // Check if account is locked
    async isAccountLocked(id) {
        try {
            const user = await this.User.findByPk(id);
            if (!user) return false;

            if (user.lockedUntil && user.lockedUntil > new Date()) {
                return true;
            }

            // Reset if lock duration has expired
            if (user.lockedUntil && user.lockedUntil <= new Date()) {
                await this.resetFailedAttempts(id);
                return false;
            }

            return false;
        } catch (error) {
            console.error('Error checking account lock:', error);
            throw error;
        }
    }

    // Store password reset token
    async setPasswordResetToken(id, token, expiresIn = 1 * 60 * 60 * 1000) { // 1 hour
        try {
            await this.User.update({
                passwordResetToken: token,
                passwordResetExpires: new Date(Date.now() + expiresIn)
            }, { where: { id } });
        } catch (error) {
            console.error('Error setting password reset token:', error);
            throw error;
        }
    }

    // Find user by password reset token
    async findByPasswordResetToken(token) {
        try {
            const user = await this.User.findOne({
                where: {
                    passwordResetToken: token,
                    passwordResetExpires: {
                        [sequelize.Op.gt]: new Date()
                    }
                }
            });
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error finding user by reset token:', error);
            throw error;
        }
    }

    // Clear password reset token
    async clearPasswordResetToken(id) {
        try {
            await this.User.update({
                passwordResetToken: null,
                passwordResetExpires: null
            }, { where: { id } });
        } catch (error) {
            console.error('Error clearing password reset token:', error);
            throw error;
        }
    }

    // Find user by refresh token
    async findByRefreshToken(refreshToken) {
        try {
            const user = await this.User.findOne({ where: { refreshToken } });
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error finding user by refresh token:', error);
            throw error;
        }
    }

    // Update refresh token
    async updateRefreshToken(id, refreshToken) {
        try {
            await this.User.update({ refreshToken }, { where: { id } });
        } catch (error) {
            console.error('Error updating refresh token:', error);
            throw error;
        }
    }

    // Clear refresh token (logout)
    async clearRefreshToken(id) {
        try {
            await this.User.update({ refreshToken: null }, { where: { id } });
        } catch (error) {
            console.error('Error clearing refresh token:', error);
            throw error;
        }
    }

    // Verify email
    async verifyEmail(id) {
        try {
            await this.User.update({ isVerified: true }, { where: { id } });
        } catch (error) {
            console.error('Error verifying email:', error);
            throw error;
        }
    }

    // Deactivate account
    async deactivateAccount(id) {
        try {
            await this.User.update({ isActive: false }, { where: { id } });
        } catch (error) {
            console.error('Error deactivating account:', error);
            throw error;
        }
    }

    // Get user statistics
    async getUserStats() {
        try {
            const [totalUsers, activeUsers, verifiedUsers] = await Promise.all([
                this.User.count(),
                this.User.count({ where: { isActive: true } }),
                this.User.count({ where: { isVerified: true } })
            ]);

            return {
                total: totalUsers,
                active: activeUsers,
                verified: verifiedUsers,
                unverified: totalUsers - verifiedUsers
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }
}

module.exports = UserRepository;