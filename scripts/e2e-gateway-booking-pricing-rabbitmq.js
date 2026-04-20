const smoke = require('./level1-cab-system-smoke');

if (require.main === module) {
  smoke.runLevel1SmokeSuite().catch((error) => {
    console.error('--- CAB System smoke failed ---');
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = smoke;
