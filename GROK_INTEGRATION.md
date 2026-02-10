# 🤖 Using Grok AI with Autonomous Treasury Agent

## Quick Setup

### 1. Get Your Grok API Key

1. Visit [console.x.ai](https://console.x.ai)
2. Sign in with your X (Twitter) account
3. Navigate to API Keys section
4. Create a new API key
5. Copy your key (starts with `xai-...`)

### 2. Configure Your Agent

Add to your `.env` file:

```bash
# Grok API Key
GROK_API_KEY=xai-your-key-here

# Set Grok as the provider
LLM_PROVIDER=grok

# Use grok-beta model
LLM_MODEL=grok-beta
```

### 3. Test the Integration

```bash
# Run the test script
python test_grok.py
```

You should see:
```
🤖 Testing Grok AI Integration
============================================================
1. Initializing Grok AI reasoner...
✅ Grok initialized with grok-beta model

2. Creating sample task...
✅ Task created: Review smart contract...

3. Analyzing task with Grok...
✅ Analysis complete:
   - Complexity: high
   - Estimated Time: 3.5 hours
   ...
```

---

## Why Grok?

### Advantages

✅ **Powerful Reasoning** - Comparable to GPT-4 for analysis tasks  
✅ **Cost Effective** - Competitive pricing  
✅ **Real-time Knowledge** - Access to X platform data  
✅ **Fast Responses** - Optimized for speed  
✅ **OpenAI Compatible** - Easy migration from GPT  

### Use Cases for Treasury Agent

1. **Task Analysis** - Understand complexity and requirements
2. **Worker Matching** - Assess worker-task fit
3. **Verification** - Validate task completion
4. **Strategic Planning** - Generate recommendations
5. **Natural Language** - Chat interface for monitoring

---

## How It Works

The Autonomous Treasury Agent integrates Grok through xAI's OpenAI-compatible API:

```python
from agent.ai_reasoning import AIReasoner, LLMProvider

# Initialize Grok
reasoner = AIReasoner(
    provider=LLMProvider.GROK,
    model="grok-beta"
)

# Analyze a task
analysis = await reasoner.analyze_task(task)

# Get:
# - Complexity assessment
# - Required skills
# - Time estimates
# - Risk analysis
# - Reward recommendations
```

---

## API Endpoints

Grok uses OpenAI-compatible endpoints:

**Base URL**: `https://api.x.ai/v1`

**Models**:
- `grok-beta` - Latest Grok model (recommended)
- `grok-vision-beta` - With vision capabilities

**Features**:
- Chat completions
- Streaming responses
- JSON mode (via system prompts)
- Function calling
- Temperature control

---

## Pricing

Check current pricing at [x.ai/api](https://x.ai/api)

Typical costs:
- **Input**: ~$5 per million tokens
- **Output**: ~$15 per million tokens

For a typical treasury agent:
- Task analysis: ~500 tokens → $0.01
- Worker matching: ~300 tokens → $0.005
- Daily operation (100 tasks): ~$1-2

---

## Comparison with Other LLMs

| Feature | Grok | GPT-4 | Claude |
|---------|------|-------|--------|
| Speed | ⚡⚡⚡ Fast | ⚡⚡ Medium | ⚡⚡ Medium |
| Cost | 💰💰 Moderate | 💰💰💰 High | 💰💰 Moderate |
| Reasoning | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Integration | ✅ OpenAI API | ✅ Native | ✅ Native |
| Real-time Data | ✅ Yes (X) | ❌ No | ❌ No |

---

## Advanced Configuration

### Custom System Prompts

```python
# Add treasury-specific instructions
reasoner = AIReasoner(
    provider=LLMProvider.GROK,
    model="grok-beta"
)

# The agent automatically uses:
# "You are an AI assistant for an autonomous treasury system.
#  Be precise and analytical."
```

### Hybrid Approach

Use Grok with fallback to UCB1 learning:

```python
# In agent/coordinator.py
try:
    # Try Grok analysis first
    analysis = await reasoner.analyze_task(task)
    decision = make_decision_from_analysis(analysis)
except Exception:
    # Fallback to UCB1 bandit algorithm
    decision = learner.select_worker(task)
```

### Multiple Providers

Compare Grok vs GPT:

```bash
# In .env
LLM_PROVIDER=both  # Uses both for validation
```

---

## Troubleshooting

### Error: "Grok API key required"

**Solution**: Add `GROK_API_KEY=xai-...` to `.env`

### Error: "API call failed"

**Possible causes**:
1. Invalid API key → Check console.x.ai
2. Rate limits → Wait or upgrade plan
3. Network issues → Check connectivity

### JSON Parsing Errors

Grok handles JSON mode via system prompts (not native response_format).  
The agent automatically adjusts for this.

---

## Production Tips

1. **Monitor Costs**: Track API usage in console.x.ai
2. **Set Timeouts**: Add request timeouts to prevent hangs
3. **Cache Results**: Cache common analyses to reduce calls
4. **Use Streaming**: For real-time feedback in UI
5. **Handle Failures**: Always have UCB1 fallback

---

## Next Steps

✅ Get your API key from [console.x.ai](https://console.x.ai)  
✅ Add to `.env` file  
✅ Run `python test_grok.py`  
✅ Deploy your intelligent agent!

---

## Support

- **xAI Documentation**: https://docs.x.ai
- **API Status**: https://status.x.ai
- **Community**: X (Twitter) @xai

---

*Built for the Monad Hackathon 🚀*
