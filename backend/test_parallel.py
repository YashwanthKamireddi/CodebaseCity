import asyncio
from parsing.analyzer import CodebaseAnalyzer

async def test():
    analyzer = CodebaseAnalyzer()
    city = await analyzer.analyze("/home/yash/Projects/Code_City/backend", max_files=100)
    print(f"Parsed {city.stats.get('total_files')} files successfully.")

if __name__ == "__main__":
    asyncio.run(test())
