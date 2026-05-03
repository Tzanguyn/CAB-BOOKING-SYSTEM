const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('final_PROJECT_grading-factor.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('grading_factor.txt', data.text);
    console.log('PDF text extracted to grading_factor.txt');
});
