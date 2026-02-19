from pymongo import MongoClient
import os

# Connection string
uri = "mongodb+srv://flyer:Flyer123@blackricemongo.t7k7zg3.mongodb.net/blackrice?retryWrites=true&w=majority"
client = MongoClient(uri)
db = client.blackrice
collection = db.analysisResults

# Find the game
# User said filename starts with "fly-NIS"
#game = collection.find_one({"sgf.filename": {"$regex": "^fly-NIS"}}, sort=[("metadata.createdAt", -1)])
game = collection.find_one({"sgf.filename": "flyer-NISHIDA-2026-02-14.sgf"})

if not game:
    print("No game found starting with 'fly-NIS'")
    # Try listing a few games to see what's there
    print("\nRecent games:")
    for g in collection.find().sort("metadata.createdAt", -1).limit(5):
        print(f"ID: {g.get('sgf', {}).get('hash')}, Filename: {g.get('sgf', {}).get('filename')}")
else:
    print(f"Found game: {game['sgf']['filename']}")
    print(f"Hash: {game['sgf']['hash']}")
    print("-" * 50)
    print(f"{'Move':<5} {'Color':<6} {'WinRate':<10}")
    print("-" * 50)
    
    results = game.get('analysisResults', [])
    for r in results:
        move_num = r.get('moveNumber')
        color = r.get('move', {}).get('color')
        winrate = r.get('analysis', {}).get('winRate')
        print(f"{move_num:<5} {color:<6} {winrate:<10}")

client.close()
