const app = require('./src/app');

const PORT = process.env.PORT || 3015;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🗄️  Storage Service running on port ${PORT}`);
});
