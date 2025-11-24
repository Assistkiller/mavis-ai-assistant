import os
import asyncio
import uuid
import subprocess

from langchain_openai import ChatOpenAI
from langchain_community.llms import Ollama
from dotenv import load_dotenv
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

class LLM:
    def __init__(self, model_name: str, chat_uuid: str, provider: str = "ollama", api_key: str = None, message_history = []):
        self.model_name = model_name
        self.provider = provider.lower()
        self.chat_uuid = chat_uuid
        load_dotenv()

        self.host = os.getenv("OLLAMA_HOST", "localhost")
        self.port = os.getenv("OLLAMA_PORT", "11434")

        self.setup_conversation_chain(message_history, api_key)

    def setup_conversation_chain(self, history, api_key=None):
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant."),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])

        if self.provider == "openai":
            if not api_key:
                api_key = os.getenv("OPENAI_API_KEY")
            self.llm = ChatOpenAI(model=self.model_name, api_key=api_key)
        elif self.provider == "ollama":
            self.pull_ollama_model(self.model_name)
            self.llm = Ollama(model=self.model_name, base_url=f"http://{self.host}:{self.port}")
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

        self.conversation = RunnableWithMessageHistory(
            prompt | self.llm,
            lambda session_id: history,
            input_messages_key="input",
            history_messages_key="history",
        )

    def set_model(self, model_name: str, provider: str = None, api_key: str = None):
        self.model_name = model_name
        if provider:
            self.provider = provider.lower()
        self.setup_conversation_chain(self.conversation.history, api_key)

    @staticmethod
    def handle_response(response):
        if hasattr(response, "content"):
            return response.content
        elif isinstance(response, str):
            return response
        else:
            raise Exception("Invalid response format")

    async def generate_response_with_context(self, messages):
        try:
            response = await self.conversation.ainvoke(
                {"input": messages[-1].content},
                config={"configurable": {"session_id": self.chat_uuid}}
            )
            response_content = self.handle_response(response)
            return AIMessage(content=response_content)
        except Exception as e:
            print(f"Error generating response: {e}")
            return AIMessage(content="Sorry, I encountered an error processing your request.")
    
    def pull_ollama_model(self, model_name: str):
        print(f"Checking availability of Ollama model: {model_name}")
        command = f'curl -X POST http://{self.host}:{self.port}/api/pull -d \'{{"model": "{model_name}"}}\''
        try:
            subprocess.run(command, shell=True, check=True)
            print(f"✅ Successfully pulled Ollama model: {model_name}")
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Failed to pull model {model_name}: {e}")

async def main():
    chat_uuid = str(uuid.uuid4()) 
    llm = LLM(
        model_name="gpt-3.5-turbo",
        provider="openai",
        chat_uuid=chat_uuid
    )

    response = await llm.generate_response_with_context("Hello, my name is Regis. How are you?")
    print("AI Response:", response)

    response = await llm.generate_response_with_context("What's your name?")
    print("AI Response:", response)
    
    response = await llm.generate_response_with_context("What's my name?")
    print("AI Response:", response)

    llm.set_model("gpt-4o-mini", provider="openai")
    response = await llm.generate_response_with_context("What's my name?")
    print("AI Response (after model change):", response)

if __name__ == "__main__":
    asyncio.run(main())