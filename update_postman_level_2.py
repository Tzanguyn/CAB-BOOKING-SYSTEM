import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 2: Validation & Edge Cases — 10 test cases
#
# Dua theo source code thuc te:
#   Gateway validateBookingCreate:
#     - Thieu customerId       -> 400 "customerId is required"
#     - Thieu pickup/dropoff   -> 400 "pickup and dropoff are required"
#     - Sai lat/lng            -> 422 "pickup/dropoff coordinates must be valid numbers"
#     - Payment invalid        -> 400 "Invalid payment method" (chi CASH/CARD/WALLET)
#   ETA service:
#     - distance_km=0 -> eta=0, fallback=false
#   Pricing service:
#     - demand_index=0, surge = max(1, 0/supply) = 1, price > 0
#   Fraud service (port 3012, POST /api/fraud/detect):
#     - Thieu required fields -> 400 "missing required fields"
#   Auth:
#     - Token expired/invalid -> 401
#   Booking idempotency:
#     - Header 'Idempotency-Key' or body idempotency_key
#     - Replay -> 200 { data._idempotentReplay: true }
#   Gateway express.json() default limit = 100kb
# ============================================================

level_2_items = [
    # ─── Test 1: Booking thieu pickup -> 400 ───
    {
        'name': '1. Booking thieu pickup -> loi 400',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "dropoffLocation": {"lat": 10.77, "lng": 106.70},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 400 Bad Request", function () {',
                        '    pm.response.to.have.status(400);',
                        '});',
                        'pm.test("Message cho biet pickup/dropoff required", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("pickup");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 2: Sai format lat/lng -> 422 ───
    {
        'name': '2. Sai format lat/lng -> reject 422',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": "abc", "lng": 106.66},\n  "dropoffLocation": {"lat": 10.77, "lng": 106.70},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 422 Unprocessable Entity", function () {',
                        '    pm.response.to.have.status(422);',
                        '});',
                        'pm.test("Message validation error coordinates", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("coordinates");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 3: Driver offline khong nhan booking ───
    {
        'name': '3. Driver offline -> khong assign driver',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 99.99, "lng": 99.99},\n  "dropoffLocation": {"lat": 99.98, "lng": 99.98},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201 (booking van duoc tao)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("No drivers available hoac status PENDING/SEARCHING", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    var noDriver = booking.noDriversAvailable === true',
                        '        || (jsonData.message || "").toLowerCase().includes("no driver")',
                        '        || ["PENDING", "SEARCHING", "REQUESTED"].includes(booking.status);',
                        '    pm.expect(noDriver).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 4: Payment method invalid -> 400 ───
    {
        'name': '4. Payment method invalid -> reject 400',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.76, "lng": 106.66},\n  "dropoffLocation": {"lat": 10.77, "lng": 106.70},\n  "paymentMethod": "BITCOIN"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 400 Bad Request", function () {',
                        '    pm.response.to.have.status(400);',
                        '});',
                        'pm.test("Message: Invalid payment method", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("invalid payment method");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 5: ETA voi distance = 0 ───
    {
        'name': '5. ETA voi distance_km = 0 -> khong crash',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/eta/estimate',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "distance_km": 0,\n  "traffic_level": 0.5\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - khong crash", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("ETA = 0 hoac rat nho, khong am", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var eta = jsonData.eta !== undefined ? jsonData.eta : jsonData.eta_minutes;',
                        '    pm.expect(eta).to.be.at.least(0);',
                        '    pm.expect(eta).to.be.at.most(1);',
                        '});',
                        'pm.test("Response co model_version", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.model_version).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 6: Pricing voi demand_index = 0 ───
    {
        'name': '6. Pricing voi demand_index = 0 -> surge >= 1',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/pricing/estimate',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "distance_km": 5,\n  "demand_index": 0,\n  "supply_index": 1\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Surge >= 1 (KHONG BAO GIO < 1)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.surge).to.be.at.least(1);',
                        '});',
                        'pm.test("Price > 0 (gia KHONG BAO GIO = 0)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var price = jsonData.price || jsonData.estimatedFare;',
                        '    pm.expect(price).to.be.above(0);',
                        '});',
                        'pm.test("Khong chia cho 0", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(isFinite(jsonData.surge)).to.be.true;',
                        '    var price = jsonData.price || jsonData.estimatedFare;',
                        '    pm.expect(isFinite(price)).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 7: Fraud API thieu fields -> 400 ───
    # Note: Fraud service chay port 3012, chua route qua gateway.
    # Dung bien {{fraud_service_url}} de test truc tiep.
    {
        'name': '7. Fraud API thieu field -> 400',
        'request': {
            'method': 'POST',
            'url': '{{fraud_service_url}}/api/fraud/detect',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "user_id": "USR123"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 400 Bad Request", function () {',
                        '    pm.response.to.have.status(400);',
                        '});',
                        'pm.test("Message: missing required fields", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.false;',
                        '    pm.expect(jsonData.message).to.eql("missing required fields");',
                        '});',
                        'pm.test("Tra ve danh sach missingFields", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.missingFields).to.be.an("array");',
                        '    pm.expect(jsonData.missingFields.length).to.be.above(0);',
                        '    // Can: driver_id, booking_id, amount, location, device_fingerprint',
                        '    pm.expect(jsonData.missingFields).to.include("driver_id");',
                        '    pm.expect(jsonData.missingFields).to.include("amount");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 8: Token expired -> 401 ───
    {
        'name': '8. Token expired -> 401 Unauthorized',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/123',
            'auth': {
                'type': 'noauth'
            },
            'header': [
                {'key': 'Authorization', 'value': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoiMTIzIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwicm9sZSI6ImN1c3RvbWVyIiwiZXhwIjoxNjAwMDAwMDAwLCJpYXQiOjE2MDAwMDAwMDB9.invalid_signature'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 401 Unauthorized", function () {',
                        '    pm.response.to.have.status(401);',
                        '});',
                        'pm.test("Error message ve token", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(',
                        '        msg.includes("token") || msg.includes("unauthorized") || msg.includes("expired") || msg.includes("invalid")',
                        '    ).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 9: Duplicate booking (idempotency) ───
    {
        'name': '9. Duplicate booking request (idempotency)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Gui request booking lan 1 voi Idempotency-Key',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var token = pm.collectionVariables.get("token");',
                        'var userId = pm.collectionVariables.get("userId");',
                        'var idempotencyKey = "IDEM-LEVEL2-TEST-" + Date.now();',
                        'pm.collectionVariables.set("idempotencyKey", idempotencyKey);',
                        '',
                        'pm.sendRequest({',
                        '    url: gateway + "/api/bookings",',
                        '    method: "POST",',
                        '    header: {',
                        '        "Content-Type": "application/json",',
                        '        "Authorization": "Bearer " + token,',
                        '        "Idempotency-Key": idempotencyKey',
                        '    },',
                        '    body: {',
                        '        mode: "raw",',
                        '        raw: JSON.stringify({',
                        '            customerId: userId,',
                        '            pickupLocation: { lat: 10.762, lng: 106.660 },',
                        '            dropoffLocation: { lat: 10.775, lng: 106.700 },',
                        '            paymentMethod: "CASH",',
                        '            idempotency_key: idempotencyKey',
                        '        })',
                        '    }',
                        '}, function (err, res) {',
                        '    if (err) {',
                        '        console.log("Pre-request booking error:", err);',
                        '    } else {',
                        '        console.log("Pre-request booking status:", res.code);',
                        '        var body = res.json();',
                        '        if (body.data && (body.data.id || body.data._id)) {',
                        '            pm.collectionVariables.set("idemBookingId", body.data.id || body.data._id);',
                        '        }',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 (replay, khong tao duplicate)", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Response la idempotent replay hoac booking cu", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '    // Server co the tra message "Idempotent replay" hoac data._idempotentReplay',
                        '    var isReplay = (jsonData.data && jsonData.data._idempotentReplay === true)',
                        '        || (jsonData.message && jsonData.message.toLowerCase().includes("idempotent"));',
                        '    pm.expect(isReplay).to.be.true;',
                        '});',
                        'pm.test("Khong tao booking moi (cung ID)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var originalId = pm.collectionVariables.get("idemBookingId");',
                        '    if (originalId && jsonData.data) {',
                        '        pm.expect(String(jsonData.data.id || jsonData.data._id)).to.eql(String(originalId));',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'Idempotency-Key', 'value': '{{idempotencyKey}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "idempotency_key": "{{idempotencyKey}}"\n}'
            }
        }
    },

    # ─── Test 10: Input qua lon (payload > limit) ───
    {
        'name': '10. Input qua lon (payload size test)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Tao payload lon hon 100KB (gateway express.json() default limit)',
                        'var bigString = "";',
                        'for (var i = 0; i < 150000; i++) {',
                        '    bigString += "A";',
                        '}',
                        'pm.variables.set("bigPayload", bigString);'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 413 Payload Too Large hoac 400", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([413, 400]);',
                        '});',
                        'pm.test("Request bi reject - khong xu ly logic", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(',
                        '        msg.includes("large") || msg.includes("limit") || msg.includes("too large") || msg.includes("entity")',
                        '        || pm.response.code === 413',
                        '    ).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.76, "lng": 106.66},\n  "dropoffLocation": {"lat": 10.77, "lng": 106.70},\n  "paymentMethod": "CASH",\n  "notes": "{{bigPayload}}"\n}'
            }
        }
    }
]

# Cap nhat Level 2 trong collection
for item in collection['item']:
    if 'name' in item and item['name'].startswith('Level 2'):
        item['item'] = level_2_items
        break

# Them bien fraud_service_url neu chua co
existing_vars = {v['key'] for v in collection.get('variable', [])}
if 'fraud_service_url' not in existing_vars:
    collection.setdefault('variable', []).append({
        'key': 'fraud_service_url',
        'value': 'http://localhost:3012',
        'type': 'string'
    })
if 'idempotencyKey' not in existing_vars:
    collection.setdefault('variable', []).append({
        'key': 'idempotencyKey',
        'value': '',
        'type': 'string'
    })
if 'idemBookingId' not in existing_vars:
    collection.setdefault('variable', []).append({
        'key': 'idemBookingId',
        'value': '',
        'type': 'string'
    })

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 2 updated with 10 test cases.")
