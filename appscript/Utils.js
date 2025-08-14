function onFormSubmit(e) {
  // --- Setting up spreadsheets ---
  const ID_PLANILHA = PropertiesService.getScriptProperties().getProperty('ID_SHEET_CONTROL');

  const NOME_ABA = PropertiesService.getScriptProperties().getProperty('TAB_NAME');

  const planilha = SpreadsheetApp.openById(ID_PLANILHA);
  const sheet = planilha.getSheetByName(NOME_ABA);

  if (!sheet) {
    Logger.log('Erro: Aba "' + NOME_ABA + '" não encontrada na planilha. Verifique o nome da aba.');
    return;
  }

  // --- New Response ---
  const responseRow = e.range.getRow();

  if (responseRow < 2) {
    Logger.log('Erro: Linha da resposta inválida ou fora do esperado.');
    return;
  }

  // --- Add/Update ---
  const ultimaColuna = sheet.getLastColumn();
  const cabecalhos = sheet.getRange(1, 1, 1, ultimaColuna).getValues()[0];

  let colunaStatusIndex = cabecalhos.indexOf("Status");
  if (colunaStatusIndex === -1) {
    sheet.getRange(1, ultimaColuna + 1).setValue('Status');
    colunaStatusIndex = ultimaColuna;
  }

  sheet.getRange(responseRow, colunaStatusIndex + 1).setValue('Pendente');
  Logger.log(`Status 'Pendente' definido na linha ${responseRow}, coluna ${colunaStatusIndex + 1}.`);

  // --- Getting Emails ---
  const emailResposta = e.namedValues && e.namedValues['Endereço de e-mail'] ? e.namedValues['Endereço de e-mail'][0] : e.responderEmail;
  const emailResponsavel = PropertiesService.getScriptProperties().getProperty('EMAILRESP');

  // --- Formatting Responses for Email ---
  const respostasForm = Object.entries(e.namedValues).map(([pergunta, resposta]) => `${pergunta}: ${resposta[0]}`).join('<br>');

  // --- Create Button to Change Status ---
  const urlBaseApp = PropertiesService.getScriptProperties().getProperty('URL_WEB_APP');
  '';

  const linkConfirmar = `${urlBaseApp}?action=updateStatus&row=${responseRow}&status=Confirmado`;
  const assunto = 'Confirmação de Resposta e Acompanhamento';

  // --- Email Bodies ---
  const emailBodyClient = `
    <p>Olá,</p>
    <p>Obrigado por sua resposta ao formulário. Suas respostas foram:</p>
    <p>${respostasForm}</p>
    <br><br>
    <p>Atenciosamente,</p>
    <p>VISCO :)</p>
    `;

  const emailBodyResponsavel = `
    <p><b>Para o Administrador (Você):</b></p>
    <p>As respostas de ${emailResposta || 'um respondedor'} foram:</p>
    <p>${respostasForm}</p> <p>Para mudar o status desta resposta, clique no botão abaixo:</p>
    <a href="${linkConfirmar}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-align:center;text-decoration:none;display:inline-block;border-radius:5px;">Marcar como Confirmado</a>
    <br><br>
    <p>Atenciosamente,</p>
    <p>VISCO :)</p>
    `;

  // --- Send Emails ---
  try {
    if (emailResposta && emailResposta.includes('@')) {
      MailApp.sendEmail({
        to: emailResposta,
        subject: assunto,
        htmlBody: emailBodyClient,
      });
      Logger.log(`E-mail de confirmação enviado para o respondedor: ${emailResposta}`);
    } else {
      Logger.log("E-mail do respondedor não encontrado ou inválido. Não foi possível enviar e-mail de confirmação.");
    }

    MailApp.sendEmail({
      to: emailResponsavel,
      subject: assunto,
      htmlBody: emailBodyResponsavel,
    });
    Logger.log(`E-mail de notificação enviado para o responsável: ${emailResponsavel}`);
  } catch (error) {
    Logger.log('Erro ao enviar e-mail: ' + error.message);
  }
}