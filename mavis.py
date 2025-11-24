import os
import uuid
from fastapi import FastAPI, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from langchain_core.messages import message_to_dict
from llmloader import LLMLoader
from pydantic import BaseModel
from database import Database
from typing import List

welcome_prompt = (
    "Hi there! 👋\n"
    "I'm MAVIS – your **Multi-tasking AI Virtual Intelligent Solution**. Think of me as your personal AI assistant, "
    "Ready to help with anything you need! 💡🤖\n\n"
    "How can I assist you today?"
)

class Model(BaseModel):
    provider: str
    name: str
    censored: bool

db = Database()
models = db.load_models()

llm = LLMLoader(models=models, chat_uuid=None)
mavis = FastAPI()

html_file_path = './public/index.html'
mavis.mount("/public", StaticFiles(directory="public"), name="public")

class WorkflowSelection(BaseModel):
    workflow_id: str

class WorkflowCreate(BaseModel):
    name: str

class MoveModelRequest(BaseModel):
    from_index: int
    to_index: int

def read_html_file():
    with open(html_file_path, 'r', encoding='utf-8') as file:
        return file.read()

def format_chat_history(chat_history):
    history_html = ""
    for message in chat_history:
        if message.type == "human":
            history_html += f'<div class="user-message"><p>{message.content}</p></div>'
        elif message.type == "ai":
            history_html += f'<div class="ai-message"><p>{message.content}</p></div>'
    return history_html

@mavis.on_event("startup")
async def startup():
    workflows = db.get_all_workflows()
    if workflows:
        last_workflow = workflows[-1]
        workflow_id = last_workflow['uuid']
        llm.set_chat_uuid(workflow_id)
        print(f"Started with the last workflow: {workflow_id}")
    else:
        print("No previous workflows found. Starting a new one.")

@mavis.get("/", response_class=HTMLResponse)
async def chat_page():
    html_content = read_html_file()
    return HTMLResponse(content=html_content)

@mavis.post("/chat", response_class=HTMLResponse)
async def chat(user_input: str = Form(...)):
    response = await llm.generate_response(user_input)
    return response

@mavis.get("/workflows", response_class=JSONResponse)
async def get_workflows():
    workflows = db.get_all_workflows()
    return JSONResponse(content=workflows)

@mavis.post("/workflows", response_class=JSONResponse)
async def create_workflow(workflow: WorkflowCreate):
    workflow_uuid = str(uuid.uuid4())
    db.create_workflow(uuid=workflow_uuid, name=workflow.name)
    llm.load_history(uuid=workflow_uuid)
    llm.insert_history(workflow_uuid, welcome_prompt)
    return JSONResponse(content={"uuid": workflow_uuid, "name": workflow.name})

@mavis.post("/workflow", response_class=JSONResponse)
async def select_workflow(workflow: WorkflowSelection):
    workflow_id = workflow.workflow_id
    workflow_data = db.get_workflow(workflow_id)
    if not workflow_data:
        raise HTTPException(status_code=404, detail="Workflow not found")
    llm.set_chat_uuid(workflow_id)
    return JSONResponse(content={"message": f"Workflow {workflow_id} selected successfully"})

@mavis.delete("/workflows/{uuid}", response_class=JSONResponse)
async def delete_workflow(uuid: str):
    workflow_data = db.get_workflow(uuid)
    if not workflow_data:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete_workflow(uuid)
    return JSONResponse(content={"message": f"Workflow {uuid} deleted successfully"})

@mavis.get("/history/{workflow_id}", response_class=JSONResponse)
async def get_chat_history(workflow_id: str):
    chat_history = llm.load_history(workflow_id)
    if not chat_history:
        raise HTTPException(status_code=404, detail="No history found for this workflow")
    return JSONResponse(content=[message_to_dict(msg) for msg in chat_history])

@mavis.get("/models", response_model=List[Model])
def get_models():
    return models

@mavis.post("/models", response_model=Model)
def add_model(model: Model):
    model_id = db.save_model(provider=model.provider, name=model.name, censored=model.censored)
    global models
    models = db.load_models()
    llm.models = models
    return model

@mavis.delete("/models/{name}")
def delete_model(name: str):
    db.delete_model(name)
    global models
    models = db.load_models()
    llm.models = models
    return {"message": "Model deleted"}

@mavis.post("/models/move")
def move_model(request: MoveModelRequest):
    print(request)
    from_index = request.from_index
    to_index = request.to_index
    if from_index < 0 or from_index >= len(models) or to_index < 0 or to_index >= len(models):
        raise HTTPException(status_code=400, detail="Invalid indices")
    model = models.pop(from_index)
    models.insert(to_index, model)
    db.update_model_order(models)
    llm.models = models
    return {"message": "Model moved"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(mavis, host="0.0.0.0", port=8000)