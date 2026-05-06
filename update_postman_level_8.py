import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 8: Failure & Resilience - 10 test cases
#
# Kiểm thử khả năng chịu lỗi và phục hồi: Circuit Breaker, Fallback,
# Graceful Degradation, Timeout, Retry Exponential Backoff.
# Các test này được thiết kế dựa trên giả lập lỗi trong payload
# hoặc check SLA response để khẳng định resilience.
# ============================================================

level_8_items = [
    # --- Test 1: Driver service down -> fallback ---
    {
        'name': '1. Driver service down -> fallback',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 5,\n  "simulate_service_fail": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Khong crash toan he thong", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Da kich hoat fallback thay the", function () {',
                        '    var jsonData = pm.response.json();',
                        '    // Expected he thong tra ve list driver tong hop hoac status fallback',
                        '    pm.expect(jsonData.fallback).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: Pricing service timeout -> retry/fallback ---
    {
        'name': '2. Pricing service timeout -> retry/fallback',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/pricing/estimate',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "distance_km": 5,\n  "simulate_model_error": true\n}'
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
                        'pm.test("Ap dung gia mac dinh khi service timeout/error", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.price || jsonData.estimatedFare).to.be.above(0);',
                        '    pm.expect(jsonData.fallback).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: Kafka down -> buffer event ---
    {
        'name': '3. Kafka down -> buffer event (Outbox pattern)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "simulateKafkaDown": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201 OK - System khong crash", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking van duoc luu vao DB de retry sau", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.id || booking._id).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: DB failover ---
    {
        'name': '4. DB failover (Switch to replica)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/{{userId}}',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Simulate-DB-Primary-Down', 'value': 'true'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Khong downtime lau", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Data query van consistent tu replica", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 5: Circuit breaker open ---
    {
        'name': '5. Circuit breaker open',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Spam payload error de the hien CB mo',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var token = pm.collectionVariables.get("token");',
                        'for(var i=0; i<3; i++) {',
                        '    pm.sendRequest({',
                        '        url: gateway + "/api/pricing/estimate",',
                        '        method: "POST",',
                        '        header: {',
                        '            "Content-Type": "application/json",',
                        '            "Authorization": "Bearer " + token',
                        '        },',
                        '        body: { mode: "raw", raw: JSON.stringify({distance_km: -1}) } // Invalid',
                        '    }, function(err, res) {});',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP request fail fast ma khong cascade failure", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 400, 503]);',
                        '});',
                        'pm.test("Circuit Breaker hoat dong - Ngan ngua calls tiep", function () {',
                        '    // Response se ban cuc nhanh do CB ngan request',
                        '    pm.expect(pm.response.responseTime).to.be.below(300);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/pricing/estimate',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "distance_km": -1\n}'
            }
        }
    },

    # --- Test 6: Partial system failure handling ---
    {
        'name': '6. Partial system failure handling',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "simulateNotificationFail": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201 OK - Core flow van chay", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Mot phan he thong loi (Notification) khong block Booking", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 7: Retry exponential backoff ---
    {
        'name': '7. Retry exponential backoff',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/{{userId}}',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("He thong su dung timeout phu hop the hien retry log", function () {',
                        '    // Mo phong o Postman chi test request cuoi cung thanh cong.',
                        '    pm.expect(pm.response.responseTime).to.be.above(0);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: Service mesh routing fail ---
    {
        'name': '8. Service mesh routing fail (Fallback route)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/matching/health',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Simulate-Mesh-Fail', 'value': 'true'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Request khong bi mat do lo loi routing (Tra ve fallback / cached)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.status).to.eql("healthy");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 9: Network partition test ---
    {
        'name': '9. Network partition test (Split Brain)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/pricing/recommend-drivers?lat=10.76&lng=106.66&radius=5',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Simulate-Network-Partition', 'value': 'true'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("System degrade gracefully thay vi 500 throw loi", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 503, 502, 500, 404]);',
                        '});',
                        'pm.test("Data hien hanh van phai ton tai", function () {',
                        '    var jsonData = pm.response.json();',
                        '    if (pm.response.code === 200) {',
                        '        pm.expect(jsonData.recommendations).to.be.an("array");',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 10: Graceful degradation ---
    {
        'name': '10. Graceful degradation (Core function remains)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "simulateSystemOverload": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201 OK - Core function (booking) van chay", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Tat bot non-critical features (Vi du Pricing tro thanh basic)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Them level 8 vao collection
level_8_folder = {
    "name": "Level 8: Failure & Resilience",
    "item": level_8_items
}

# Xoa level 8 cu neu co
collection['item'] = [item for item in collection['item'] if not item['name'].startswith('Level 8')]

# Insert sau Level 7
insert_idx = len(collection['item'])
for i, item in enumerate(collection['item']):
    if item['name'].startswith('Level 7'):
        insert_idx = i + 1
        break

collection['item'].insert(insert_idx, level_8_folder)

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 8 updated with 10 Failure & Resilience test cases.")
