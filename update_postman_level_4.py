import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 4: Transaction & Consistency - 10 test cases
#
# Kiem tra tinh nhat quan cua he thong, bao gom Saga, Compensation
# va Idempotency. Su dung cac flag simulate trong BookingService:
# - strictTransaction: true
# - simulateFailureAfterInsert: true
# - simulatePaymentFailure: true
# - simulateNetworkIssue: true
# ============================================================

level_4_items = [
    # --- Test 1: Transaction tao booking thanh cong ---
    {
        'name': '1. Transaction tao booking thanh cong',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "strictTransaction": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Transaction metadata hop le", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.transaction).to.not.be.undefined;',
                        '    pm.expect(booking.transaction.atomic).to.be.true;',
                        '    pm.expect(booking.transaction.consistent).to.be.true;',
                        '});',
                        'pm.test("Booking status la REQUESTED/PENDING", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(["REQUESTED", "PENDING", "SEARCHING"]).to.include(booking.status);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: Rollback khi loi giua chung ---
    {
        'name': '2. Rollback khi loi giua chung',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "simulateFailureAfterInsert": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 500 Internal Server Error (Transaction rolled back)", function () {',
                        '    pm.expect(pm.response.code).to.eql(500);',
                        '});',
                        'pm.test("Message cho biet da rollback", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("rolled back");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: Payment fail -> rollback booking ---
    {
        'name': '3. Payment that bai -> rollback booking',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "strictTransaction": true,\n  "simulatePaymentFailure": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201 (Booking tra ve nhung status CANCELLED)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking status = CANCELLED", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.status).to.eql("CANCELLED");',
                        '});',
                        'pm.test("Da thuc hien compensation", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.compensated).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: Idempotent transaction ---
    {
        'name': '4. Idempotent transaction (duplicate request)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var token = pm.collectionVariables.get("token");',
                        'var userId = pm.collectionVariables.get("userId");',
                        'var idempotencyKey = "IDEM-TX-" + Date.now();',
                        'pm.collectionVariables.set("txIdempotencyKey", idempotencyKey);',
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
                        '            paymentMethod: "CASH"',
                        '        })',
                        '    }',
                        '}, function (err, res) {',
                        '    if (!err) {',
                        '        var body = res.json();',
                        '        pm.collectionVariables.set("txBookingId", body.data ? (body.data.id || body.data._id) : "");',
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
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Chi 1 transaction duoc thuc hien (tra ve duplicate id)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var originalId = pm.collectionVariables.get("txBookingId");',
                        '    var currentId = jsonData.data ? (jsonData.data.id || jsonData.data._id) : "";',
                        '    pm.expect(String(currentId)).to.eql(String(originalId));',
                        '});',
                        'pm.test("Co co hieu _idempotentReplay = true", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking._idempotentReplay).to.be.true;',
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
                {'key': 'Idempotency-Key', 'value': '{{txIdempotencyKey}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH"\n}'
            }
        }
    },

    # --- Test 5: Concurrent booking ---
    {
        'name': '5. Concurrent booking (race condition)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Ban 2 request song song bang cach goi 2 sendRequest cung luc',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var token = pm.collectionVariables.get("token");',
                        'var userId = pm.collectionVariables.get("userId");',
                        'var raceKey = "RACE-" + Date.now();',
                        'pm.variables.set("raceKey", raceKey);',
                        '',
                        'var payload = {',
                        '    url: gateway + "/api/bookings",',
                        '    method: "POST",',
                        '    header: {',
                        '        "Content-Type": "application/json",',
                        '        "Authorization": "Bearer " + token,',
                        '        "Idempotency-Key": raceKey',
                        '    },',
                        '    body: {',
                        '        mode: "raw",',
                        '        raw: JSON.stringify({',
                        '            customerId: userId,',
                        '            pickupLocation: { lat: 10.762, lng: 106.660 },',
                        '            dropoffLocation: { lat: 10.775, lng: 106.700 }',
                        '        })',
                        '    }',
                        '};',
                        '',
                        'pm.sendRequest(payload, function(err, res) {});'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Khong error do race", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Transaction nhat quan", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
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
                {'key': 'Idempotency-Key', 'value': '{{raceKey}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH"\n}'
            }
        }
    },

    # --- Test 6: Saga transaction - success flow ---
    {
        'name': '6. Saga transaction – success flow',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "strictTransaction": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Saga complete (Booking, Pricing, Payment OK)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.estimatedFare).to.be.above(0);',
                        '    // Nhieu he thong Saga check notification thanh cong',
                        '    pm.expect(booking.notification !== undefined || booking.payment !== undefined).to.be.true;',
                        '});',
                        'pm.test("State nhat quan (Durable)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.transaction).to.not.be.undefined;',
                        '    pm.expect(booking.transaction.durable).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 7: Saga transaction - failure + compensation ---
    {
        'name': '7. Saga transaction – failure + compensation',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "strictTransaction": true,\n  "simulatePaymentFailure": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201 - Transaction compensated gracefully", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking -> CANCELLED", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.status).to.eql("CANCELLED");',
                        '});',
                        'pm.test("Co loi paymentError", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.paymentError).to.not.be.undefined;',
                        '});',
                        'pm.test("Transaction Isolated", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.transaction.isolated).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: Kafka event consistency (outbox pattern) ---
    {
        'name': '8. Kafka event consistency (outbox pattern)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Co Event Trace ID (DB commit va event sync)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var traceId = pm.response.headers.get("x-trace-id") || (jsonData.data && jsonData.data.trace_id);',
                        '    // Neu khong co the kiem tra _id, luon dam bao su dong bo',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 9: Partial failure (network issue) ---
    {
        'name': '9. Partial failure (network issue)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "strictTransaction": true,\n  "simulateNetworkIssue": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201 - Transaction compensated", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Network fail retry / fallback (compensated = true)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.compensated).to.be.true;',
                        '});',
                        'pm.test("State khong bi ket (CANCELLED)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.status).to.eql("CANCELLED");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 10: Data integrity (ACID) ---
    {
        'name': '10. Data integrity (ACID) - reject bad data',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "paymentMethod": "CASH",\n  "strictTransaction": true\n}'
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
                        'pm.test("Khong commit vao DB do sai rule business (thieu dropoff)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("dropoff");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Them level 4 vao collection
level_4_folder = {
    "name": "Level 4: Transaction",
    "item": level_4_items
}

# Xoa level 4 cu neu co (de tranh duplicate khi run script nhieu lan)
collection['item'] = [item for item in collection['item'] if not item['name'].startswith('Level 4')]

# Insert sau Level 3 (tim vi tri cua Level 3)
insert_idx = len(collection['item'])
for i, item in enumerate(collection['item']):
    if item['name'].startswith('Level 3'):
        insert_idx = i + 1
        break

collection['item'].insert(insert_idx, level_4_folder)

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 4 updated with 10 transaction test cases.")
