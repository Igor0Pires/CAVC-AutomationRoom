from fastapi import FastAPI, HTTPException, status, Depends, Response, Form, UploadFile, File
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from playwright.async_api import async_playwright, FilePayload
import os
import asyncio
from datetime import datetime
import json
import base64


# Charging environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

# Environment variables
API_KEY_SECRET = os.getenv("API_KEY_SECRET")
LOGIN = os.getenv("LOGIN")
PASS = os.getenv("PASS")

if API_KEY_SECRET is None:
    print("WARNING: API_KEY_SECRET is not set")
if LOGIN is None:
    print("WARNING: LOGIN is not set")
if PASS is None:
    print("WARNING: PASS is not set")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def get_api_key(api_key: str = Depends(api_key_header)):
    if api_key == API_KEY_SECRET:
        return api_key
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chave Inválida")

class FormData(BaseModel):
    nameEnt: str
    answerEmail: str
    eventName: str
    eventType: str
    eventOwnerName: str
    eventOwnerEmail: str
    eventOwnerPhone: str
    eventDate: str # esperando "YYYY-MM-DDTHH:MM:SS.sssZ" tanto em tempo quanto em data
    eventStartTime: str
    eventEndTime: str
    guestCount: str
    publicEvent: bool
    publicExtEvent: bool
    food: bool
    buffetType: str = None
    buffetName: str = None
    buffetResponsible: str = None
    buffetResponsibleEmail: str = None
    buffetResponsiblePhone: str = None
    divulgation: bool
    justification: str = None
    aboutEvent: str = None
    additionalRequests: str = None 
    observations: str = None
    datesEvent: str = None
    timeStartEvent: str = None
    timeEndEvent: str = None
    spacesName: str # Lembrar: Verificar antes se timestartEvent, timeEndEvent, spacesName, datesEvent tem o mesmo tamanho





# Run Scraping
@app.post("/action")
async def execute_script(
    data_json: str = Form(..., alias="data"),
    uploaded_file: UploadFile = File(None),
    api_key: str = Depends(get_api_key)
):
    import json
    try:
        data = FormData.model_validate_json(data_json)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail="Corpo 'data' não é um JSON válido")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro de validação dos dados {str(e)}")

    # Processing file
    file_content_bytes = None
    file_name = None
    file_mime_type = None

    if uploaded_file and uploaded_file.filename:
        file_content_bytes = await uploaded_file.read()
        file_name = uploaded_file.filename
        file_mime_type = uploaded_file.content_type
        print(f"Recebido arquivo: {file_name} ({file_mime_type}) com {len(file_content_bytes)} bytes")
    else:
        print("Nenhum arquivo enviado.")
    
    print(f"Dados do formulário: Nome  Evento={data.eventName}, Email Responsável={data.eventOwnerEmail}")
    
    result_message = "Automação finalizada."
    pdf_base64 = None
    browser = None

    async with async_playwright() as p:
        try:
            # Connecting to the browser
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            page.set_default_timeout(60000) 

            # Action: Access the login page
            await page.goto('https://www.fea.usp.br/user/login', wait_until='domcontentloaded')
            print("Página carregada com sucesso!")
            await page.wait_for_selector('#edit-name', timeout=20000)

            # Filling the login form
            await page.fill('#edit-name', LOGIN) 
            await page.fill('#edit-pass', PASS)
            await page.click('#edit-submit')
            
            await page.wait_for_selector('img')


            print("Login realizado com sucesso!")

            await page.goto('https://www.fea.usp.br/eventos/organizacao-de-eventos/nova-solicitacao')
            await page.wait_for_selector('#edit-cadastro-area-solicitante')

            # Filling the form
            namesEntList = os.getenv("NAMEENTLIST")

            eventTypeList = os.getenv("Congresso,Relato,Solenidade,Conferência/Palestra,Encontro/Fórum,Treinamento/Aula/Curso,Seminário,Prêmio,Reunião,Competição de Casos,Lançamento de Livro,Workshop/Oficina,Festival,Feira,Extensão,Outros")
            
            # 3 to 3
            # 1. --//--//--
            print("iniciando parte 1")
            if data.nameEnt not in namesEntList: # lembrar: de mudar o forms para um seletor ao inves de escrever
                await page.select_option('#edit-cadastro-area-solicitante', label="CAVC")
            else:
                await page.select_option('#edit-cadastro-area-solicitante', label=data.nameEnt)

            await page.fill('#edit-cadastro-nome-evento', data.eventName)
            
            await page.select_option('#edit-cadastro-tipo-evento', label=data.eventType, timeout=10000) # lembrar: de mudar o forms para um seletor (obs.: "outros" deve ser escrito como "outros", ie, sem necessidade de especificar o tipo do evento)

            print("parte 1 - Done")
            
            # 2. --//--//--
            print("iniciando parte 2")
            await page.fill('#edit-cadastro-responsavel-evento', data.eventOwnerName)
            await page.fill('#edit-cadastro-email-responsavel-evento', data.eventOwnerEmail)
            await page.fill('#edit-cadastro-telefone-responsavel-evento', data.eventOwnerPhone)

            print("parte 2 - Done")

            # 3. --//--//--
            print("iniciando parte 3")
            await page.fill('#edit-cadastro-responsavel-operacional', data.eventOwnerName) # lembrar: Perguntar se o responsável operacional é o mesmo que o responsável pelo evento
            await page.fill('#edit-cadastro-email-responsavel-operacional', data.eventOwnerEmail) 
            await page.fill('#edit-cadastro-telefone-responsavel-operacional', data.eventOwnerPhone)

            print("parte 3 - Done")

            # 4. --//--//--
            print("iniciando parte 4")
            # Formatting dates
            formatted_event_date = None
            formatted_start_time = None
            formatted_end_time = None

            if data.eventDate:
                try:
                    # Format the event date
                    formatted_event_date = datetime.fromisoformat(data.eventDate.replace('Z', '+00:00')).strftime("%d%m%Y")
                    
                    # Extract only the time part from start and end times (ignoring the date part)
                    start_time_obj = datetime.fromisoformat(data.eventStartTime.replace('Z', '+00:00'))
                    end_time_obj = datetime.fromisoformat(data.eventEndTime.replace('Z', '+00:00'))
                    
                    formatted_start_time = start_time_obj.strftime("%H%M")
                    formatted_end_time = end_time_obj.strftime("%H%M")
                except ValueError as e:
                    print(f"Erro ao formatar datas: {e}")
                    raise HTTPException(status_code=400, detail="Formato de data inválido. Use o formato ISO 8601 (YYYY-MM-DDTHH:MM:SSZ).")

            await page.fill('#data-inicio-evento', formatted_event_date) 
            await page.fill('#hora-inicio-evento', formatted_start_time)
            await page.fill('#data-fim-evento', formatted_event_date) # Lembrar: Perguntar Só para garantir, o fim do evento é o mesmo que o início
            await page.fill('#hora-fim-evento', formatted_end_time) 

            print("parte 4 - Done")

            # 5. --//--//--
            print("iniciando parte 5")
            await page.fill('#quantidade-pessoas', data.guestCount)

            if data.publicEvent: # Lembrar: Estamos Esperando um Booleano
                await page.click('#edit-cadastro-evento-aberto-usp-1')
            else:
                await page.click('#edit-cadastro-evento-aberto-usp-2')
            
            if data.publicExtEvent: # Lembrar: Denovo
                await page.click('#edit-cadastro-evento-aberto-publico-1')
            else:
                await page.click('#edit-cadastro-evento-aberto-publico-2')

            print("parte 5 - Done")

            # 6. --//--//--
            print("iniciando parte 6")
            if data.food: # Lembrar: Denovo
                await page.click('#edit-alimentacao-usar-buffet-1')

                buffetList = {
                    "Coffee Break": "#edit-alimentacao-tipo-buffet-1",
                    "Happy Hour": "#edit-alimentacao-tipo-buffet-2",
                    "Refeição": "#edit-alimentacao-tipo-buffet-3"
                }

                if data.buffetType and data.buffetType in buffetList:
                    await page.click(buffetList[data.buffetType])

                await page.fill('#edit-alimentacao-nome-buffet', data.buffetName or "")
                await page.fill('#edit-alimentacao-nome-respbuffet', data.buffetResponsible or "")
                await page.fill('#edit-alimentacao-fone-respbuffet', data.buffetResponsiblePhone or "")
                await page.fill('#edit-alimentacao-email-respbuffet', data.buffetResponsibleEmail or "")
            else:
                await page.click('#edit-alimentacao-usar-buffet-2')

            print("parte 6 - Done")

            # 7. --//--//--
            print("iniciando parte 7")
            if data.divulgation: # Lembrar: Denovo
                await page.click('#edit-divulgacao-divulga-semana-fea-1')
            else:
                await page.click('#edit-divulgacao-divulga-semana-fea-2')
                await page.fill('#edit-divulgacao-semana-nao-porque', data.justification)

            print("parte 7 - Done")
            # 8. --//--//--
            print("iniciando parte 8")
            if uploaded_file and file_content_bytes:
                file_input_selector_doc = '#edit-arquivo-resumo'
                try:
                    await page.wait_for_selector(file_input_selector_doc, state='attached', timeout=10000)
                    await page.locator(file_input_selector_doc).set_input_files([FilePayload(
                        name=file_name, mimeType=file_mime_type, buffer=file_content_bytes
                    )])
                    print(f"Arquivo {file_name} enviado com sucesso!")
                except Exception as file_upload_error:
                    print(f"Erro ao subir arquivo '{file_name}': {file_upload_error}")
                    raise HTTPException(status_code=500, detail=f"Erro ao subir arquivo: {file_upload_error}")
            else:
                print("Nenhum arquivo enviado ou arquivo inválido.")
            print("parte 8 - Done")


            # 9. --//--//--
            print("iniciando parte 9")
            spaceList = {
                "Auditório – FEA 5: 240 Lugares": "1",
                "Auditório Safra 1 – FEA 4: 125 Lugares": "2",
                "Auditório Safra 2 – FEA 4: 125 Lugares": "3",
                "Auditório Carlos e Diva Pinho – FEA 4: 121 Lugares": "4",
                "Congregação  ‐ FEA 1: 130 Lugares": "5",
                "Sala de Coquetel – FEA 1: 250 pessoas": "6",
                "Sala de Coquetel ‐ 4 andar do FEA 5 ‐ 250": "7",
                "Saguão ‐ FEA 1": "8",
                "Sala de aula": "9",
                "Outra": "10"
            }


            if data.datesEvent: # Lembrar: Esse é se o evento ocorrer em mais de uma sala (Revisar Lógica)
                datesEventList = data.datesEvent.split(',') # Lembrar: Exemplo de formato: "2023-10-01,2023-10-02"
                startTimes = data.timeStartEvent.split(',')
                endTimes = data.timeEndEvent.split(',')
                spacesNames = data.spacesName.split(',')
                observations_list = data.observations.split('|%|') # Lembrar: Separador de observações é "|%|"
                
                if not (len(datesEventList) == len(startTimes) == len(endTimes) == len(spacesNames)):
                    print("Aviso: O número de datas, horários de início, horários de fim e nomes de espaços não coincide.")
                    raise HTTPException(status_code=400, detail="O número de datas, horários de inicio e de fim não coincide. Verifique os dados enviados.")

                for i in range(len(datesEventList)):
                    # converting dates to the expected format
                    current_date_iso = datesEventList[i]
                    current_start_time_iso = startTimes[i]
                    current_end_time_iso = endTimes[i]

                    try:
                        dt_current_date = datetime.fromisoformat(current_date_iso.replace('Z', '+00:00')).strftime("%d%m%Y")
                        dt_current_start_time = datetime.fromisoformat(current_start_time_iso.replace('Z', '+00:00')).strftime("%H%M")
                        dt_current_end_time = datetime.fromisoformat(current_end_time_iso.replace('Z', '+00:00')).strftime("%H%M")
                    except (ValueError, AttributeError) as e:
                        print(f"Erro ao formatar data ou horário para o evneto múltiplo {i+1}: {e} usando valores originais")
                        raise HTTPException(status_code=400, detail="Formato de data ou horário inválido. Use o formato ISO 8601 (YYYY-MM-DDTHH:MM:SSZ).")


                    await page.fill(f'#solicitacao-espaco-data-{i+1}', dt_current_date)
                    await page.fill(f'#solicitacao-espaco-hora-inicio-{i+1}', dt_current_start_time)
                    await page.fill(f'#solicitacao-espaco-hora-fim-{i+1}', dt_current_end_time)

                    await page.select_option(f'#edit-solicitacao-espaco-{i+1}-espaco', label=spacesNames[i])

                    if i< len(observations_list): # Mudar essa lógica depois
                        await page.fill(f'textarea[id*="solicitacao-espaco-hora-fim-{i+1}"]', observations_list[i]) # Lembrar: Por estranho que pareça o id do observation é o mesmo que o do endTime

                    if i < len(datesEventList) - 1:
                        await asyncio.sleep(0.5)  # Espera para garantir que o preenchimento foi concluído
                        await page.click(f'#edit-add-espaco')
                        await page.wait_for_selector(f'#solicitacao-espaco-data-{i+2}')
                        print(f"Adicionado novo espaço para a data: {datesEventList[i+1]}")
            else:
                await page.fill('#solicitacao-espaco-data-1', formatted_event_date)
                await page.fill('#solicitacao-espaco-hora-inicio-1', formatted_start_time)
                await page.fill('#solicitacao-espaco-hora-fim-1', formatted_end_time)

                await page.select_option('#edit-solicitacao-espaco-1-espaco', value=spaceList[data.spacesName], timeout=10000)

                if data.observations:
                    await page.fill('textarea[id*="solicitacao-espaco-hora-fim-1"]', data.observations)

            print("parte 9 - Done")

        
            # 10. --//--//--
            print("iniciando parte 10")

            await page.click("#edit-termo-de-aceite")
            await asyncio.sleep(1)

            # --- APLICAR AÇÂO DE SUBMISSÂO AQUI ---
            print("parte 10 - Done")

            # Capturing the response
            pdf_buffer = await page.pdf(print_background=True)
            pdf_base64 = base64.b64encode(pdf_buffer).decode('utf-8')

            print("PDF da página final gerado com sucesso!")

            return {"status": "success", "message": result_message, "pdf_base64": pdf_base64}
        
        except Exception as e:
            print(f"Erro durante a execução: {e}")
            result_message = f"Erro durante a execução: {e.__class__.__name__} - {str(e)[:500]}"

            screenshot_base64 = None
            try:
                scr_bytes = await page.screenshot()
                screenshot_base64 = base64.b64encode(scr_bytes).decode('utf-8')
                print('Screenshot de erro capturada com sucesso.')
            except Exception as screenshot_error:
                print(f"Erro ao capturar screenshot: {screenshot_error}")
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail = {
                    "message": result_message,
                    "screenshot_base64": screenshot_base64
                }
            )
        finally:
            if browser:
                await browser.close()
                print("Navegador fechado com sucesso.")

@app.get("/table")
async def get_table(api_key: str = Depends(get_api_key)):
    """Faz o login, acessa a página de solicitações e extrai os dados da tabela."""
    browser = None
    async with async_playwright() as p:
        try:
            # Connecting to the browser
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            page.set_default_timeout(60000) 

            # Action: Access the login page
            await page.goto('https://www.fea.usp.br/user/login', wait_until='domcontentloaded')
            print("Página carregada com sucesso!")
            await page.wait_for_selector('#edit-name', timeout=20000)

            # Filling the login form
            await page.fill('#edit-name', LOGIN) 
            await page.fill('#edit-pass', PASS)
            await page.click('#edit-submit')
            
            await page.wait_for_selector('img')

            print("Login realizado com sucesso!")

            await page.goto('https://www.fea.usp.br/eventos/organizacao-de-eventos/solicitacao/listar/mine')
            await page.wait_for_selector('.table')

            print("Página de solicitações carregada com sucesso!")

            # Extracting table data
            table_data = []
            headers = [
                await header.inner_text()
                for header in await page.locator('.table thead th').all() if (await header.inner_text()).strip() != ""
            ]

            rows = await page.locator('.table tbody tr').all()
            for row in rows:
                cols = await row.locator('td').all()
                row_data = [await col.inner_text() for col in cols]
                row_dict = {
                    headers[i]: row_data[i] for i in range(len(headers))
                }
                table_data.append(row_dict)
            return table_data
        except Exception as e:
            print(f"Erro durante a execução: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail = f"Erro durante a execução: {e.__class__.__name__} - {str(e)[:500]}"
            )
        finally:
            if browser:
                await browser.close()
                print("Navegador fechado com sucesso.")

if __name__ == "__main__":
    import uvicorn  
    print(API_KEY_SECRET, LOGIN, PASS)
    uvicorn.run(app, host="0.0.0.0", port=8000)
    

