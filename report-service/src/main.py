import uvicorn
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8007"))
    reload = os.getenv("RELOAD", "false").strip().lower() in ("1", "true", "yes", "on")
    
    # Run the application
    uvicorn.run(
        "src.app:app",
        host=host,
        port=port,
        reload=reload,
        reload_excludes=["logs/*", "reports/*", "src/logs/*"],
        log_level="debug" if reload or os.getenv("NODE_ENV") == "development" else "info"
    )