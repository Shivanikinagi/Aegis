"""
Unit tests for the AI Reasoning module.
Tests the AIReasoner helper functions and fallback behavior.
Tests with mocked LLM providers, plus optional live LLM tests.
"""

import os
import sys
import json
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from ai_reasoning import (
    AIReasoner, LLMProvider,
    _task_description, _task_reward_wei, _task_type_name
)
from blockchain import Task, TaskType, TaskStatus


class TestHelperFunctions:
    """Tests for the AI reasoning helper functions."""

    def test_task_description_from_hash(self, sample_task):
        desc = _task_description(sample_task)
        assert "Task#1" in desc
        assert "DATA_ANALYSIS" in desc

    def test_task_description_with_description_attr(self):
        task = MagicMock()
        task.description = "Analyze blockchain data"
        result = _task_description(task)
        assert result == "Analyze blockchain data"

    def test_task_reward_wei_max_payment(self, sample_task):
        reward = _task_reward_wei(sample_task)
        assert reward == 500000000000000000

    def test_task_reward_wei_reward_attr(self):
        task = MagicMock(spec=[])
        task.reward = 1000
        result = _task_reward_wei(task)
        assert result == 1000

    def test_task_type_name(self, sample_task):
        name = _task_type_name(sample_task)
        assert name == "DATA_ANALYSIS"

    def test_task_type_name_camel_case(self):
        task = MagicMock(spec=[])
        task.taskType = MagicMock()
        task.taskType.name = "CODE_REVIEW"
        name = _task_type_name(task)
        assert name == "CODE_REVIEW"


class TestAIReasonerFallback:
    """Tests for AIReasoner fallback behavior when LLM fails."""

    def test_fallback_analysis(self, sample_task):
        """Test the fallback analysis when LLM is unavailable."""
        # Create a minimal reasoner-like object for testing fallback
        # We test the fallback method directly
        from ai_reasoning import AIReasoner

        # Mock a reasoner without actually calling LLM
        with patch.object(AIReasoner, '__init__', lambda self, **kw: None):
            reasoner = AIReasoner.__new__(AIReasoner)
            result = reasoner._fallback_analysis(sample_task)

        assert result["complexity"] == "medium"
        assert result["risk_level"] == "medium"
        assert "required_skills" in result
        assert result["estimated_time"] == 1.0
        assert isinstance(result["recommended_reward"], float)


class TestAIReasonerWithMockedLLM:
    """Tests for AIReasoner with mocked LLM calls."""

    @pytest.fixture
    def mocked_reasoner(self):
        """Create an AIReasoner with mocked OpenAI client."""
        with patch.object(AIReasoner, '__init__', lambda self, **kw: None):
            reasoner = AIReasoner.__new__(AIReasoner)
            reasoner.provider = LLMProvider.OPENAI
            reasoner.model = "gpt-4o-mini"

            # Mock OpenAI client
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps({
                "complexity": "high",
                "required_skills": ["python", "data_analysis"],
                "estimated_time": 3.0,
                "risk_level": "medium",
                "recommended_reward": 0.8,
                "reasoning": "Complex analysis task"
            })

            reasoner.openai_client = MagicMock()
            reasoner.openai_client.chat.completions.create.return_value = mock_response

            return reasoner

    @pytest.mark.asyncio
    async def test_analyze_task(self, mocked_reasoner, sample_task):
        analysis = await mocked_reasoner.analyze_task(sample_task)
        assert analysis["complexity"] == "high"
        assert "python" in analysis["required_skills"]
        assert analysis["estimated_time"] == 3.0

    @pytest.mark.asyncio
    async def test_assess_worker_match(self, mocked_reasoner, sample_task, sample_worker_history):
        # Update mock for assessment response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "match_score": 0.85,
            "reasoning": "Good match",
            "concerns": [],
            "strengths": ["experience"]
        })
        mocked_reasoner.openai_client.chat.completions.create.return_value = mock_response

        score, reason = await mocked_reasoner.assess_worker_match(
            sample_task, "0xworker", sample_worker_history
        )
        assert 0.0 <= score <= 1.0
        assert isinstance(reason, str)

    @pytest.mark.asyncio
    async def test_verify_task_completion(self, mocked_reasoner, sample_submitted_task):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "is_valid": True,
            "reasoning": "Task looks complete",
            "confidence": 0.9,
            "issues_found": [],
            "recommendation": "approve"
        })
        mocked_reasoner.openai_client.chat.completions.create.return_value = mock_response

        is_valid, reasoning, confidence = await mocked_reasoner.verify_task_completion(
            sample_submitted_task,
            proposed_outcome="Task completion",
            worker_submission="Result hash submitted"
        )
        assert is_valid is True
        assert confidence == 0.9

    @pytest.mark.asyncio
    async def test_natural_language_query(self, mocked_reasoner):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "The treasury has 100 MON."
        mocked_reasoner.openai_client.chat.completions.create.return_value = mock_response

        response = await mocked_reasoner.natural_language_query(
            "How much is in the treasury?",
            {"treasury_balance": 100}
        )
        assert "100" in response

    @pytest.mark.asyncio
    async def test_generate_task_recommendation(self, mocked_reasoner, sample_task):
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "recommendations": [
                {"task_id": 1, "priority_score": 0.9, "reasoning": "High priority"}
            ],
            "overall_strategy": "Focus on data tasks"
        })
        mocked_reasoner.openai_client.chat.completions.create.return_value = mock_response

        recs = await mocked_reasoner.generate_task_recommendation(
            [sample_task],
            {"total": 100, "available": 90, "daily_remaining": 45},
            {"active_workers": 5, "pending_tasks": 3, "avg_success_rate": 0.8}
        )
        assert len(recs) == 1
        assert recs[0][0] == 1  # task_id
        assert recs[0][1] == 0.9  # priority

    @pytest.mark.asyncio
    async def test_fallback_on_llm_error(self, mocked_reasoner, sample_task):
        """When LLM fails, should return fallback analysis."""
        mocked_reasoner.openai_client.chat.completions.create.side_effect = Exception("API Error")

        analysis = await mocked_reasoner.analyze_task(sample_task)
        assert analysis["complexity"] == "medium"  # Fallback value
        assert "Fallback" in analysis["reasoning"]


@pytest.mark.llm
class TestAIReasonerLive:
    """
    Live LLM integration tests. Requires API keys in environment.
    Run with: pytest -m llm
    """

    @pytest.fixture
    def live_reasoner(self):
        """Create a real AIReasoner (requires API key)."""
        grok_key = os.getenv("GROK_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if grok_key:
            return AIReasoner(provider=LLMProvider.GROK, grok_api_key=grok_key)
        elif openai_key:
            return AIReasoner(provider=LLMProvider.OPENAI, openai_api_key=openai_key)
        else:
            pytest.skip("No LLM API key available")

    @pytest.mark.asyncio
    async def test_live_task_analysis(self, live_reasoner, sample_task):
        analysis = await live_reasoner.analyze_task(sample_task)
        assert "complexity" in analysis
        assert analysis["complexity"] in ["low", "medium", "high"]

    @pytest.mark.asyncio
    async def test_live_worker_match(self, live_reasoner, sample_task, sample_worker_history):
        score, reason = await live_reasoner.assess_worker_match(
            sample_task, "0xWorkerAddress", sample_worker_history
        )
        assert 0.0 <= score <= 1.0
        assert len(reason) > 0

    @pytest.mark.asyncio
    async def test_live_natural_language(self, live_reasoner):
        response = await live_reasoner.natural_language_query(
            "What are the current treasury rules?",
            {"max_spend_per_task": 10, "max_spend_per_day": 100}
        )
        assert len(response) > 0
