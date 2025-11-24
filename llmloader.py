import os
import sys
import asyncio
import uuid
from llm import LLM
from database import Database
from dotenv import load_dotenv
from embeddings import Embeddings
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_community.chat_message_histories import ChatMessageHistory

class LLMLoader:
    def __init__(self, openai_api_key=None, flagged_cb=None, models=None, chat_uuid=None):
        if not openai_api_key:
            load_dotenv()
            openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_api_key = openai_api_key
        
        self.database = Database()
        self.chat_uuid = chat_uuid
        self.models = models or [
            {"name": "gpt-4o-mini", "provider": "openai", "censored": True},
        ]
        self.llms = [
            LLM(model_name=model["name"], provider=model["provider"], api_key=self.openai_api_key, chat_uuid=self.chat_uuid)
            for model in self.models
        ]
        self.embeddings = Embeddings(openai_api_key)
        self.flagged_cb = flagged_cb
        self.history = self.load_history()

    def load_history(self, uuid=None):
        if uuid == None:
            uuid = self.chat_uuid
        self.history = self.database.load_history(uuid)
        history = ChatMessageHistory(messages=self.history)
        for llm in self.llms:
            llm.setup_conversation_chain(history, self.openai_api_key)
        return self.history

    def insert_history(self, uuid=None, message=""):
        if uuid == None:
            uuid = self.chat_uuid
        self.history.append(AIMessage(message))
        self.database.save_history(uuid, self.history)
        history = ChatMessageHistory(messages=self.history)
        for llm in self.llms:
            llm.setup_conversation_chain(history, self.openai_api_key)

    def set_chat_uuid(self, chat_uuid: str):
        self.chat_uuid = chat_uuid
        for llm in self.llms:
            llm.chat_uuid = chat_uuid
        self.load_history()
        print(f"Chat UUID updated to: {chat_uuid}")

    def set_model(self, index: int, model_name: str, provider: str, censored: bool):
        if index < 0 or index >= len(self.models):
            raise ValueError("Invalid model index")
        
        self.models[index] = {"name": model_name, "provider": provider, "censored": censored}
        self.llms[index].set_model(model_name, provider, api_key=self.openai_api_key if provider == "openai" else None)
        print(f"Model at index {index} updated: {self.models[index]}")

    async def generate_response(self, user_message: str, flagged=False, filter=False, model_index=None):
        try:
            self.history.append(HumanMessage(content=user_message))
            message = [
                *self.history
            ]
            if model_index is not None:
                if model_index < 0 or model_index >= len(self.llms):
                    raise ValueError("Invalid model index")
                selected_llm = self.llms[model_index]
                print(f"Using model at index {model_index}: {self.models[model_index]['name']}")
            else:
                if not filter and (flagged or self.embeddings.check_flagged_content(user_message)):
                    selected_llm = next((llm for llm, model in zip(self.llms, self.models) if not model["censored"]), None)
                    print(f"⚠️ - Using uncensored model {selected_llm.provider}:{selected_llm.model_name}")
                else:
                    selected_llm = next((llm for llm, model in zip(self.llms, self.models) if model["censored"]), None)
                    print(f"✅ - Using censored model {selected_llm.provider}:{selected_llm.model_name}")

                if not selected_llm:
                    raise ValueError("No suitable model found")
            response = await selected_llm.generate_response_with_context(message)
            self.history.append(response)
            self.database.save_history(self.chat_uuid, self.history)
            return response.content
        except Exception as e:
            print(f"Error generating response: {e}")
            return "Sorry, I encountered an error processing your request."

async def interactive_session(models):
    chat_uuid = str(uuid.uuid4())
    llm_loader = LLMLoader(models=models, chat_uuid=chat_uuid)
    print(f"\nStarting chat (type 'exit' to quit)\n")
    print(f"Chat UUID: {chat_uuid}\n")
    
    try:
        while True:
            user_input = input("You: ")
            if user_input.lower() in ('exit', 'quit'):
                break
            
            response = await llm_loader.generate_response(user_input)
            print(f"\nAI: {response}\n")
    except KeyboardInterrupt:
        print("\nSession interrupted")
    finally:
        print("\nChat session ended")

def main():
    models = [
        {"name": "gpt-4o-mini", "provider": "openai", "censored": True},
    ]
    
    asyncio.run(interactive_session(models))

if __name__ == "__main__":
    main()