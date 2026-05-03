const fs = require('fs');
const path = './CAB-Booking-System-12-Levels.postman_collection.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const addRequestsToLevel = (levelName, requests) => {
    const level = data.item.find(i => i.name === levelName);
    if (level) {
        level.item = requests.map(req => ({
            name: req.name,
            request: {
                method: req.method,
                url: `{{gateway_url}}${req.path}`,
                header: req.noAuth ? [] : [
                    { key: "Content-Type", value: "application/json" },
                    { key: "Authorization", value: req.invalidAuth ? "Bearer INVALID_TOKEN" : "Bearer {{token}}" }
                ],
                ...(req.body ? {
                    body: {
                        mode: "raw",
                        raw: JSON.stringify(req.body)
                    }
                } : {})
            }
        }));
    }
};

addRequestsToLevel("Level 5: AI Service Validation", [
    {
        name: "Recommendation trả top-3 drivers",
        method: "POST",
        path: "/api/matching/recommend",
        body: { "lat": 10.76, "lng": 106.66, "top": 3 }
    },
    {
        name: "ETA model output trong range hợp lý",
        method: "POST",
        path: "/api/eta/estimate",
        body: { "distance_km": 5, "traffic_level": 0.5 }
    },
    {
        name: "Pricing surge > 1 khi demand cao",
        method: "POST",
        path: "/api/pricing/estimate",
        body: { "distance_km": 5, "demand_index": 2 }
    }
]);

addRequestsToLevel("Level 6: AI Agent Logic", [
    {
        name: "Agent xử lý context thiếu dữ liệu",
        method: "POST",
        path: "/api/matching/recommend",
        body: { "lat": 10.76 } // missing lng
    },
    {
        name: "Agent chọn driver gần nhất",
        method: "POST",
        path: "/api/matching/recommend",
        body: { "lat": 10.76, "lng": 106.66, "radiusKm": 1 }
    }
]);

addRequestsToLevel("Level 7: Performance & Load", [
    {
        name: "P95 latency < 300ms",
        method: "GET",
        path: "/health"
    }
]);

addRequestsToLevel("Level 8: Failure & Resilience", [
    {
        name: "Input bất thường -> Không crash",
        method: "POST",
        path: "/api/eta/estimate",
        body: { "distance_km": 9999999, "traffic_level": 5.0 }
    }
]);

addRequestsToLevel("Level 9: Security Test", [
    {
        name: "Request không có token (401)",
        method: "GET",
        path: "/api/bookings/customer/123",
        noAuth: true
    },
    {
        name: "Token không hợp lệ (401)",
        method: "GET",
        path: "/api/bookings/customer/123",
        invalidAuth: true
    }
]);

addRequestsToLevel("Level 10: Zero Trust Security", [
    {
        name: "RBAC - User không có quyền (403)",
        method: "GET",
        path: "/api/drivers",
        // The user logs in as 'customer', so accessing /api/drivers requires 'driver' or 'admin'
    }
]);

addRequestsToLevel("Level 11: Deployment", [
    {
        name: "Health check endpoint (200)",
        method: "GET",
        path: "/health",
        noAuth: true
    }
]);

addRequestsToLevel("Level 12: Monitoring", [
    {
        name: "Metrics được expose (200)",
        method: "GET",
        path: "/metrics",
        noAuth: true
    },
    {
        name: "SLO Dashboard Data (200)",
        method: "GET",
        path: "/slo",
        noAuth: true
    }
]);

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Postman collection populated with Level 5-12!');
