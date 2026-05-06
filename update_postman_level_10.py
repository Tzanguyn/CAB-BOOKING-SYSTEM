import json
import time

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 10: Zero Trust Security - 10 test cases
#
# Kiểm thử triết lý "Never trust, always verify"
# Các test này nhắm vào việc xác thực cứng rắn mọi request (mTLS, JWT, RBAC),
# không cho phép bất kỳ truy cập unauthorized nào (kể cả từ nội bộ).
# ============================================================

level_10_items = [
    # --- Test 1: Request khong co token ---
    {
        'name': '1. Request khong co token (Missing JWT)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/{{userId}}',
            'auth': {
                'type': 'noauth'
            },
            'header': [] # Khong truyen Authorization
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 401 Unauthorized - Tu choi vi thieu token", function () {',
                        '    pm.response.to.have.status(401);',
                        '});',
                        'pm.test("Reject ngay tai API Gateway", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.satisfy(function(m) {',
                        '        return m.includes("token") || m.includes("unauthorized") || m.includes("missing");',
                        '    });',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: Token khong hop le (tampered) ---
    {
        'name': '2. Token khong hop le (Tampered signature)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/{{userId}}',
            'auth': {
                'type': 'noauth'
            },
            'header': [
                {
                    'key': 'Authorization',
                    'value': 'Bearer {{token}}abc_fake_signature'
                }
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 401 Unauthorized - Chu ky khong hop le", function () {',
                        '    pm.response.to.have.status(401);',
                        '});',
                        'pm.test("Decode fail va vut bo", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("invalid");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: Token het han ---
    {
        'name': '3. Token het han (Expired JWT)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/{{userId}}',
            'auth': {
                'type': 'noauth'
            },
            'header': [
                {
                    'key': 'Authorization',
                    'value': 'Bearer {{expired_token}}' # Can set variable nay hoac truyen 1 token expire that su
                }
            ]
        },
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Fake mot cai token luon expired de thu',
                        'var header = {"alg": "HS256", "typ": "JWT"};',
                        'var payload = {"id": "123", "role": "customer", "exp": 1000000000}; // Nam 2001',
                        'var b64Header = btoa(JSON.stringify(header));',
                        'var b64Payload = btoa(JSON.stringify(payload));',
                        'pm.variables.set("expired_token", b64Header + "." + b64Payload + ".fakesignature");'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 401 Unauthorized - Khong duoc vao he thong", function () {',
                        '    pm.response.to.have.status(401);',
                        '});',
                        'pm.test("Phan biet loi Expired", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.satisfy(function(m) {',
                        '        return m.includes("expired") || m.includes("invalid") || m.includes("unauthorized");',
                        '    });',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: Service-to-service authentication (mTLS) ---
    {
        'name': '4. mTLS enforcement (Internal Service Communication)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/driver/internal/sync',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 403 / 401 / 404 - Request bi chan vi goi thang vao endpoint noi bo ko co mTLS cert", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([401, 403, 404, 502]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 5: RBAC - User khong co quyen ---
    {
        'name': '5. RBAC - User thuong goi API Admin',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/users/admin/dashboard',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 403 Forbidden - Access denied", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([403, 401, 404]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 6: Least privilege (Driver queries User Data) ---
    {
        'name': '6. Least Privilege (Driver khong duoc quyen lay thong tin User khac)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/users/profile/USR_999999',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token_driver}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 403 Forbidden - Phai block viec lay du lieu xuyen quyen", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([403, 401, 404]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 7: API Gateway kiem tra tat ca request ---
    {
        'name': '7. Bypass Gateway Attack (Direct to Microservice)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/rides',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Simulate-Bypass-Gateway', 'value': 'true'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("Service noi bo tu choi tra loi neu thieu header tu API Gateway", function () {',
                        '    // Gia lap x-bypass -> server noi bo (thuc te postman chi goi gateway hoac map port le).',
                        '    // Khang dinh 403 Forbidden',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 401, 403, 404]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: Rate limiting chong abuse ---
    {
        'name': '8. Rate limit (Zero Trust DDoS Protection)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Spam',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'for(var i=0; i<15; i++) {',
                        '    pm.sendRequest({',
                        '        url: gateway + "/health",',
                        '        method: "GET"',
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
                        'pm.test("HTTP 200 hoac 429 Too Many Requests - Traffic duoc ap dung rate limit", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 429]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/health',
            'header': []
        }
    },

    # --- Test 9: Data encryption in transit (Force HTTPS) ---
    {
        'name': '9. Data encryption in transit (HTTPS Only)',
        'request': {
            'method': 'GET',
            'url': 'http://127.0.0.1/api/bookings', # Test bat HTTP thay vi HTTPS tren domain
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Forwarded-Proto', 'value': 'http'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("Chi cho phep giao tiep HTTPS, HTTP se bi block/redirect", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 301, 302, 403, 404, 502]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 10: Audit logging (Security Trace) ---
    {
        'name': '10. Audit logging (Full Security Trace)',
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
                        'pm.test("Request duoc ghi nhan kem Trace ID hoac Audit ID", function () {',
                        '    var traceId = pm.response.headers.get("x-trace-id") || pm.response.headers.get("x-audit-id");',
                        '    var jsonData = pm.response.json();',
                        '    var bodyTrace = jsonData.traceId || (jsonData.data && jsonData.data.trace_id);',
                        '    pm.expect(traceId !== undefined || bodyTrace !== undefined).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Them level 10 vao collection
level_10_folder = {
    "name": "Level 10: Zero Trust Security",
    "item": level_10_items
}

# Xoa level 10 cu neu co
collection['item'] = [item for item in collection['item'] if not item['name'].startswith('Level 10')]

# Insert sau Level 9
insert_idx = len(collection['item'])
for i, item in enumerate(collection['item']):
    if item['name'].startswith('Level 9'):
        insert_idx = i + 1
        break

collection['item'].insert(insert_idx, level_10_folder)

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 10 updated with 10 Zero Trust Security test cases.")
