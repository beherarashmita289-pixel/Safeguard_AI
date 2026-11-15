import os
import re
from urllib.parse import quote_plus
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
print("MONGO_URI loaded:", "YES" if MONGO_URI else "NO")

# Password me @ ho to auto-fix
def fix_uri(uri):
    try:
        # mongodb+srv://user:password@cluster... 
        # Last wale @ se pehle wala sab password hai
        m = re.match(r"(mongodb\+srv://[^:]+:)(.+)(@cluster.+)", uri)
        if m:
            prefix = m.group(1)
            password = m.group(2)
            suffix = m.group(3)
            if "%" not in password:
                password = quote_plus(password)
            return f"{prefix}{password}{suffix}"
        return uri
    except:
        return uri

MONGO_URI = fix_uri(MONGO_URI)

client = None
db = None
try:
    if MONGO_URI:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client["safeguard_ai"]
except Exception as e:
    print(f"Mongo warning: {e}")

def test_connection():
    try:
        if client is not None:
            client.admin.command('ping')
            print("MongoDB Connected Successfully!")
        else:
            print("MongoDB client not created")
    except Exception as e:
        print(f"MongoDB Connection Failed: {e}")

def get_db():
    return db