const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors())
app.use(express.static('public'))

app.get('/api/musicas', async (req, res) => {
  const artistaId = req.query.artistaId;
  if (!artistaId) return res.status(400).json({ error: 'ID do artista ausente' });

  try {
    const resposta = await fetch(`https://api.deezer.com/artist/${artistaId}/top?limit=100`);
    const dados = await resposta.json();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar músicas', details: err.message });
  }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
})