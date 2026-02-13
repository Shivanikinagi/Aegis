import asyncio
import structlog
from aiohttp import web

from api import APIServer
from coordinator import CoordinatorAgent
from config import api_config

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

async def start_background_agent(app):
    """
    Lifecycle hook: Start the agent loop in the background
    when the API server starts.
    """
    agent = app['agent_instance']
    logger.info("Starting background agent loop")
    
    # Run agent.start() as a non-blocking background task
    # This allows the API to keep responding while the agent works
    app['agent_task'] = asyncio.create_task(agent.start())

async def cleanup_background_agent(app):
    """
    Lifecycle hook: Gracefully stop the agent
    when the API server shuts down.
    """
    logger.info("Stopping background agent loop")
    agent = app['agent_instance']
    
    # Signal the agent to stop
    agent.stop()
    
    # Wait for the loop to exit
    if 'agent_task' in app:
        try:
            await app['agent_task']
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Error during agent shutdown", error=str(e))

def main():
    print("""
    ===============================================================
        AUTONOMOUS TREASURY AGENT - UNIFIED SYSTEM
    
       - API Server: Running on Port 8000
       - Agent Coordinator: Active & Autonomously Thinking
       - Blockchain: Connected
    ===============================================================
    """)
    print("[DEBUG] Step 1: Starting initialization...")

    # 1. Initialize the Autonomous Agent
    agent = CoordinatorAgent()
    print("[DEBUG] Step 2: CoordinatorAgent created")
    
    # 2. Initialize the API Server, injecting the agent
    # This allows the API to report the agent's real status
    server = APIServer(agent=agent)
    print("[DEBUG] Step 3: APIServer created")
    
    # 3. Register Startup/Shutdown Hooks
    # Store agent reference in the app so hooks can access it
    server.app['agent_instance'] = agent
    # TEMPORARILY DISABLED FOR DEBUGGING
    # server.app.on_startup.append(start_background_agent)
    # server.app.on_cleanup.append(cleanup_background_agent)
    print("[DEBUG] Step 4: Startup hooks SKIPPED for testing")
    
    # 4. Run the Application
    logger.info("Initializing System...", host=api_config.host, port=api_config.port)
    print(f"[DEBUG] Step 5: About to call web.run_app on {api_config.host}:{api_config.port}...")
    
    try:
        web.run_app(server.app, host=api_config.host, port=api_config.port)
        print("[DEBUG] Step 6: web.run_app completed")
    except Exception as e:
        print(f"[DEBUG] ERROR in web.run_app: {e}")
        logger.error("System crash", error=str(e))

if __name__ == "__main__":
    import sys
    sys.stdout.write("="*80 + "\n")
    sys.stdout.write("MAIN.PY STARTING EXECUTION\n")
    sys.stdout.write("="*80 + "\n")
    sys.stdout.flush()
    main()

