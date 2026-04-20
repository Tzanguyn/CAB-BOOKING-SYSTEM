const app = require('./src/app');

const PORT = process.env.PORT || 3012;

app.listen(PORT, () => {
  console.log(`Fraud Service running on port ${PORT}`);
});
