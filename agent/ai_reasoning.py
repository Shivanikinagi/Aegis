"""
AI Reasoning Module - Integrates real LLM for intelligent decision making
Uses OpenAI GPT and/or Anthropic Claude for:
- Task understanding and classification
- Worker capability assessment
- Verification reasoning
- Natural language interaction
"""

import os
from typing import Dict, List, Optional, Tuple
from enum import Enum
import structlog
import json

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

from blockchain import Task, TaskType, TaskStatus

logger = structlog.get_logger()


def _task_description(task: Task) -> str:
    """Extract a human-readable description from a Task object."""
    if hasattr(task, 'description') and isinstance(getattr(task, 'description', None), str):
        return task.description
    # Convert description_hash bytes to hex string for display
    if hasattr(task, 'description_hash') and task.description_hash:
        desc_hash = task.description_hash
        if isinstance(desc_hash, bytes):
            return f"Task#{task.id} [{task.task_type.name}] hash:{desc_hash.hex()[:16]}..."
        return str(desc_hash)
    return f"Task#{task.id} [{task.task_type.name}]"


def _task_reward_wei(task: Task) -> int:
    """Get the reward/max_payment from a Task, supporting both field names."""
    if hasattr(task, 'reward'):
        return task.reward
    if hasattr(task, 'max_payment'):
        return task.max_payment
    return 0


def _task_type_name(task: Task) -> str:
    """Get the task type name, supporting both field names."""
    if hasattr(task, 'taskType'):
        return task.taskType.name if hasattr(task.taskType, 'name') else str(task.taskType)
    if hasattr(task, 'task_type'):
        return task.task_type.name if hasattr(task.task_type, 'name') else str(task.task_type)
    return "UNKNOWN"


class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROK = "grok"  # xAI Grok
    BOTH = "both"  # Use both for validation


class AIReasoner:
    """
    AI reasoning engine that uses LLMs for intelligent decision-making
    """
    
    def __init__(
        self,
        provider: LLMProvider = LLMProvider.OPENAI,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        grok_api_key: Optional[str] = None,
        model: str = "gpt-4o-mini"  # or "claude-3-sonnet-20240229" or "grok-beta"
    ):
        self.provider = provider
        self.model = model
        
        # Initialize OpenAI
        if provider in [LLMProvider.OPENAI, LLMProvider.BOTH]:
            if not OPENAI_AVAILABLE:
                raise ImportError("OpenAI package not installed. Run: pip install openai")
            
            api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API key required")
            
            self.openai_client = openai.OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized", model=model)
        
        # Initialize Grok (xAI) - uses OpenAI-compatible API
        if provider == LLMProvider.GROK:
            if not OPENAI_AVAILABLE:
                raise ImportError("OpenAI package required for Grok. Run: pip install openai")
            
            api_key = grok_api_key or os.getenv("GROK_API_KEY")
            if not api_key:
                raise ValueError("Grok API key required. Get it from https://x.ai")
            
            self.openai_client = openai.OpenAI(
                api_key=api_key,
                base_url="https://api.x.ai/v1"
            )
            # Use grok-beta model by default
            if model == "gpt-4o-mini":
                self.model = "grok-beta"
            logger.info("Grok (xAI) client initialized", model=self.model)
        
        # Initialize Anthropic
        if provider in [LLMProvider.ANTHROPIC, LLMProvider.BOTH]:
            if not ANTHROPIC_AVAILABLE:
                raise ImportError("Anthropic package not installed. Run: pip install anthropic")
            
            api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("Anthropic API key required")
            
            self.anthropic_client = anthropic.Anthropic(api_key=api_key)
            logger.info("Anthropic client initialized", model=model)
    
    async def analyze_task(self, task: Task) -> Dict:
        """
        Analyze a task using AI to understand requirements, complexity, and risks
        
        Returns:
            {
                "complexity": "low|medium|high",
                "required_skills": ["skill1", "skill2"],
                "estimated_time": hours,
                "risk_level": "low|medium|high",
                "recommended_reward": float,
                "reasoning": "explanation"
            }
        """
        prompt = f"""Analyze this blockchain task and provide a structured assessment:

Task ID: {task.id}
Type: {_task_type_name(task)}
Description: {_task_description(task)}
Reward: {_task_reward_wei(task)} wei
Creator: {task.creator}

Provide your analysis in JSON format with:
- complexity (low/medium/high)
- required_skills (list of strings)
- estimated_time (hours as float)
- risk_level (low/medium/high)
- recommended_reward (in ETH as float)
- reasoning (brief explanation)

Focus on practical assessment for an autonomous treasury system."""

        try:
            response = await self._call_llm(prompt, json_mode=True)
            analysis = json.loads(response)
            
            logger.info("Task analyzed", 
                       task_id=task.id,
                       complexity=analysis.get("complexity"))
            
            return analysis
            
        except Exception as e:
            logger.error("Task analysis failed", error=str(e))
            return self._fallback_analysis(task)
    
    async def assess_worker_match(
        self,
        task: Task,
        worker_address: str,
        worker_history: Dict
    ) -> Tuple[float, str]:
        """
        Assess how well a worker matches a task using AI reasoning
        
        Returns:
            (match_score, reasoning) where match_score is 0.0-1.0
        """
        prompt = f"""Assess how well this worker matches the given task:

TASK:
- Type: {_task_type_name(task)}
- Description: {_task_description(task)}
- Reward: {_task_reward_wei(task)} wei

WORKER:
- Address: {worker_address}
- Total Tasks: {worker_history.get('total_tasks', 0)}
- Success Rate: {worker_history.get('success_rate', 0):.1%}
- Average Time: {worker_history.get('avg_time', 0)} seconds
- Reliability Score: {worker_history.get('reliability', 0)}/10000
- Recent Performance: {worker_history.get('recent_performance', 'Unknown')}

Provide your assessment in JSON format:
{{
    "match_score": 0.0-1.0,
    "reasoning": "brief explanation",
    "concerns": ["concern1", "concern2"] or [],
    "strengths": ["strength1", "strength2"]
}}
"""

        try:
            response = await self._call_llm(prompt, json_mode=True)
            assessment = json.loads(response)
            
            match_score = float(assessment.get("match_score", 0.5))
            reasoning = assessment.get("reasoning", "No reasoning provided")
            
            logger.info("Worker assessed",
                       worker=worker_address[:10],
                       score=f"{match_score:.2f}")
            
            return match_score, reasoning
            
        except Exception as e:
            logger.error("Worker assessment failed", error=str(e))
            # Fallback to simple scoring
            fallback_score = min(worker_history.get('success_rate', 0.5), 1.0)
            return fallback_score, "Fallback assessment based on success rate"
    
    async def verify_task_completion(
        self,
        task: Task,
        proposed_outcome: str,
        worker_submission: Optional[str] = None
    ) -> Tuple[bool, str, float]:
        """
        Use AI to verify if a task was completed successfully
        
        Returns:
            (is_valid, reasoning, confidence_score)
        """
        prompt = f"""Verify if this task was completed successfully:

TASK:
- ID: {task.id}
- Type: {_task_type_name(task)}
- Description: {_task_description(task)}
- Required Outcome: {proposed_outcome}

WORKER SUBMISSION:
{worker_submission or "No submission provided"}

Analyze the completion and provide verification in JSON format:
{{
    "is_valid": true/false,
    "reasoning": "detailed explanation",
    "confidence": 0.0-1.0,
    "issues_found": ["issue1", "issue2"] or [],
    "recommendation": "approve|reject|needs_review"
}}
"""

        try:
            response = await self._call_llm(prompt, json_mode=True)
            verification = json.loads(response)
            
            is_valid = verification.get("is_valid", False)
            reasoning = verification.get("reasoning", "No reasoning provided")
            confidence = float(verification.get("confidence", 0.5))
            
            logger.info("Task verified",
                       task_id=task.id,
                       valid=is_valid,
                       confidence=f"{confidence:.2f}")
            
            return is_valid, reasoning, confidence
            
        except Exception as e:
            logger.error("Task verification failed", error=str(e))
            return False, f"Verification error: {str(e)}", 0.0
    
    async def generate_task_recommendation(
        self,
        available_tasks: List[Task],
        treasury_state: Dict,
        market_conditions: Dict
    ) -> List[Tuple[int, float, str]]:
        """
        Generate prioritized task recommendations using AI
        
        Returns:
            List of (task_id, priority_score, reasoning)
        """
        tasks_summary = "\n".join([
            f"- Task {t.id}: {_task_type_name(t)} - {_task_description(t)[:50]}... (Reward: {_task_reward_wei(t)} wei)"
            for t in available_tasks[:10]  # Limit to avoid token limits
        ])
        
        prompt = f"""Given the current system state, recommend task prioritization:

AVAILABLE TASKS:
{tasks_summary}

TREASURY STATE:
- Total Balance: {treasury_state.get('total', 0)} wei
- Available: {treasury_state.get('available', 0)} wei
- Daily Budget Remaining: {treasury_state.get('daily_remaining', 0)} wei

MARKET CONDITIONS:
- Active Workers: {market_conditions.get('active_workers', 0)}
- Pending Tasks: {market_conditions.get('pending_tasks', 0)}
- Average Success Rate: {market_conditions.get('avg_success_rate', 0):.1%}

Provide a prioritized list in JSON format:
{{
    "recommendations": [
        {{
            "task_id": int,
            "priority_score": 0.0-1.0,
            "reasoning": "brief explanation"
        }}
    ],
    "overall_strategy": "strategic recommendation"
}}
"""

        try:
            response = await self._call_llm(prompt, json_mode=True)
            result = json.loads(response)
            
            recommendations = [
                (r['task_id'], r['priority_score'], r['reasoning'])
                for r in result.get('recommendations', [])
            ]
            
            logger.info("Generated recommendations",
                       count=len(recommendations))
            
            return recommendations
            
        except Exception as e:
            logger.error("Recommendation generation failed", error=str(e))
            # Fallback: simple FIFO with task type preference
            return [(t.id, 0.5, "Fallback recommendation") for t in available_tasks[:5]]
    
    async def natural_language_query(self, query: str, context: Dict) -> str:
        """
        Answer natural language queries about the system
        Useful for frontend chat interface
        """
        prompt = f"""You are an AI assistant for an Autonomous Treasury Agent system on Monad blockchain.

SYSTEM CONTEXT:
{json.dumps(context, indent=2)}

USER QUERY:
{query}

Provide a helpful, concise response. If asked about specific data, reference the context provided.
"""

        try:
            response = await self._call_llm(prompt, json_mode=False)
            return response
            
        except Exception as e:
            logger.error("Natural language query failed", error=str(e))
            return f"I encountered an error processing your query: {str(e)}"
    
    async def _call_llm(self, prompt: str, json_mode: bool = False) -> str:
        """Call the configured LLM provider"""
        
        if self.provider == LLMProvider.OPENAI:
            return await self._call_openai(prompt, json_mode)
        elif self.provider == LLMProvider.GROK:
            return await self._call_openai(prompt, json_mode)  # Grok uses OpenAI-compatible API
        elif self.provider == LLMProvider.ANTHROPIC:
            return await self._call_anthropic(prompt, json_mode)
        elif self.provider == LLMProvider.BOTH:
            # Get responses from both and compare
            openai_response = await self._call_openai(prompt, json_mode)
            anthropic_response = await self._call_anthropic(prompt, json_mode)
            
            # For now, prefer OpenAI response (could implement consensus logic)
            return openai_response
        
        raise ValueError(f"Unknown provider: {self.provider}")
    
    async def _call_openai(self, prompt: str, json_mode: bool) -> str:
        """Call OpenAI or Grok API (both use OpenAI-compatible interface)"""
        try:
            # Auto-detect model if not explicitly set
            if "grok" in self.model.lower():
                model = self.model  # Use grok-beta or user-specified Grok model
            elif "gpt" in self.model.lower():
                model = self.model  # Use specified GPT model
            else:
                model = "gpt-4o-mini"  # Default fallback
            
            kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are an AI assistant for an autonomous treasury system. Be precise and analytical."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,  # Lower for more consistent output
            }
            
            # Note: Grok supports JSON mode differently, so we handle it gracefully
            if json_mode:
                if "grok" not in model.lower():
                    kwargs["response_format"] = {"type": "json_object"}
                else:
                    # For Grok, add JSON instruction to system prompt
                    kwargs["messages"][0]["content"] += " Always respond with valid JSON only."
            
            response = self.openai_client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error("API call failed", error=str(e), provider=self.provider.value)
            raise
    
    async def _call_anthropic(self, prompt: str, json_mode: bool) -> str:
        """Call Anthropic API"""
        try:
            system_prompt = "You are an AI assistant for an autonomous treasury system. Be precise and analytical."
            if json_mode:
                system_prompt += " Always respond with valid JSON."
            
            message = self.anthropic_client.messages.create(
                model=self.model if "claude" in self.model else "claude-3-sonnet-20240229",
                max_tokens=1024,
                temperature=0.3,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return message.content[0].text
            
        except Exception as e:
            logger.error("Anthropic API call failed", error=str(e))
            raise
    
    def _fallback_analysis(self, task: Task) -> Dict:
        """Fallback analysis when LLM fails"""
        return {
            "complexity": "medium",
            "required_skills": [_task_type_name(task)],
            "estimated_time": 1.0,
            "risk_level": "medium",
            "recommended_reward": float(_task_reward_wei(task)) / 1e18,
            "reasoning": "Fallback analysis - LLM unavailable"
        }
