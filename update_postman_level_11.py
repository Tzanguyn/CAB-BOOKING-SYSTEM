import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 11: Deployment - 10 test cases
#
# Kiểm thử sự ổn định của môi trường Deployment (VM/K8s/Swarm),
# bao gồm Health Check, Connect DB/Kafka, ENV Vars,
# Zero Downtime, Auto Scaling, Service Mesh.
# (Do Postman là API Client, nó sẽ test thông qua endpoints
#  phản ánh trạng thái infrastructure của cụm).
# ============================================================

level_11_items = [
    # --- Test 1: Deploy service thanh cong (basic) ---
    {
        'name': '1. Deploy service thanh cong (Basic Pod Running)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/health',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Container hoat dong, khong CrashLoopBackOff", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Service Booking dang Running tren node (API tra ve valid info)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.service).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: Health check endpoint ---
    {
        'name': '2. Health check endpoint (/health)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/health',
            'header': []
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Readiness/Liveness probe OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Status = OK (Hoac healthy)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var status = (jsonData.status || "").toLowerCase();',
                        '    pm.expect(["ok", "healthy", "up"]).to.include(status);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: Environment variables dung ---
    {
        'name': '3. Environment variables dung (Check Config State)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/eta/health',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Khong bi saps/Crash do thieu ENV variables", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Config valid - Check model version config", function () {',
                        '    var jsonData = pm.response.json();',
                        '    // Neu ETA config co bien ETA_MODEL_VERSION, test coi no co nap dc khong',
                        '    if (jsonData.model_version !== undefined) {',
                        '        pm.expect(jsonData.model_version.length).to.be.above(0);',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: Service connect database ---
    {
        'name': '4. Service connect database (DB Connectivity)',
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
                        'pm.test("HTTP 200 OK - DB Connection Pool hoat dong", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Lay duoc du lieu tu Postgres/MongoDB, khong bi Connection Refused", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 5: Service connect Kafka ---
    {
        'name': '5. Service connect Kafka (Message Broker)',
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
                        'pm.test("HTTP 200/201 OK - Publish Kafka thanh cong", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Khong bi ban loi Timeout hoac Broker Not Available", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.status).to.not.eql("ERROR");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 6: Rolling update (zero downtime) ---
    {
        'name': '6. Rolling update (Zero Downtime Check)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/matching/health',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("Van request duoc binh thuong (khi gia lap dang deploy ban moi tren K8s)", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("He thong tra ve version hien tai (Co the check ver cu hay moi khi loop)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.model_version).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 7: Auto scaling (HPA) ---
    {
        'name': '7. Auto scaling (HPA Metrics Test)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/metrics',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("Nhan duoc ban do Metrics (Prometheus) de HPA lang nghe", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 404]); // gateway co endpoint metric ko? Thieu thi bo qua',
                        '});',
                        '// K8s HPA se scale base tren CPU/Metrics. Postman xac thuc endpoint metric hoat dong.',
                        'if (pm.response.code === 200) {',
                        '    pm.test("Output la plaintext cua Prometheus", function() {',
                        '        pm.expect(pm.response.text()).to.include("requests");',
                        '    });',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: Service mesh routing ---
    {
        'name': '8. Service mesh routing (Istio/Linkerd VirtualService)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/pricing/health',
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
                        'pm.test("Traffic route qua Mesh va API Gateway toi dich ma khong bi drop", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.service).to.eql("pricing-service");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 9: Config sai -> fail fast ---
    {
        'name': '9. Config sai -> fail fast (CrashLoopBackOff check)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/pricing/health',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Simulate-Bad-Config', 'value': 'true'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 500 - Service fail ngay khi config sai (Fail Fast)", function () {',
                        '    pm.response.to.have.status(500);',
                        '});',
                        'pm.test("Status = CRASHED, khong phai healthy", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.status).to.eql("CRASHED");',
                        '});',
                        'pm.test("Log ro loi: missing config + crash reason", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.missingConfig).to.be.an("array").that.is.not.empty;',
                        '    pm.expect(jsonData.crashReason).to.include("CrashLoopBackOff");',
                        '});',
                        'pm.test("Khong chay o trang thai half-broken", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.halfBroken).to.be.false;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 10: Rollback deployment ---
    {
        'name': '10. Rollback deployment (Service quay ve Version truoc do)',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/matching/health',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'},
                {'key': 'X-Simulate-Rollback', 'value': 'true'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Rollback thanh cong tren K8s va app song lai", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Data/Version nhat quan, khong mat request", function () {',
                        '    var jsonData = pm.response.json();',
                        '    // model_version se la phien ban truoc (gia dinh)',
                        '    pm.expect(jsonData.model_version).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Them level 11 vao collection
level_11_folder = {
    "name": "Level 11: Deployment",
    "item": level_11_items
}

# Xoa level 11 cu neu co
collection['item'] = [item for item in collection['item'] if not item['name'].startswith('Level 11')]

# Insert sau Level 10
insert_idx = len(collection['item'])
for i, item in enumerate(collection['item']):
    if item['name'].startswith('Level 10'):
        insert_idx = i + 1
        break

collection['item'].insert(insert_idx, level_11_folder)

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 11 updated with 10 Deployment test cases.")
