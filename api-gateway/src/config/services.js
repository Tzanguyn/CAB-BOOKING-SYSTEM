module.exports = {
  auth: {
    target: 'http://auth-service:3001',
    path: '/auth'
  },
  users: {
    target: 'http://user-service:3002',
    path: '/users'
  },
  drivers: {
    target: 'http://driver-service:3003',
    path: '/drivers'
  },
  bookings: {
    target: 'http://booking-service:3004',
    path: '/bookings'
  },
  rides: {
    target: 'http://ride-service:3005',
    path: '/rides'
  },
  pricing: {
    target: 'http://pricing-service:3006',
    path: '/pricing'
  },
  payments: {
    target: 'http://payment-service:3007',
    path: '/payments'
  },
  reviews: {
    target: 'http://review-service:3008',
    path: '/reviews'
  },
  notifications: {
    target: 'http://notification-service:3009',
    path: '/notifications'
  }
}
