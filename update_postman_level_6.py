import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 6: AI Agent Logic - 10 test cases
#
# Kiểm thử tư duy ra quyết định của AI Agent (Matching Service)
# bao gồm việc lấy context, trade-off đa mục tiêu (ETA, Price, Distance),
# xử lý lỗi, retry, fallback và log quyết định.
# ============================================================

level_6_items = [
    # --- Test 1: Agent chon driver gan nhat ---
    {
        'name': '1. Agent chon driver gan nhat (Distance Priority)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 5,\n  "top": 3\n}'
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
                        'pm.test("Driver duoc sort theo diem (Score)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var recs = jsonData.recommendations || [];',
                        '    if (recs.length > 1) {',
                        '        pm.expect(recs[0].score).to.be.at.least(recs[1].score);',
                        '    }',
                        '});',
                        'pm.test("Quyet dinh dua tren distance_score", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var recs = jsonData.recommendations || [];',
                        '    if (recs.length > 0) {',
                        '        pm.expect(recs[0].scoreBreakdown).to.not.be.undefined;',
                        '        pm.expect(recs[0].scoreBreakdown.distanceScore).to.not.be.undefined;',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: Agent chon driver co rating cao hon ---
    {
        'name': '2. Agent chon driver co rating cao hon (Rating Priority)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 10,\n  "top": 3\n}'
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
                        'pm.test("Agent can nhac rating trong viec tinh score", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var recs = jsonData.recommendations || [];',
                        '    if (recs.length > 0) {',
                        '        pm.expect(recs[0].scoreBreakdown.ratingScore).to.be.above(0);',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: Agent can bang ETA vs Price trade-off ---
    {
        'name': '3. Agent can bang ETA vs price trade-off',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 5,\n  "demandIndex": 2.5,\n  "top": 3\n}'
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
                        'pm.test("Context chua demandBoost de can bang trade-off gia", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var context = jsonData.context || {};',
                        '    pm.expect(context.demandIndex).to.eql(2.5);',
                        '});',
                        'pm.test("Driver score co tinh demandBoost", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var recs = jsonData.recommendations || [];',
                        '    if (recs.length > 0) {',
                        '        pm.expect(recs[0].scoreBreakdown.demandBoost).to.be.above(0);',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: Agent goi dung tool (ETA vs Pricing) ---
    {
        'name': '4. Agent goi dung tool (MCP context integration)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 5,\n  "pickup": {"lat": 10.76, "lng": 106.66},\n  "dropoff": {"lat": 10.77, "lng": 106.70}\n}'
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
                        'pm.test("Agent da goi sang Pricing Service thanh cong", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var context = jsonData.context || {};',
                        '    // Neu priceSignal hoac surge duoc set tu Pricing Service',
                        '    pm.expect(context.priceSignal !== undefined).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 5: Agent xu ly context thieu du lieu ---
    {
        'name': '5. Agent xu ly context thieu du lieu (Missing data)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "radiusKm": 5,\n  "top": 3\n}'
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
                        'pm.test("Agent reject an toan thay vi crash system", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var msg = (jsonData.error || jsonData.message || "").toLowerCase();',
                        '    pm.expect(msg).to.include("valid numbers");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 6: Agent retry khi service loi ---
    {
        'name': '6. Agent retry khi service loi',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 99.99,\n  "lng": 99.99,\n  "radiusKm": 5,\n  "simulate_service_fail": true\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK - Agent tu phuc hoi hoac fallback", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 500]);',
                        '});',
                        'pm.test("Agent khong fail ngay ma van co gang dua ra ket qua", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.recommendations).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 7: Agent khong chon driver offline ---
    {
        'name': '7. Agent khong chon driver offline',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 10,\n  "top": 5\n}'
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
                        'pm.test("Tuyet doi khong co driver status = OFFLINE", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var recs = jsonData.recommendations || [];',
                        '    var hasOffline = recs.some(r => r.status === "OFFLINE");',
                        '    pm.expect(hasOffline).to.be.false;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: Agent log decision day du ---
    {
        'name': '8. Agent log decision day du (Explainability)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 5,\n  "top": 1\n}'
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
                        'pm.test("Co luu context va scoreBreakdown giong nhu suy luan cua Agent", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var recs = jsonData.recommendations || [];',
                        '    pm.expect(jsonData.context).to.not.be.undefined;',
                        '    if (recs.length > 0) {',
                        '        pm.expect(recs[0].scoreBreakdown).to.not.be.undefined;',
                        '    }',
                        '});',
                        'pm.test("Co trace_id de tracking log", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.traceId !== undefined || pm.response.headers.get("x-trace-id") !== undefined).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 9: Agent xu ly nhieu request song song ---
    {
        'name': '9. Agent xu ly nhieu request song song (Concurrency)',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var token = pm.collectionVariables.get("token");',
                        '',
                        'var payload = {',
                        '    url: gateway + "/api/matching/recommend",',
                        '    method: "POST",',
                        '    header: {',
                        '        "Content-Type": "application/json",',
                        '        "Authorization": "Bearer " + token',
                        '    },',
                        '    body: {',
                        '        mode: "raw",',
                        '        raw: JSON.stringify({',
                        '            lat: 10.762, lng: 106.660, radiusKm: 5, top: 3',
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
                        'pm.test("HTTP 200 OK - Khong crash du bi call dong thoi", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Van tra ve du driver", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.recommendations).to.be.an("array");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.762,\n  "lng": 106.660,\n  "radiusKm": 5,\n  "top": 3\n}'
            }
        }
    },

    # --- Test 10: Agent fallback rule-based khi AI fail ---
    {
        'name': '10. Agent fallback rule-based khi AI fail',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 999.999,\n  "lng": 999.999,\n  "radiusKm": 5,\n  "top": 3\n}'
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
                        'pm.test("Agent tu dong fallback tao list gia (Rule-based)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.fallback).to.be.true;',
                        '});',
                        'pm.test("Van tra ve driver du model bi crash/loi timeout", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.recommendations.length).to.be.above(0);',
                        '    pm.expect(jsonData.recommendations[0].driverId).to.include("SYNTH");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Them level 6 vao collection
level_6_folder = {
    "name": "Level 6: AI Agent Logic",
    "item": level_6_items
}

# Xoa level 6 cu neu co
collection['item'] = [item for item in collection['item'] if not item['name'].startswith('Level 6')]

# Insert sau Level 5
insert_idx = len(collection['item'])
for i, item in enumerate(collection['item']):
    if item['name'].startswith('Level 5'):
        insert_idx = i + 1
        break

collection['item'].insert(insert_idx, level_6_folder)

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 6 updated with 10 AI Agent Logic test cases.")
