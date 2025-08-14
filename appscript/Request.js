const exec = '/test_action';
const ID_sheet = PropertiesService.getScriptProperties().getProperty('ID_SHEET_CONTROL');
const TAB_NAME = PropertiesService.getScriptProperties().getProperty('TAB_NAME');
const RENDER_API_URL = PropertiesService.getScriptProperties().getProperty('RENDER_API_URL') + exec;
const DRIVE_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
const EMAILRESP = PropertiesService.getScriptProperties().getProperty('EMAILRESP')

function request() {
  const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY_SECRET');
  if (!API_KEY) {
    Logger.log('Erro: API_KEY_SECRET não está configurada.');
    return;
  }

  const ss = SpreadsheetApp.openById(ID_sheet);
  const sheet = ss.getSheetByName(TAB_NAME);

  const lastRowIndex = sheet.getLastRow();
  if (lastRowIndex < 2) {
    Logger.log('Nenhuma resposta encontrada para processar.');
    return;
  }

  const lastColumnIndex = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumnIndex).getValues()[0];

  // --- Mapping headers ---
  const colIndexes = {};
  headers.forEach((header, index) => {
    colIndexes[header.trim()] = index;
  });

  let columnStatusIndex = headers.indexOf('Status');
  if (columnStatusIndex === -1) {
    Logger.log("Erro: coluna 'Status' não encontrada");
    return;
  }

  // --- Getting only response data ---
  const data = sheet.getRange(2, 1, lastRowIndex - 1, lastColumnIndex).getValues();

  const rowsToProcess = [];

  for (let i = 0; i < data.length; i++) {
    const actualRow = data[i];
    const actualStatus = actualRow[columnStatusIndex];
    // Adding a fallback for 'Tentativas' in case it doesn't exist
    const currentAttempts = actualRow[colIndexes['Tentativas']] !== undefined ? actualRow[colIndexes['Tentativas']] : 0;

    if (actualStatus === 'Confirmado' || (actualStatus && actualStatus.includes('Falha') && currentAttempts < 3)) { // Set limits later
      const rowNumberinSheet = i + 2;

      rowsToProcess.push({
        rowNumber: rowNumberinSheet,
        rowData: actualRow
      });
    }
  }

  // --- Processing rows ---
  if (rowsToProcess.length > 0) {
    const rowNumbers = rowsToProcess.map(row => row.rowNumber);
    Logger.log(`Encontradas (${rowsToProcess.length}) linhas (${rowNumbers.join(', ')}) com status 'Confirmado' ou 'Falha'.`);

    rowsToProcess.forEach(rowInfo => {
      const rowData = rowInfo.rowData;
      const rowNumberinSheet = rowInfo.rowNumber;
      const currentAttempts = rowData[colIndexes['Tentativas']] || 0;

      // --- Preparing data for the request ---
      const formData = {
        nameEnt: rowData[colIndexes['Entidade que está solicitando']],
        answerEmail: rowData[colIndexes['Endereço de e-mail']],
        eventName: rowData[colIndexes['Nome do evento']],
        eventType: rowData[colIndexes['Tipo do evento']],
        eventOwnerName: rowData[colIndexes['Nome completo do responsável']],
        eventOwnerEmail: rowData[colIndexes['E-mail do responsável']],
        eventOwnerPhone: rowData[colIndexes['Telefone do responsável']] + '',
        eventDate: rowData[colIndexes['Data']],
        eventStartTime: rowData[colIndexes['Horário de início (entre 11h e 18h30)']],
        eventEndTime: rowData[colIndexes['Horário do fim (entre 11h e 18h30)']],
        guestCount: rowData[colIndexes['Quantidade estimada de pessoas']] + '',
        publicEvent: (rowData[colIndexes['Público USP?']] === 'Sim'),
        publicExtEvent: (rowData[colIndexes['Público Externo?']] === 'Sim'),
        food: (rowData[colIndexes['Vai ter alimentação?']] === 'Sim'),
        buffetType: (rowData[colIndexes['Tipo de alimentação']] || ''),
        buffetName: (rowData[colIndexes['Nome do Buffet']] || ''),
        buffetResponsible: (rowData[colIndexes['Nome do responsável pelo buffet']] || ''),
        buffetResponsibleEmail: (rowData[colIndexes['E-mail do responsável pelo buffet']] || ''),
        buffetResponsiblePhone: (rowData[colIndexes['Telefone do responsável pelo buffet']] + '' || ''),
        divulgation: (rowData[colIndexes['Divulgar no Semana da FEA? ']] === 'Sim'),
        justification: (rowData[colIndexes['Se NÃO, por quê?']] || ''),
        additionalRequests: (rowData[colIndexes['Recursos adicionais']] || ''),
        docFile: (rowData[colIndexes['Fazer upload de Ofício']] || ''),
        observations: (rowData[colIndexes['Observações']] || ''),
        spacesName: rowData[colIndexes['Espaço solicitado']]
      };

      // Fixing the date
      const DATEOBJ = new Date(formData.eventDate);
      const eventDate = Utilities.formatDate(DATEOBJ, 'GMT-3', 'dd-MM-yyyy');

      // Extracting the file ID
      const driveFileUrlOrId = formData.docFile;
      let driveFileId = '';
      let fileBlob = '';
      if (driveFileUrlOrId) {
        driveFileId = extractDriveFileId(driveFileUrlOrId);
        if (!driveFileId) {
          Logger.log(`Erro: Não foi possível extrair o ID do arquivo da URL/ID: ${driveFileUrlOrId}`);
          sheet.getRange(rowNumberinSheet, colIndexes['Status'] + 1).setValue('Falha - URL Arquivo Inválida');
          sheet.getRange(rowNumberinSheet, colIndexes['Tentativas'] + 1).setValue(currentAttempts + 1);
          return;
        }

        try {
          fileBlob = DriveApp.getFileById(driveFileId).getBlob();
        } catch (e) {
          Logger.log(`Erro ao obter arquivo do Drive ID ${driveFileId}: ${e.message}`);
          sheet.getRange(rowNumberinSheet, colIndexes['Status'] + 1).setValue('Falha - Arquivo Ausente');
          sheet.getRange(rowNumberinSheet, colIndexes['Tentativas'] + 1).setValue(currentAttempts + 1);
          return;
        }
      } else {
        Logger.log(`Nenhum arquivo de ofício reconhecido para a linha ${rowNumberinSheet}`);
      }

      // --- API Request ---
      const apiResponse = sendFiletoRenderApi(RENDER_API_URL, API_KEY, formData, fileBlob);

      let statusMessage = apiResponse.message;
      let driveFileLink = '';

      if (apiResponse.status === 'success') {
        if (apiResponse.pdf_base64){
          try {
            const pdfBlob = Utilities.newBlob(Utilities.base64Decode(apiResponse.pdf_base64), 'application/pdf', `Reserva_${formData.eventName}_${eventDate}_${formData.nameEnt}`);

            const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
            const uploadedFile = folder.createFile(pdfBlob);

            statusMessage = "Sucesso";
            driveFileLink = uploadedFile.getUrl();
            Logger.log(`Arquivo de confirmação '${uploadedFile.getName()}' salvo!`);

          } catch (e) {
            statusMessage = `Falha - Erro ao processar o PDF: ${e.message}`;
            Logger.log(statusMessage);
          }
        }
        sendSuccessEmail(formData, driveFileLink);
      } else {
        statusMessage = `Falha - API: ${apiResponse.message}`;
        Logger.log(statusMessage);

        if (apiResponse.detail.screenshot_base64) {
          try {
            const screenshotBlob = Utilities.newBlob(Utilities.base64Decode(apiResponse.detail.screenshot_base64), 'image/png', `Erro_${formData.eventName}_${eventDate}_${formData.nameEnt}.png`);
            const folder = DriveAPP.getFolderById('1bIwPhyr5DESvy_8K-hSx9aEKa-2K4HdU');
            const uploaded_file = folder.createFile(screenshotBlob)
            screenshotDriveLink = uploadedFile.getUrl();
            Logger.log(`Screenshot de erro salva no Google Drive: ${screenshotDriveLink}`);
          }
          catch(e) {
            Logger.log(`Erro ao salvar screenshot no Google Drive: ${screenshotDriveLink}`);
          }
        }
        sendErrorEmail(formData, statusMessage, screenshotDriveLink);
      }

      // --- Update status in spreadsheet ---
      sheet.getRange(rowNumberinSheet, colIndexes['Status'] + 1).setValue(statusMessage);
      sheet.getRange(rowNumberinSheet, colIndexes['Link do formulário'] + 1).setValue(driveFileLink);
      sheet.getRange(rowNumberinSheet, colIndexes['Tentativas'] + 1).setValue(currentAttempts + 1);
    });

    SpreadsheetApp.flush();
  } else {
    Logger.log('Nenhuma linha com status "Confirmado" ou "Falha" para processar.');
  }
}

  function sendSuccessEmail(formData, pdfLink) {
    const subject = `Confirmação de Reserva de Sala: ${formData.eventName}`;
    const htmlBodyClient = `
      <html>
        <body>
          <p>Olá, ${formData.nameEnt},</p>
          <p>Sua solicitação de reserva para o evento "${formData.eventName}" foi processada com sucesso!</p>
          <p>Acesse o link abaixo para visualizar o status:</p>
          <p><a href="${pdfLink}">${pdfLink}</a></p>
          <p>Atenciosamente,</p>
          <p>Equipe CAVC</p>
        </body>
      </html>
    `;
    const htmlBodyResponsible = `
    <html>
      <body>
        <p>Olá,</p>
        <p>A reserva para o evento "${formData.eventName}" foi concluída com sucesso. O PDF de confirmação está disponível no link:</p>
        <p><a href="${pdfLink}">${pdfLink}</a></p>
      </body>
    </html>
  `;

    try{ 
      if (formData.answerEmail && formData.answerEmail.includes('@')){
        MailApp.sendEmail({
          to: formData.answerEmail,
          subject: subject,
          htmlBody: htmlBodyClient,
        });
        Logger.log(`E-mail de confirmação enviado para o cliente: ${formData.answerEmail}_${formData.nameEnt}`);
      } else {
        Logger.log("E-mail do cliente não encontrado ou inválido. Não foi possível enviar e-mai de confirmação.");
      }

      MailApp.sendEmail({
        to: EMAILRESP,
        subject: subject,
        htmlBody: htmlBodyResponsible,
      });
      Logger.log(`E-mail de notificação enviado para o responsável: ${formData.eventOwnerEmail}`);
  } catch (e) {
    Logger.log('Erro ao enviar e-mail de sucesso: ' + e.message);
  }
}

function sendErrorEmail(formData, errorMessage, screenshotLink) {
  const subject = `Falha na Reserva de Sala: ${formData.eventName}`;
  const htmlBody = `
    <html>
      <body>
        <p>Olá, responsável,</p>
        <p>Ocorreu uma falha ao tentar processar a reserva para o evento "${formData.eventName}".</p>
        <p>Detalhes do erro:</p>
        <p>${errorMessage}</p>
        ${screenshotLink ? `<p>Segue um link para a captura de tela do erro:</p><p><a href="${screenshotLink}">${screenshotLink}</a></p>` : ''}
        <p>Por favor, verifique a solicitação e o status na planilha.</p>
        <p>Atenciosamente,</p>
        <p>VISCO :)</p>
      </body>
    </html>
  `;

  try {
    MailApp.sendEmail({
      to: EMAILRESP,
      subject: subject,
      htmlBody: htmlBody,
    });
    Logger.log(`E-mail de erro enviado`);
  } catch(e) {
    Logger.log(`Erro ao enviar e-mail de erro: ${e.message}`)
  }

}

function extractDriveFileId(urlOrId) {
  // --- Regex to capture the ID ---
  if (!urlOrId) {
    return '';
  }

  const regex = /(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/;
  const match = urlOrId.match(regex);

  if (match && match[1]) {
    return match[1];
  } else if (urlOrId.length > 20 && !urlOrId.includes('/')) {
    return urlOrId;
  }
  return '';
}

function sendFiletoRenderApi(url, apiKey, formData, fileBlob) {
  const options = {
    method: 'post',
    headers: {
      'X-API-Key': apiKey,
    },
    payload: {
      'data': JSON.stringify(formData),
      'uploaded_file': fileBlob
    },
    muteHttpExceptions: true,
    timeout: 60
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    Logger.log(`Status da Render API: ${responseCode}, corpo: ${responseBody.substring(0, 200)}...`);

    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(responseBody);
    } else {
      try {
        const errorJson = JSON.parse(responseBody);
        return { status: "failed", message: `Erro da API ${responseCode}: ${errorJson.detail || responseBody}` };
      } catch (e) {
        return { status: "failed", message: `Erro da API ${responseCode}: ${responseBody}` };
      }
    }
  } catch (e) {
    // Network errors, timeout, etc.
    Logger.log(`Erro crítico no UrlFetchApp: ${e.message}`);
    return { status: "failed", message: `Erro de Rede/Timeout: ${e.message}` };
  }
}

