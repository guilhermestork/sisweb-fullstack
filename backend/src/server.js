require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const porta = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(porta, () => console.log(`Rodando na porta ${porta}`));
  })
  .catch((err) => {
    console.error('Falha ao conectar no banco', err);
    process.exit(1);
  });
