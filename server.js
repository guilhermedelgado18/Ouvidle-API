const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const salas = {};

const app = express();
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:1234",
    methods: ["GET", "POST"],
  }
});

const PORT = 3001;

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

io.on('connection', (socket) => {
  console.log('Novo cliente conectado: ', socket.id);
  
  socket.on('mensagem', (msg) => {
    console.log('Mensagem recebida do cliente:', msg);

    socket.emit('resposta', 'Olá, mensagem recebida!');
  });

  socket.on('criarSala', ({ username, codigoGerado, maxJogadores, senha }) => {
    salas[codigoGerado] = {
      codigo: codigoGerado,
      limite: maxJogadores,
      senha,
      usuarios: [{id: socket.id, nome: username}]
    };

    socket.join(codigoGerado);
    socket.emit('salaCriada', codigoGerado)
    console.log(`Sala ${codigoGerado} criada com limite ${maxJogadores} e senha ${senha}.`)
    console.log(salas[codigoGerado].usuarios)
  });

  socket.on('entrarSala', ({username, codigo}) => {
    const sala = salas[codigo]
    
    console.log(sala)

    if (!sala) {
      socket.emit('erroSala', 'Sala não encontrada!')
      return
    }

    if(sala.senha === '') {
      if(sala.usuarios.length >= sala.limite) {
        socket.emit('erroSala', 'Sala Cheia')
        return
      }
      socket.emit('temSenha', {temSenha: false, codigoSala: sala.codigo})
      sala.usuarios.push({id: socket.id, nome: username})
      console.log(sala.usuarios)
      socket.join(codigo)
    } else {
      socket.emit('temSenha', {temSenha: true, codigoSala: sala.codigo})
    }
  })

  socket.on('verificarSenha', ({ username, codigo, senhaDigitada }) => {
    const sala = salas[codigo]

    if(!sala) {
      socket.emit('erroSala', 'Sala não existe')
      return
    }
    
    
    if(senhaDigitada === sala.senha) {
      if(sala.usuarios.length >= sala.limite) {
        socket.emit('erroSala', 'Sala Cheia')
        return
      }

      sala.usuarios.push({id: socket.id, nome: username})
      console.log(sala.usuarios)
      socket.emit('respostaSenha', {status: true, codigoSala: sala.codigo})
      socket.join(codigo)
    } else {
      socket.emit('respostaSenha', {status: false})
    }
  })

  socket.on('mensagemSala', ({ sala, texto }) => {
    const salaInfo = salas[sala]
    const usuario = salaInfo.usuarios.find(user => user.id === socket.id)
    const username = usuario.nome
    socket.to(sala).emit('mensagemSala', { username, texto })
  })

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
})