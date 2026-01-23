module.exports = {
  auth: {
    target: 'http://auth-service:3004',
    path: '/auth'
  },
  users: {
    target: 'http://user-service:3005',
    path: '/users'
  },
  drivers: {
    target: 'http://driver-service:3007',
    path: '/drivers'
  },
  bookings: {
    target: 'http://booking-service:3003',
    path: '/bookings'
  },
  rides: {
    target: 'http://ride-service:3009',
    path: '/rides'
  },
  pricing: {
    target: 'http://pricing-service:3001',
    path: '/pricing'
  },
  payments: {
    target: 'http://payment-service:3002',
    path: '/payments'
  },
  reviews: {
    target: 'http://review-service:3006',
    path: '/reviews'
  },
  notifications: {
    target: 'http://notification-service:3008',
    path: '/notifications'
  }
}
