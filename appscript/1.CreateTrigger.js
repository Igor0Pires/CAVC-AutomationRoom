function createFormSubmitTrigger() {
  // --- Execute first ---
  const ID = PropertiesService.getScriptProperties().getProperty('ID_SHEET_CONTROL');
  const SHEET = SpreadsheetApp.openById(ID);

  // Check if the trigger already exists
  const triggers = ScriptApp.getUserTriggers(SHEET);
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getEventType() == ScriptApp.EventType.ON_FORM_SUBMIT && triggers[i].getHandlerFunction() == 'onFormSubmit') {
      Logger.log('Gatilho onFormSubmit já existe.');
      return;
    }
  }

  // Creating the trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SHEET)
    .onFormSubmit()
    .create();

  Logger.log('Gatilho de envio de formulário criado com sucesso para a planilha!');
}