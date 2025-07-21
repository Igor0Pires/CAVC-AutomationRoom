from fastapi import FastAPI
from pydantic import BaseModel
from playwright.async_api import async_playwright
import asyncio

app = FastAPI()

class FormData(BaseModel):
    name: str
    email: str
    message: str

@app.post("/action")
async def execute_script(data: FormData):
    async with async_playwright() as p:
        # Conectando ao navegador
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.set_default_timeout(60000) 

        try:
            # Tentar aguardar apenas até o DOM estar carregado
            await page.goto('https://www.fea.usp.br/', wait_until='domcontentloaded')
            print("Página carregada com sucesso!")
            
            await page.wait_for_timeout(3000)

            # Ação: ---//----//----

            login_button = page.locator('.menu-7140.menu-path-user-login.even.last')
            await login_button.click()
            print("Botão de login clicado!")

            # Aguardar a página carregar após o clique
            await page.wait_for_timeout(2000)
            
            # Obter o título da página
            result = await page.evaluate('() => document.title')
            print(f'O título da página é: {result}')
            
        except Exception as e:
            print(f"Erro durante a execução: {e}")

            # Mesmo com erro, vou tentar obter informações da página
            try:
                result = await page.evaluate('() => document.title')
                print(f'Título da página (com erro): {result}')
                
                url_atual = page.url
                print(f'URL atual: {url_atual}')
            except:
                print("Não foi possível obter informações da página")
        
        finally:
            await browser.close()
        return {"result": result,"message": "Script executado com sucesso!", "name": data.name, "email": data.email, "message": data.message}

if __name__ == "__main__":
    import uvicorn  
    uvicorn.run(app)

