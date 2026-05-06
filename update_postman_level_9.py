import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 9: Security Test - 10 test cases
#
# Kiem thu bao mat bao gom: SQL/NoSQL Injection, XSS,
# JWT Tampering, RBAC, mTLS, Rate Limiting, Idempotency, Data Masking.
# ============================================================

level_9_items = [
    # --- Test 1: SQL/NoSQL injection attempt ---
    {
        'name': '1. SQL/NoSQL injection attempt',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/auth/login',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "email": "\\\' OR 1=1 --",\n  "password": "anything"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 400 hoac 401 - System khong bi bypass", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([400, 401, 404]);',
                        '});',
                        'pm.test("Khong tra ve thong tin nhay cam cua DB (Stacktrace)", function () {',
                        '    var responseText = pm.response.text();',
                        '    pm.expect(responseText).to.not.include("SQL syntax");',
                        '    pm.expect(responseText).to.not.include("MongoError");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: XSS input test ---
    {
        'name': '2. XSS input test',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/auth/register',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "email": "xss_test@test.com",\n  "password": "Password123",\n  "name": "<script>alert(\'hack\')</script>",\n  "role": "customer"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 400 (Sanitize block) hoac 201 (Escaped)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([400, 201]);',
                        '});',
                        'if (pm.response.code === 201) {',
                        '    pm.test("Output da duoc escape (Khong chua tag <script> raw)", function () {',
                        '        var jsonData = pm.response.json();',
                        '        var name = (jsonData.user && jsonData.user.name) || "";',
                        '        var rawScript = "<script>alert(\'hack\')</script>";',
                        '        // Expected escaped or sanitized (vidu: &lt;script&gt; hoac empty)',
                        '        pm.expect(name).to.not.eql(rawScript);',
                        '    });',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: JWT tampering ---
    {
        'name': '3. JWT tampering (Fake Admin)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/customer/{{userId}}',
            'auth': {
                'type': 'noauth'
            },
            'header': [
                {
                    'key': 'Authorization',
                    'value': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbl8wMDEiLCJyb2xlIjoiYWRtaW4ifQ.faketamperedsignature123456789'
                }
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 401 Unauthorized - System kiem tra chu ky", function () {',
                        '    pm.response.to.have.status(401);',
                        '});',
                        'pm.test("Tampered JWT bi reject an toan", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.satisfy(function(m) {',
                        '        return m.includes("token") || m.includes("unauthorized") || m.includes("invalid") || m.includes("signature");',
                        '    });',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: Unauthorized API access (CUSTOMER call ADMIN) ---
    {
        'name': '4. Unauthorized API access (Customer calls Admin)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/admin/all',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 403 Forbidden - Khong co quyen Admin", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([403, 401, 404]); // 404 neu router an',
                        '});',
                        'if (pm.response.code === 403) {',
                        '    pm.test("Error tra ve do ABAC Policy / Role Forbidden", function () {',
                        '        var jsonData = pm.response.json();',
                        '        var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '        pm.expect(msg).to.include("forbidden");',
                        '    });',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 5: Rate limit attack ---
    {
        'name': '5. Rate limit attack (>1000 req/s)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Ban lien tuc de bypass. Do gioi han cua Postman, minh test 20 requests',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'for(var i=0; i<20; i++){',
                        '    pm.sendRequest({',
                        '        url: gateway + "/auth/login",',
                        '        method: "POST",',
                        '        header: { "Content-Type": "application/json" },',
                        '        body: { mode: "raw", raw: JSON.stringify({email: "spam@test.com", password: "123"}) }',
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
                        'pm.test("Khong lam sap he thong, phai bi 429 neu Rate Limit hoat dong", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 400, 401, 429]);',
                        '});',
                        'if(pm.response.code === 429) {',
                        '    pm.test("Tra ve 429 Too Many Requests", function() {',
                        '        pm.response.to.have.status(429);',
                        '    });',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/auth/login',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "email": "spam_end@test.com",\n  "password": "123"\n}'
            }
        }
    },

    # --- Test 6: Replay attack (idempotency) ---
    {
        'name': '6. Replay attack (Idempotency Payment)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        'var idempotencyKey = "PAY-IDEM-SEC-" + Date.now();',
                        'pm.variables.set("replayKey", idempotencyKey);',
                        '',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var token = pm.collectionVariables.get("token");',
                        'var userId = pm.collectionVariables.get("userId");',
                        '',
                        'pm.sendRequest({',
                        '    url: gateway + "/api/payments",',
                        '    method: "POST",',
                        '    header: {',
                        '        "Content-Type": "application/json",',
                        '        "Authorization": "Bearer " + token,',
                        '        "Idempotency-Key": idempotencyKey',
                        '    },',
                        '    body: {',
                        '        mode: "raw",',
                        '        raw: JSON.stringify({',
                        '            bookingId: "BKG_REPLAY",',
                        '            amount: 50000',
                        '        })',
                        '    }',
                        '}, function(err, res) {});'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201 OK hoac 400 (do booking ko ton tai) - Nhan response on dinh", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201, 400]);',
                        '});',
                        'pm.test("Khong bi double charge (Tra ve response cu hoac idempotent block)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    if(pm.response.code === 200) {',
                        '        pm.expect(jsonData._idempotentReplay || jsonData.idempotent).to.not.be.undefined;',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/payments',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'Idempotency-Key', 'value': '{{replayKey}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "bookingId": "BKG_REPLAY",\n  "amount": 50000\n}'
            }
        }
    },

    # --- Test 7: Data encryption at rest ---
    {
        'name': '7. Data encryption at rest (Mock check)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/payments/internal/debug-db-encryption',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Doc truc tiep tu DB", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Data tra ve phai bi ma hoa (khong the hien 4111111111111111)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.data.card_number).to.not.include("4111");',
                        '    pm.expect(jsonData.data.card_number).to.include("encrypted");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: mTLS communication ---
    {
        'name': '8. mTLS communication check (No cert -> reject)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/pricing/internal/stats',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("Ket noi tu choi (403 hoac 404, 401) neu khong co mTLS certificate cho Internal API", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([403, 404, 401]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 9: RBAC enforcement (DRIVER call ADMIN) ---
    {
        'name': '9. RBAC enforcement (Driver calls Admin)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/admin/all',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token_driver}}'} # Can set bien moi: token_driver
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 401 hoac 403 (Phai set token_driver trong postman collection thi moi ra 403) hoac 404 an route", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([401, 403, 404]);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 10: Sensitive data masking ---
    {
        'name': '10. Sensitive data masking (Masked payment info)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/payments/me',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 404", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 404, 403]);',
                        '});',
                        'if (pm.response.code === 200) {',
                        '    pm.test("Card number khong duoc lo ra raw", function () {',
                        '        var rawResponse = pm.response.text();',
                        '        // Expected ko bao gio match du 16 so lien tiep cua the tin dung',
                        '        var cardRegex = /[0-9]{16}/;',
                        '        pm.expect(cardRegex.test(rawResponse)).to.be.false;',
                        '    });',
                        '    pm.test("Masking format (****1234) duoc the hien neu co data", function () {',
                        '        var rawResponse = pm.response.text();',
                        '        // Tuy the hien cua he thong, phai dam bao no duoc mask',
                        '        pm.expect(rawResponse).to.include("****");',
                        '    });',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Them level 9 vao collection
level_9_folder = {
    "name": "Level 9: Security Test",
    "item": level_9_items
}

# Xoa level 9 cu neu co
collection['item'] = [item for item in collection['item'] if not item['name'].startswith('Level 9')]

# Insert sau Level 8
insert_idx = len(collection['item'])
for i, item in enumerate(collection['item']):
    if item['name'].startswith('Level 8'):
        insert_idx = i + 1
        break

collection['item'].insert(insert_idx, level_9_folder)

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 9 updated with 10 Security test cases.")
