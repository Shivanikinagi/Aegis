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
    ╔═══════════════════════════════════════════════════════════╗
    ║   🤖 AUTONOMOUS TREASURY AGENT - UNIFIED SYSTEM 🤖        ║
    ║                                                           ║
    ║   • API Server: Running on Port 8000                      ║
    ║   • Agent Coordinator: Active & Autonomously Thinking     ║
    ║   • Blockchain: Connected                                 ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    # 1. Initialize the Autonomous Agent
    agent = CoordinatorAgent()
    
    # 2. Initialize the API Server, injecting the agent
    # This allows the API to report the agent's real status
    server = APIServer(agent=agent)
    
    # 3. Register Startup/Shutdown Hooks
    # Store agent reference in the app so hooks can access it
    server.app['agent_instance'] = agent
    server.app.on_startup.append(start_background_agent)
    server.app.on_cleanup.append(cleanup_background_agent)
    
    # 4. Run the Application
    logger.info("Initializing System...", host=api_config.host, port=api_config.port)
    
    try:
        web.run_app(server.app, host=api_config.host, port=api_config.port)
    except Exception as e:
        logger.error("System crash", error=str(e))

if __name__ == "__main__":
    main()
