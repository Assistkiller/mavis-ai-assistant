import os
from openai import OpenAI

class Embeddings:
    
    def __init__(self, openai_api_key=None):
        if openai_api_key is None:
            openai_api_key = os.environ['OPENAI_API_KEY']
        self.client = OpenAI(api_key=openai_api_key)

    def check_flagged_content(self, text: str) -> bool:
        try:
            response = self.client.moderations.create(
                model="omni-moderation-latest",
                input=text,
            )
            return response.results[0].flagged
        except Exception as e:
            print(f"Error in content moderation: {e}")
            pass

        return True

if __name__ == "__main__":
    embeddings = Embeddings()
    print(embeddings.check_flagged_content("Vou te estuprar sua puta"))
    print(embeddings.check_flagged_content("Voce é muito linda"))
