const ROLE_SCOPES = Object.freeze({
  customer: Object.freeze([
    'users:read',
    'users:write',
    'bookings:read',
    'bookings:write',
    'rides:read',
    'rides:write',
    'payments:read',
    'payments:write',
    'pricing:read',
    'matching:read',
    'eta:read',
    'notifications:read',
    'notifications:write',
    'reviews:read',
    'reviews:write'
  ]),
  driver: Object.freeze([
    'users:read',
    'bookings:read',
    'bookings:write',
    'drivers:read',
    'drivers:write',
    'rides:read',
    'rides:write',
    'payments:read',
    'pricing:read',
    'matching:read',
    'eta:read',
    'notifications:read',
    'notifications:write',
    'reviews:read',
    'reviews:write'
  ]),
  admin: Object.freeze([
    'admin:*',
    'users:read',
    'users:write',
    'bookings:read',
    'bookings:write',
    'drivers:read',
    'drivers:write',
    'rides:read',
    'rides:write',
    'payments:read',
    'payments:write',
    'pricing:read',
    'pricing:write',
    'matching:read',
    'matching:write',
    'eta:read',
    'eta:write',
    'notifications:read',
    'notifications:write',
    'reviews:read',
    'reviews:write'
  ])
})

function getScopesForRole(role) {
  const normalizedRole = String(role || '').toLowerCase()
  const roleScopes = ROLE_SCOPES[normalizedRole]
  if (!Array.isArray(roleScopes)) {
    return []
  }

  return [...roleScopes]
}

module.exports = {
  ROLE_SCOPES,
  getScopesForRole
}
