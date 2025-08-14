function getStatus() {
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('ID_SHEET_STATUS');
  const SHEET_NAME = 'Status';

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  const renderUrl = PropertiesService.getScriptProperties().getProperty('RENDER_API_URL') + '/table';

  apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY_SECRET');

  if (!sheet) {
    Logger.log(`Planilha não encontrada!`)
    return;
  }

  try {
    const options = {
      'method': 'get',
      'headers': {
        'X-API-Key': apiKey
      }
    };

    Logger.log('Fazendo Requisição...')
    const response = UrlFetchApp.fetch(renderUrl, options);
    const apiData = JSON.parse(response.getContentText());

    if (!apiData || apiData.length === 0) {
      Logger.log('API retornou uma resposta vazia.');
      return;
    }

    const newData = apiData.map(register => [
      register['Código'],
      register['Nome'],
      register['Responsável'],
      register['Qtd. Pessoas'],
      register['Início'],
      register['Término'],
      register['Status']
    ]);

    if (sheet.getLastRow() >= 2) {
      const cleanRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
      cleanRange.clearContent();
    }

    const addRange = sheet.getRange(2, 1, newData.length, newData[0].length);
    addRange.setValues(newData);

    Logger.log(`Processo atualizado!`)
  } catch (e) {
    Logger.log(`Erro crítico ao atualizar a planilha: ${e.message}`);
}
} 
