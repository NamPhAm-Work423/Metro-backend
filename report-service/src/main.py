import uvicorn
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3001"))
    reload = os.getenv("NODE_ENV") == "development"
    
    # Run the application
    uvicorn.run(
        "src.app:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info" if os.getenv("NODE_ENV") != "development" else "debug"
    ) 