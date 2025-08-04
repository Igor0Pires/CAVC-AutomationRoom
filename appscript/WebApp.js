function doGet(e) {
  const action = e.parameter.action;
  const row = parseInt(e.parameter.row);
  const newStatus = e.parameter.status;

  // --- Spreadsheet Settings ---
  const SPREADSHEET_ID = '1ma8h1xL6VSMlI7eIfLRKjQBf-OG5N7pJw2eG5pvvHM0';
  const SHEET_NAME = 'Respostas ao formulário 1';
  const LINK_SS = 'https://docs.google.com/spreadsheets/d/1ma8h1xL6VSMlI7eIfLRKjQBf-OG5N7pJw2eG5pvvHM0/edit?'

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  let message = 'Ops! Algo deu errado';
  let subMessage = 'Não consegui processar sua solicitação. Que tal tentar novamente?';
  let messageClass = 'error';
  let emoji = '🤖';
  let emojiMessage = 'Não era para você estar aqui!';

  if (sheet && action === 'updateStatus' && row && newStatus) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusColumnIndex = headers.indexOf('Status');

    if (statusColumnIndex !== -1) {
      const currentStatus = sheet.getRange(row, statusColumnIndex + 1).getValue();

      if (currentStatus === 'Pendente') {
        if (newStatus === 'Confirmado') {
          sheet.getRange(row, statusColumnIndex + 1).setValue(newStatus);
          message = 'Tudo certo!';
          subMessage = `Sua solicitação foi confirmada e está sendo processada. Pode relaxar que eu cuido do resto!`;
          Logger.log(message);
          messageClass = 'success';
          emoji = '✅';
          emojiMessage = 'Processamento iniciado com sucesso!';
        } else {
          message = 'Calma aí!';
          subMessage = `Só consigo confirmar solicitações pendentes.<br/> Não era para você estar aqui não.`;
          Logger.log(message);
          messageClass = 'warning';
          emoji = '⚠️';
          emojiMessage = 'Procurando segredos?';
        }
      } else {
        if (currentStatus === 'Confirmado') {
          message = 'Já está confirmado!';
          subMessage = `Esta solicitação já foi processada. Agora é só aguardar o processamento.`;
          messageClass = 'info';
          emoji = '⏳';
          emojiMessage = 'Sistema processando dados...';
        } else if (currentStatus.includes('Sucesso')) {
          message = 'Missão cumprida!';
          subMessage = `Tudo foi executado com sucesso!`;
          messageClass = 'success';
          emoji = '🎯';
          emojiMessage = 'Operação concluída com êxito!';
        } else if (currentStatus.includes('Falha')) {
          message = 'Deu ruim!';
          subMessage = `Algo deu errado na execução, mas não se preocupe. Já estou analisando o problema.`;
          messageClass = 'error';
          emoji = '🔧';
          emojiMessage = 'Erro crítico detectado!';
        } else {
          message = 'Status estranho';
          subMessage = `O status "${currentStatus}" não é reconhecido pelo sistema. Não era para você estar aqui.`;
          messageClass = 'warning';
          emoji = '❓';
          emojiMessage = 'Status desconhecido no banco de dados!';
        }
        Logger.log(message);
      }
    } else {
      message = 'Coluna não encontrada';
      subMessage = 'A coluna "Status" desapareceu da planilha. Será que alguém deletou?';
      Logger.log(message);
      emoji = '🔍';
      emojiMessage = 'Estrutura de dados corrompida!';
    }
  } else {
    message = 'Dados incompletos';
    subMessage = 'Algumas informações estão faltando para processar sua solicitação.';
    Logger.log(message);
    Logger.log(`Linha: ${row}, Ação: ${action}, ${sheet ? 'SHEET EXISTE' : 'SHEET NÃO EXISTE'}, Status: ${newStatus}`);
    emoji = '📡';
    emojiMessage = 'Transmissão de dados incompleta!';
  }

  const htmlOutput = HtmlService.createHtmlOutput(`
       <!DOCTYPE html>
<html lang="pt-BR">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base target="_top">
    <title>Status do Sistema</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    <style>
        * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        }

        *:hover {
          cursor: none;
        }

        body {
        font-family: 'Orbitron', monospace;
        background: #0a0a0a;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #ffffff;
        line-height: 1.6;
        position: relative;
        overflow: hidden;
        cursor: none;
        }

        /* Custom cursor */
        .cursor {
          position: fixed;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #ffd700, #ff8c00);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: difference;
          transition: transform 0.1s ease;
          box-shadow: 0 0 20px #ffd700;
        }

        .cursor-trail {
          position: fixed;
          width: 8px;
          height: 8px;
          background: #ffd700;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          opacity: 0.6;
          transition: all 0.3s ease;
        }

        /* Animated circuit background */
        .circuit-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        }

        .circuit-line {
        position: absolute;
        background: linear-gradient(90deg, transparent, #ffd700, transparent);
        height: 2px;
        animation: circuit-flow 3s linear infinite;
        }

        .circuit-line.vertical {
        width: 2px;
        height: 100px;
        background: linear-gradient(0deg, transparent, #ffd700, transparent);
        animation: circuit-flow-vertical 4s linear infinite;
        }

        .circuit-node {
        position: absolute;
        width: 8px;
        height: 8px;
        background: #ffd700;
        border-radius: 50%;
        box-shadow: 0 0 10px #ffd700;
        animation: pulse 2s ease-in-out infinite;
        }

        @keyframes circuit-flow {
        0% { transform: translateX(-100%); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateX(100vw); opacity: 0; }
        }

        @keyframes circuit-flow-vertical {
        0% { transform: translateY(-100%); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(100vh); opacity: 0; }
        }

        @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.7; }
        }

        .main-content {
        position: relative;
        z-index: 10;
        text-align: center;
        max-width: 600px;
        }

        .emoji-container {
        font-size: 5rem;
        margin-bottom: 1rem;
        animation: emoji-bounce 2s ease-in-out infinite;
        filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5));
        }

        @keyframes emoji-bounce {
        0%, 100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-15px) scale(1.1); }
        }

        .emoji-message {
        font-size: 0.9rem;
        color: #ffd700;
        margin-bottom: 2rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 500;
        animation: text-glow 2s ease-in-out infinite alternate;
        }

        @keyframes text-glow {
        from { text-shadow: 0 0 5px #ffd700; }
        to { text-shadow: 0 0 15px #ffd700, 0 0 25px #ffd700; }
        }

        h1 {
        font-size: clamp(2.5rem, 8vw, 4rem);
        font-weight: 900;
        margin-bottom: 1rem;
        text-align: center;
        letter-spacing: -0.02em;
        background: linear-gradient(45deg, #ffd700, #ff8c00);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-transform: uppercase;
        animation: title-pulse 3s ease-in-out infinite;
        }

        @keyframes title-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
        }

        .subtitle {
        font-size: clamp(1rem, 3vw, 1.3rem);
        margin-bottom: 3rem;
        opacity: 0.9;
        font-weight: 400;
        text-align: center;
        line-height: 1.5;
        font-family: 'Inter', sans-serif;
        }

        .footer {
        margin-top: 3rem;
        font-size: 0.9rem;
        opacity: 0.6;
        text-align: center;
        font-style: italic;
        font-family: 'Inter', sans-serif;
        }

        .signature {
        position: fixed;
        bottom: 10px;
        right: 15px;
        font-size: 0.7rem;
        opacity: 0.4;
        font-style: italic;
        font-family: 'Inter', sans-serif;
        color: #ffd700;
        z-index: 10;
        }

        .close-icon {
        cursor: none;
        margin-top: 2rem;
        transition: all 0.3s ease;
        animation: icon-float 3s ease-in-out infinite;
        }

        .close-icon:hover {
        transform: scale(1.1) translateY(-5px);
        filter: drop-shadow(0 10px 20px rgba(255, 215, 0, 0.4));
        }

        .close-icon:hover ~ .cursor {
        transform: scale(1.5);
        background: radial-gradient(circle, #ff8c00, #ffd700);
        }

        @keyframes icon-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
        }

        .close-icon svg {
        width: 60px;
        height: 60px;
        transition: all 0.3s ease;
        }

        .close-icon:hover svg {
        filter: brightness(1.2);
        }

        /* Status Colors */
        .success h1 {
        background: linear-gradient(45deg, #32d74b, #ffd700);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        }

        .error h1 {
        background: linear-gradient(45deg, #ff453a, #ff8c00);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        }

        .warning h1 {
        background: linear-gradient(45deg, #ff9f0a, #ffd700);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        }

        .info h1 {
        background: linear-gradient(45deg, #007aff, #ffd700);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        }

        /* Responsive */
        @media (max-width: 480px) {
        .emoji-container {
            font-size: 4rem;
        }
        
        .emoji-message {
            font-size: 0.8rem;
            letter-spacing: 1px;
        }
        
        .close-icon svg {
            width: 50px;
            height: 50px;
        }

        .cursor {
            width: 15px;
            height: 15px;
        }

        .cursor-trail {
            width: 6px;
            height: 6px;
        }
        }

        /* Glitch effect for errors */
        .error .emoji-container {
        animation: emoji-bounce 2s ease-in-out infinite, glitch 0.3s infinite;
        }

        @keyframes glitch {
        0%, 100% { transform: translateY(0px) scale(1); }
        20% { transform: translateY(0px) scale(1) skew(1deg); }
        40% { transform: translateY(0px) scale(1) skew(-1deg); }
        60% { transform: translateY(0px) scale(1) skew(0.5deg); }
        80% { transform: translateY(0px) scale(1) skew(-0.5deg); }
        }
    </style>
    </head>
    <body>
    <div class="cursor" id="cursor"></div>
    <div class="circuit-bg" id="circuitBg"></div>
    
    <div class="main-content">
        <div class="emoji-container">${emoji}</div>
        <div class="emoji-message">${emojiMessage}</div>
        
        <div class="${messageClass}">
        <h1>${message}</h1>
        </div>
        <p class="subtitle">${subMessage}</p>
        
        <div class="close-icon" onclick="window.close()" title="Fechar Sistema">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Desenho inspirado na imagem enviada -->
            <defs>
            <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#F9E610;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#ff8c00;stop-opacity:1" />
            </linearGradient>
            </defs>
            
            <!-- Forma geométrica principal -->
            <path d="M0 100 L20 35 L100 0 Z" fill="url(#iconGradient)" stroke="#F9E610" stroke-width="2"/>

            <!-- Forma secundária sobreposta -->
            <path d="M8 98 L54 55 L100 55 Z" fill="#C7B936" opacity="0.8"/>
            

        </svg>
        </div>
        
        <div class="footer">
        Pode fechar essa janela.<br/>
        <a href="${LINK_SS}">ou clique aqui para acessar a planilha</a>
        </div>
    </div>

    <div class="signature">IPife</div>

    <script>
        // Custom cursor functionality
        const cursor = document.getElementById('cursor');
        const trails = [];
        let mouseX = 0;
        let mouseY = 0;

        // Create cursor trails
        for (let i = 0; i < 5; i++) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            document.body.appendChild(trail);
            trails.push({
                element: trail,
                x: 0,
                y: 0
            });
        }

        // Mouse move event
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            cursor.style.left = mouseX - 10 + 'px';
            cursor.style.top = mouseY - 10 + 'px';
        });

        // Animate cursor trails
        function animateTrails() {
            let prevX = mouseX;
            let prevY = mouseY;
            
            trails.forEach((trail, index) => {
                const delay = (index + 1) * 0.1;
                
                trail.x += (prevX - trail.x) * (0.3 - delay * 0.05);
                trail.y += (prevY - trail.y) * (0.3 - delay * 0.05);
                
                trail.element.style.left = trail.x - 4 + 'px';
                trail.element.style.top = trail.y - 4 + 'px';
                trail.element.style.opacity = 0.6 - (index * 0.1);
                
                prevX = trail.x;
                prevY = trail.y;
            });
            
            requestAnimationFrame(animateTrails);
        }

        animateTrails();

        // Create dynamic circuit background
        function createCircuitElement() {
            const circuitBg = document.getElementById('circuitBg');
            
            // Create circuit lines
            for (let i = 0; i < 2; i++) {
                const line = document.createElement('div');
                line.className = 'circuit-line';
                line.style.top = Math.random() * 100 + '%';
                line.style.width = Math.random() * 200 + 100 + 'px';
                line.style.animationDelay = Math.random() * 3 + 's';
                circuitBg.appendChild(line);
                
                setTimeout(() => line.remove(), 3000);
            }
            
            // Create vertical lines
            for (let i = 0; i < 1; i++) {
                const line = document.createElement('div');
                line.className = 'circuit-line vertical';
                line.style.left = Math.random() * 100 + '%';
                line.style.animationDelay = Math.random() * 4 + 's';
                circuitBg.appendChild(line);
                
                setTimeout(() => line.remove(), 4000);
            }
            
            // Create circuit nodes
            for (let i = 0; i < 3; i++) {
                const node = document.createElement('div');
                node.className = 'circuit-node';
                node.style.left = Math.random() * 100 + '%';
                node.style.top = Math.random() * 100 + '%';
                node.style.animationDelay = Math.random() * 2 + 's';
                circuitBg.appendChild(node);
                
                setTimeout(() => node.remove(), 6000);
            }
        }

        // Create circuit elements periodically
        setInterval(createCircuitElement, 1000);
        
        // Initial circuit elements
        createCircuitElement();

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
            trails.forEach(trail => {
                trail.element.style.opacity = '0';
            });
        });

        document.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
        });
    </script>
    </body>
</html>
  `).setTitle('Status do Sistema');

  return htmlOutput;
}

