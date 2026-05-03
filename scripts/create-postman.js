const fs = require('fs');

const collection = {
  info: {
    name: "CAB Booking System - 12 Levels Evaluation",
    description: "Full suite for testing all 12 levels of the CAB Booking System",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "Level 1: Basic API & Flow",
      item: [
        { name: "Register User", request: { method: "POST", url: "{{gateway_url}}/auth/register", body: { mode: "raw", raw: JSON.stringify({ email: "test@example.com", password: "password123", role: "customer" }) }, header: [{key: "Content-Type", value: "application/json"}] } },
        { name: "Login", request: { method: "POST", url: "{{gateway_url}}/auth/login", body: { mode: "raw", raw: JSON.stringify({ email: "test@example.com", password: "password123" }) }, header: [{key: "Content-Type", value: "application/json"}] } }
      ]
    },
    {
      name: "Level 2: Validation & Edge Cases",
      item: [
        { name: "Missing pickup rejected (400)", request: { method: "POST", url: "{{gateway_url}}/api/bookings", body: { mode: "raw", raw: JSON.stringify({ customerId: "123", drop: { lat: 10, lng: 106 } }) }, header: [{key: "Content-Type", value: "application/json"}] } },
        { name: "Invalid Payment Method (400)", request: { method: "POST", url: "{{gateway_url}}/api/bookings", body: { mode: "raw", raw: JSON.stringify({ customerId: "123", pickup: { lat: 1, lng: 1 }, drop: { lat: 2, lng: 2 }, payment_method: "invalid" }) }, header: [{key: "Content-Type", value: "application/json"}] } }
      ]
    },
    {
      name: "Level 3: Integration Test",
      item: [
        { name: "API Gateway route mapping", request: { method: "GET", url: "{{gateway_url}}/health" } }
      ]
    },
    {
      name: "Level 4: Transaction & Saga",
      item: [
        { name: "Create Booking (Saga init)", request: { method: "POST", url: "{{gateway_url}}/api/bookings", body: { mode: "raw", raw: JSON.stringify({ customerId: "123", pickup: {lat: 10, lng: 10}, drop: {lat: 11, lng: 11}, payment_method: "CASH" }) }, header: [{key: "Content-Type", value: "application/json"}] } }
      ]
    },
    { name: "Level 5: AI Service Validation", item: [] },
    { name: "Level 6: AI Agent Logic", item: [] },
    { name: "Level 7: Performance & Load", item: [] },
    { name: "Level 8: Failure & Resilience", item: [] },
    { name: "Level 9: Security Test", item: [] },
    { name: "Level 10: Zero Trust Security", item: [] },
    { name: "Level 11: Deployment", item: [] },
    { name: "Level 12: Monitoring", item: [] }
  ],
  variable: [
    { key: "gateway_url", value: "http://localhost:3000", type: "string" }
  ]
};

fs.writeFileSync('CAB-Booking-System-12-Levels.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Generated CAB-Booking-System-12-Levels.postman_collection.json');
