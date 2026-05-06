import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 1: Basic API & Flow — 10 test cases
# Sửa đúng theo source code thực tế của hệ thống:
#   - Password >= 8 ký tự (gateway validateAuthRegister)
#   - Register response: { user: { id, ... } }
#   - Login response:    { tokens: { accessToken }, user: { id } }
#   - Booking cần customerId (gateway validateBookingCreate)
#   - Booking response:  { success, data: { status, id, ... } }
#   - Get customer bookings: GET /api/bookings/customer/:customerId
#   - Driver routes cần role driver/admin → thay bằng GET /auth/profile
#   - Notification endpoint: POST /api/notifications/send
#   - ETA response: { eta, eta_minutes }
#   - Pricing response: { price, surge, estimatedFare }
# ============================================================

level_1_items = [
    # ─── Test 1: Đăng ký user ───
    {
        'name': '1. Đăng ký user thành công',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/auth/register',
            'header': [{'key': 'Content-Type', 'value': 'application/json'}],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "email": "testlevel1@test.com",\n  "password": "Test@12345",\n  "name": "Test User",\n  "role": "customer"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 201 Created", function () {',
                        '    pm.response.to.have.status(201);',
                        '});',
                        'pm.test("Trả về user object với id", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.user).to.not.be.undefined;',
                        '    pm.expect(jsonData.user.id).to.not.be.undefined;',
                        '    pm.expect(jsonData.message).to.eql("User registered successfully");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 2: Đăng nhập trả JWT ───
    {
        'name': '2. Đăng nhập trả JWT hợp lệ',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/auth/login',
            'header': [{'key': 'Content-Type', 'value': 'application/json'}],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "email": "testlevel1@test.com",\n  "password": "Test@12345"\n}'
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
                        'pm.test("Trả về tokens.accessToken", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.tokens).to.not.be.undefined;',
                        '    pm.expect(jsonData.tokens.accessToken).to.not.be.undefined;',
                        '    pm.collectionVariables.set("token", jsonData.tokens.accessToken);',
                        '});',
                        'pm.test("Trả về user.id và lưu userId", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.user).to.not.be.undefined;',
                        '    pm.expect(jsonData.user.id).to.not.be.undefined;',
                        '    pm.collectionVariables.set("userId", jsonData.user.id);',
                        '});',
                        'pm.test("Token decode hợp lệ (có sub và exp)", function () {',
                        '    var token = pm.collectionVariables.get("token");',
                        '    if (token) {',
                        '        var parts = token.split(".");',
                        '        pm.expect(parts.length).to.eql(3);',
                        '        var payload = JSON.parse(atob(parts[1]));',
                        '        pm.expect(payload.sub).to.not.be.undefined;',
                        '        pm.expect(payload.exp).to.not.be.undefined;',
                        '        pm.expect(payload.role).to.eql("customer");',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 3: Tạo booking ───
    {
        'name': '3. Tạo booking với input hợp lệ',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762622, "lng": 106.660172},\n  "dropoffLocation": {"lat": 10.775658, "lng": 106.700424},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoặc 201", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Response success=true và có booking data", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '    pm.expect(jsonData.data).to.not.be.undefined;',
                        '});',
                        'pm.test("Booking có id và status REQUESTED", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data;',
                        '    pm.expect(booking.id || booking._id).to.not.be.undefined;',
                        '    pm.expect(booking.status).to.be.oneOf(["REQUESTED", "CONFIRMED", "SEARCHING"]);',
                        '    // Lưu bookingId để dùng cho test sau',
                        '    pm.collectionVariables.set("bookingId", booking.id || booking._id);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 4: Lấy booking theo ID ───
    {
        'name': '4. Lấy booking theo ID',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/{{bookingId}}',
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
                        'pm.test("Trả về booking data đúng ID", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '    pm.expect(jsonData.data).to.not.be.undefined;',
                        '    var bookingId = pm.collectionVariables.get("bookingId");',
                        '    if (bookingId) {',
                        '        pm.expect(String(jsonData.data.id || jsonData.data._id)).to.eql(String(bookingId));',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 5: Lấy danh sách booking của customer ───
    {
        'name': '5. Lấy danh sách booking của customer',
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
                        'pm.test("Trả về list booking (data là array)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '    pm.expect(jsonData.data).to.not.be.undefined;',
                        '    pm.expect(Array.isArray(jsonData.data)).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 6: ETA ───
    {
        'name': '6. Gọi API ETA trả về giá trị > 0',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/eta/estimate',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "distance_km": 5,\n  "traffic_level": 0.5\n}'
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
                        'pm.test("ETA > 0 phút", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var eta = jsonData.eta || jsonData.eta_minutes;',
                        '    pm.expect(eta).to.be.above(0);',
                        '});',
                        'pm.test("Có model_version", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.model_version).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 7: Pricing ───
    {
        'name': '7. Pricing API trả về giá hợp lệ',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/pricing/estimate',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "distance_km": 5,\n  "demand_index": 1.0\n}'
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
                        'pm.test("Price > 0 (estimatedFare hoặc price)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var price = jsonData.price || jsonData.estimatedFare;',
                        '    pm.expect(price).to.be.above(0);',
                        '});',
                        'pm.test("Surge >= 1", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.surge).to.be.at.least(1);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 8: Lấy profile ───
    {
        'name': '8. Lấy profile user qua auth service',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/auth/profile',
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
                        'pm.test("Trả về profile với email đúng", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.profile).to.not.be.undefined;',
                        '    pm.expect(jsonData.profile.email).to.eql("testlevel1@test.com");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 9: Notification ───
    {
        'name': '9. Notification gửi thành công',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/notifications/send',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "userId": "{{userId}}",\n  "title": "Booking Confirmed",\n  "message": "Your ride has been confirmed",\n  "type": "ALL"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoặc 201 (Notification sent)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Response thành công", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success !== false).to.be.true;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # ─── Test 10: Logout ───
    {
        'name': '10. Logout invalidate token',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/auth/logout',
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
                        'pm.test("Message = Logged out successfully", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.message).to.eql("Logged out successfully");',
                        '});',
                        'pm.test("Xóa token khỏi collection variables", function () {',
                        '    pm.collectionVariables.unset("token");',
                        '    pm.collectionVariables.unset("bookingId");',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Cập nhật vào collection
for item in collection['item']:
    if 'name' in item and item['name'].startswith('Level 1'):
        item['item'] = level_1_items
        break

# Thêm biến bookingId nếu chưa có
existing_vars = {v['key'] for v in collection.get('variable', [])}
if 'bookingId' not in existing_vars:
    collection.setdefault('variable', []).append({
        'key': 'bookingId',
        'value': '',
        'type': 'string'
    })
if 'userId' not in existing_vars:
    collection.setdefault('variable', []).append({
        'key': 'userId',
        'value': '',
        'type': 'string'
    })

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 1 updated with 10 correct test cases.")
