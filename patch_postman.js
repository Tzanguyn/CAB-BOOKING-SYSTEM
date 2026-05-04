const fs = require('fs');

const data = JSON.parse(fs.readFileSync('CAB-Booking-System-12-Levels.postman_collection.json', 'utf8'));

// Find Login and add test script
const loginReq = data.item[0].item.find(i => i.name === 'Login');
if (loginReq) {
  loginReq.event = [
    {
      listen: "test",
      script: {
        exec: [
          "var jsonData = pm.response.json();",
          "if (jsonData.accessToken) {",
          "    pm.collectionVariables.set('token', jsonData.accessToken);",
          "}"
        ],
        type: "text/javascript"
      }
    }
  ];
}

// Add token to collection variables if not exists
if (!data.variable.find(v => v.key === 'token')) {
  data.variable.push({
    key: "token",
    value: "",
    type: "string"
  });
}

// Add Auth Bearer to the whole collection
data.auth = {
  type: "bearer",
  bearer: [
    {
      key: "token",
      value: "{{token}}",
      type: "string"
    }
  ]
};

fs.writeFileSync('CAB-Booking-System-12-Levels.postman_collection.json', JSON.stringify(data, null, 2));
console.log('Postman collection patched!');
