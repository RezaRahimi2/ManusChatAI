# Implementation Guide: Building a Manus AI Clone with Local LLM Integration

This guide provides step-by-step instructions for implementing a Manus AI clone with a UI and local LLM integration. It builds on the research and design work completed in previous phases.

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Implementation](#3-frontend-implementation)
4. [LLM Integration](#4-llm-integration)
5. [Agent System Implementation](#5-agent-system-implementation)
6. [Tool Framework Implementation](#6-tool-framework-implementation)
7. [Memory System Implementation](#7-memory-system-implementation)
8. [Testing and Validation](#8-testing-and-validation)
9. [Deployment](#9-deployment)

## 1. Project Setup

### 1.1 Directory Structure

Create the following directory structure for your project:

```
manus-clone/
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   ├── llm/
│   │   ├── memory/
│   │   ├── tool/
│   │   ├── config/
│   │   ├── api/
│   │   └── utils/
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── styles/
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   └── README.md
└── README.md
```

### 1.2 Backend Setup

1. Create a Python virtual environment:

```bash
cd manus-clone/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Create a `pyproject.toml` file:

```toml
[build-system]
requires = ["setuptools>=42", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "manus-clone-backend"
version = "0.1.0"
description = "Backend for Manus AI Clone"
readme = "README.md"
requires-python = ">=3.10"
license = {text = "MIT"}
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn>=0.23.2",
    "pydantic>=2.4.2",
    "python-dotenv>=1.0.0",
    "langchain>=0.0.300",
    "ollama>=0.1.0",
    "lmstudio>=0.1.0",
    "llama-cpp-python>=0.2.0",
    "faiss-cpu>=1.7.4",
    "chromadb>=0.4.18",
    "beautifulsoup4>=4.12.2",
    "playwright>=1.39.0",
    "numpy>=1.26.0",
    "pandas>=2.1.1",
    "matplotlib>=3.8.0",
    "pytest>=7.4.2",
]

[project.optional-dependencies]
dev = [
    "black>=23.9.1",
    "isort>=5.12.0",
    "flake8>=6.1.0",
    "mypy>=1.5.1",
    "pytest>=7.4.2",
]

[tool.setuptools]
packages = ["src"]

[tool.black]
line-length = 88
target-version = ["py310"]

[tool.isort]
profile = "black"
line_length = 88
```

3. Install dependencies:

```bash
pip install -e ".[dev]"
```

### 1.3 Frontend Setup

1. Create a Next.js project with TypeScript:

```bash
cd manus-clone/frontend
npx create-nextjs-app .
```

2. Install additional dependencies:

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-slider @radix-ui/react-tabs
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install react-markdown rehype-highlight
npm install recharts
npm install socket.io-client
npm install zustand
```

3. Set up Tailwind CSS:

```bash
npx tailwindcss init -p
```

4. Configure `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## 2. Backend Implementation

### 2.1 Core Configuration

Create a configuration module in `backend/src/config/config.py`:

```python
import os
from pathlib import Path
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMConfig(BaseModel):
    provider: str = "ollama"  # ollama, lmstudio, llamacpp, openai
    model_id: str = "llama3.2"
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 0.95
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    context_window: int = 4096


class MemoryConfig(BaseModel):
    type: str = "conversation_buffer"  # conversation_buffer, vector_store
    max_messages: int = 10
    vector_store_path: Optional[str] = None
    vector_store_type: str = "faiss"  # faiss, chroma
    embedding_model: str = "local"


class ToolConfig(BaseModel):
    enabled: bool = True
    parameters: Dict = Field(default_factory=dict)


class AgentConfig(BaseModel):
    id: str
    name: str
    description: str
    llm: LLMConfig
    memory: MemoryConfig
    tools: Dict[str, ToolConfig] = Field(default_factory=dict)
    system_prompt: str
    capabilities: List[str] = Field(default_factory=list)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Base paths
    base_dir: Path = Path(__file__).parent.parent.parent
    data_dir: Path = base_dir / "data"
    models_dir: Path = data_dir / "models"
    configs_dir: Path = data_dir / "configs"
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # LLM settings
    default_llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    lmstudio_base_url: str = "http://localhost:1234"
    
    # OpenAI (optional fallback)
    openai_api_key: Optional[str] = None
    
    # Agent settings
    default_agent_id: str = "general_assistant"
    
    # Tool settings
    enable_browser: bool = True
    enable_code_execution: bool = True
    enable_file_system: bool = True
    
    # Memory settings
    vector_store_dir: Path = data_dir / "vector_stores"
    
    def initialize(self):
        """Create necessary directories."""
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.configs_dir, exist_ok=True)
        os.makedirs(self.vector_store_dir, exist_ok=True)


settings = Settings()
settings.initialize()
```

### 2.2 LLM Integration Layer

Create the LLM integration layer in `backend/src/llm/base.py`:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Union

from ..config.config import LLMConfig


class Message:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content

    def to_dict(self) -> Dict[str, str]:
        return {"role": self.role, "content": self.content}


class LLMResponse:
    def __init__(self, content: str, usage: Optional[Dict] = None):
        self.content = content
        self.usage = usage or {}


class BaseLLM(ABC):
    """Base class for LLM providers."""
    
    def __init__(self, config: LLMConfig):
        self.config = config
    
    @abstractmethod
    async def generate(self, messages: List[Message]) -> LLMResponse:
        """Generate a response from the LLM."""
        pass
    
    @abstractmethod
    async def generate_with_tools(
        self, messages: List[Message], tools: List[Dict]
    ) -> LLMResponse:
        """Generate a response with tool calling capabilities."""
        pass
    
    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for the given texts."""
        pass
```

Implement Ollama integration in `backend/src/llm/ollama.py`:

```python
import json
from typing import Dict, List, Optional

import aiohttp

from ..config.config import LLMConfig, settings
from .base import BaseLLM, LLMResponse, Message


class OllamaLLM(BaseLLM):
    """Ollama LLM provider."""
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        self.base_url = settings.ollama_base_url
    
    async def generate(self, messages: List[Message]) -> LLMResponse:
        """Generate a response from Ollama."""
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.config.model_id,
                "messages": [m.to_dict() for m in messages],
                "options": {
                    "temperature": self.config.temperature,
                    "top_p": self.config.top_p,
                    "num_predict": self.config.max_tokens,
                }
            }
            
            async with session.post(
                f"{self.base_url}/api/chat", json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Ollama API error: {error_text}")
                
                result = await response.json()
                return LLMResponse(
                    content=result["message"]["content"],
                    usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
                )
    
    async def generate_with_tools(
        self, messages: List[Message], tools: List[Dict]
    ) -> LLMResponse:
        """Generate a response with tool calling capabilities."""
        # Ollama doesn't natively support tool calling, so we'll implement it
        # by adding tool descriptions to the system prompt
        
        tool_descriptions = "\n\n".join([
            f"Tool: {tool['name']}\nDescription: {tool['description']}\n"
            f"Parameters: {json.dumps(tool['parameters'], indent=2)}"
            for tool in tools
        ])
        
        tool_usage_prompt = """
        To use a tool, respond with:
        ```tool
        {
          "name": "tool_name",
          "parameters": {
            "param1": "value1",
            "param2": "value2"
          }
        }
        ```
        """
        
        system_message = None
        new_messages = []
        
        for message in messages:
            if message.role == "system":
                system_content = message.content
                system_content += f"\n\nAvailable Tools:\n{tool_descriptions}\n{tool_usage_prompt}"
                system_message = Message("system", system_content)
            else:
                new_messages.append(message)
        
        if system_message:
            new_messages.insert(0, system_message)
        
        return await self.generate(new_messages)
    
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for the given texts."""
        embeddings = []
        
        async with aiohttp.ClientSession() as session:
            for text in texts:
                payload = {
                    "model": f"{self.config.model_id}:embed",
                    "prompt": text
                }
                
                async with session.post(
                    f"{self.base_url}/api/embeddings", json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Ollama API error: {error_text}")
                    
                    result = await response.json()
                    embeddings.append(result["embedding"])
        
        return embeddings
```

Implement LM Studio integration in `backend/src/llm/lmstudio.py`:

```python
from typing import Dict, List, Optional

import aiohttp

from ..config.config import LLMConfig, settings
from .base import BaseLLM, LLMResponse, Message


class LMStudioLLM(BaseLLM):
    """LM Studio LLM provider."""
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        self.base_url = settings.lmstudio_base_url
    
    async def generate(self, messages: List[Message]) -> LLMResponse:
        """Generate a response from LM Studio."""
        async with aiohttp.ClientSession() as session:
            payload = {
                "messages": [m.to_dict() for m in messages],
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "max_tokens": self.config.max_tokens,
                "stream": False
            }
            
            async with session.post(
                f"{self.base_url}/v1/chat/completions", json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"LM Studio API error: {error_text}")
                
                result = await response.json()
                return LLMResponse(
                    content=result["choices"][0]["message"]["content"],
                    usage=result.get("usage", {})
                )
    
    async def generate_with_tools(
        self, messages: List[Message], tools: List[Dict]
    ) -> LLMResponse:
        """Generate a response with tool calling capabilities."""
        async with aiohttp.ClientSession() as session:
            payload = {
                "messages": [m.to_dict() for m in messages],
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "max_tokens": self.config.max_tokens,
                "tools": tools,
                "stream": False
            }
            
            async with session.post(
                f"{self.base_url}/v1/chat/completions", json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"LM Studio API error: {error_text}")
                
                result = await response.json()
                return LLMResponse(
                    content=result["choices"][0]["message"]["content"],
                    usage=result.get("usage", {})
                )
    
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for the given texts."""
        async with aiohttp.ClientSession() as session:
            payload = {
                "input": texts,
                "model": "embedding"
            }
            
            async with session.post(
                f"{self.base_url}/v1/embeddings", json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"LM Studio API error: {error_text}")
                
                result = await response.json()
                return [item["embedding"] for item in result["data"]]
```

Create a factory for LLM providers in `backend/src/llm/factory.py`:

```python
from typing import Dict, Type

from ..config.config import LLMConfig
from .base import BaseLLM
from .llamacpp import LlamaCppLLM
from .lmstudio import LMStudioLLM
from .ollama import OllamaLLM
from .openai import OpenAILLM


class LLMFactory:
    """Factory for creating LLM instances."""
    
    _providers: Dict[str, Type[BaseLLM]] = {
        "ollama": OllamaLLM,
        "lmstudio": LMStudioLLM,
        "llamacpp": LlamaCppLLM,
        "openai": OpenAILLM,
    }
    
    @classmethod
    def create(cls, config: LLMConfig) -> BaseLLM:
        """Create an LLM instance based on the provider."""
        provider = config.provider.lower()
        
        if provider not in cls._providers:
            raise ValueError(f"Unsupported LLM provider: {provider}")
        
        return cls._providers[provider](config)
    
    @classmethod
    def register_provider(cls, name: str, provider_class: Type[BaseLLM]):
        """Register a new LLM provider."""
        cls._providers[name.lower()] = provider_class
```

### 2.3 Agent System

Create the base agent class in `backend/src/agent/base.py`:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

from ..config.config import AgentConfig
from ..llm.base import BaseLLM, Message
from ..llm.factory import LLMFactory
from ..memory.base import BaseMemory
from ..memory.factory import MemoryFactory
from ..tool.base import BaseTool
from ..tool.registry import ToolRegistry


class BaseAgent(ABC):
    """Base class for all agents."""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.llm = LLMFactory.create(config.llm)
        self.memory = MemoryFactory.create(config.memory)
        self.tools = self._initialize_tools()
    
    def _initialize_tools(self) -> Dict[str, BaseTool]:
        """Initialize tools based on configuration."""
        tools = {}
        registry = ToolRegistry()
        
        for tool_id, tool_config in self.config.tools.items():
            if tool_config.enabled:
                tool_cls = registry.get_tool(tool_id)
                if tool_cls:
                    tools[tool_id] = tool_cls(tool_config.parameters)
        
        return tools
    
    @abstractmethod
    async def process(self, user_input: str) -> str:
        """Process user input and return a response."""
        pass
    
    async def add_message(self, role: str, content: str):
        """Add a message to the agent's memory."""
        await self.memory.add_message(Message(role, content))
    
    async def get_messages(self) -> List[Message]:
        """Get all messages from the agent's memory."""
        return await self.memory.get_messages()
    
    async def clear_memory(self):
        """Clear the agent's memory."""
        await self.memory.clear()
```

Implement the main Manus agent in `backend/src/agent/manus.py`:

```python
import json
import re
from typing import Dict, List, Optional, Tuple

from ..config.config import AgentConfig
from ..llm.base import Message
from ..tool.base import ToolCall
from .base import BaseAgent


class ManusAgent(BaseAgent):
    """Main Manus agent implementation."""
    
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        self._initialize_system_prompt()
    
    def _initialize_system_prompt(self):
        """Initialize the system prompt with tool descriptions."""
        tool_descriptions = []
        
        for tool_id, tool in self.tools.items():
            tool_descriptions.append(
                f"Tool: {tool_id}\n"
                f"Description: {tool.description}\n"
                f"Parameters: {json.dumps(tool.parameters, indent=2)}"
            )
        
        tool_descriptions_str = "\n\n".join(tool_descriptions)
        
        self.system_prompt = (
            f"{self.config.system_prompt}\n\n"
            f"Available Tools:\n{tool_descriptions_str}\n\n"
            "To use a tool, respond with:\n"
            "```tool\n"
            "{\n"
            '  "name": "tool_name",\n'
            '  "parameters": {\n'
            '    "param1": "value1",\n'
            '    "param2": "value2"\n'
            "  }\n"
            "}\n"
            "```"
        )
    
    async def process(self, user_input: str) -> str:
        """Process user input and return a response."""
        # Add user message to memory
        await self.add_message("user", user_input)
        
        # Get all messages from memory
        messages = await self.get_messages()
        
        # Add system message at the beginning
        messages.insert(0, Message("system", self.system_prompt))
        
        # Generate response from LLM
        response = await self.llm.generate(messages)
        
        # Check if the response contains a tool call
        tool_call = self._extract_tool_call(response.content)
        
        if tool_call:
            # Execute the tool
            tool_result = await self._execute_tool(tool_call)
            
            # Add tool call and result to memory
            await self.add_message("assistant", f"I'll use the {tool_call.name} tool.")
            await self.add_message("system", f"Tool result: {tool_result}")
            
            # Generate final response
            messages = await self.get_messages()
            messages.insert(0, Message("system", self.system_prompt))
            final_response = await self.llm.generate(messages)
            
            # Add final response to memory
            await self.add_message("assistant", final_response.content)
            
            return final_response.content
        else:
            # Add response to memory
            await self.add_message("assistant", response.content)
            
            return response.content
    
    def _extract_tool_call(self, content: str) -> Optional[ToolCall]:
        """Extract tool call from response content."""
        tool_pattern = r"```tool\s*(.*?)```"
        match = re.search(tool_pattern, content, re.DOTALL)
        
        if match:
            try:
                tool_data = json.loads(match.group(1))
                return ToolCall(
                    name=tool_data["name"],
                    parameters=tool_data["parameters"]
                )
            except (json.JSONDecodeError, KeyError):
                return None
        
        return None
    
    async def _execute_tool(self, tool_call: ToolCall) -> str:
        """Execute a tool and return the result."""
        tool = self.tools.get(tool_call.name)
        
        if not tool:
            return f"Error: Tool '{tool_call.name}' not found."
        
        try:
            result = await tool.execute(**tool_call.parameters)
            return result
        except Exception as e:
            return f"Error executing tool '{tool_call.name}': {str(e)}"
```

### 2.4 Memory System

Create the base memory class in `backend/src/memory/base.py`:

```python
from abc import ABC, abstractmethod
from typing import List

from ..llm.base import Message


class BaseMemory(ABC):
    """Base class for memory implementations."""
    
    @abstractmethod
    async def add_message(self, message: Message):
        """Add a message to memory."""
        pass
    
    @abstractmethod
    async def get_messages(self) -> List[Message]:
        """Get all messages from memory."""
        pass
    
    @abstractmethod
    async def clear(self):
        """Clear all messages from memory."""
        pass
```

Implement conversation buffer memory in `backend/src/memory/conversation_buffer.py`:

```python
from typing import List

from ..config.config import MemoryConfig
from ..llm.base import Message
from .base import BaseMemory


class ConversationBufferMemory(BaseMemory):
    """Simple conversation buffer memory."""
    
    def __init__(self, config: MemoryConfig):
        self.config = config
        self.messages: List[Message] = []
    
    async def add_message(self, message: Message):
        """Add a message to memory."""
        self.messages.append(message)
        
        # Trim to max_messages if needed
        if self.config.max_messages > 0 and len(self.messages) > self.config.max_messages:
            # Keep the most recent messages
            self.messages = self.messages[-self.config.max_messages:]
    
    async def get_messages(self) -> List[Message]:
        """Get all messages from memory."""
        return self.messages.copy()
    
    async def clear(self):
        """Clear all messages from memory."""
        self.messages = []
```

Create a factory for memory implementations in `backend/src/memory/factory.py`:

```python
from typing import Dict, Type

from ..config.config import MemoryConfig
from .base import BaseMemory
from .conversation_buffer import ConversationBufferMemory
from .vector_store import VectorStoreMemory


class MemoryFactory:
    """Factory for creating memory instances."""
    
    _types: Dict[str, Type[BaseMemory]] = {
        "conversation_buffer": ConversationBufferMemory,
        "vector_store": VectorStoreMemory,
    }
    
    @classmethod
    def create(cls, config: MemoryConfig) -> BaseMemory:
        """Create a memory instance based on the type."""
        memory_type = config.type.lower()
        
        if memory_type not in cls._types:
            raise ValueError(f"Unsupported memory type: {memory_type}")
        
        return cls._types[memory_type](config)
    
    @classmethod
    def register_type(cls, name: str, memory_class: Type[BaseMemory]):
        """Register a new memory type."""
        cls._types[name.lower()] = memory_class
```

### 2.5 Tool Framework

Create the base tool class in `backend/src/tool/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ToolCall:
    """Represents a tool call from the LLM."""
    name: str
    parameters: Dict[str, Any]


class BaseTool(ABC):
    """Base class for all tools."""
    
    def __init__(self, parameters: Optional[Dict] = None):
        self.parameters = parameters or {}
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Get the name of the tool."""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Get the description of the tool."""
        pass
    
    @property
    @abstractmethod
    def parameters(self) -> Dict:
        """Get the parameters schema for the tool."""
        pass
    
    @parameters.setter
    def parameters(self, value: Dict):
        """Set the parameters for the tool."""
        self._parameters = value
    
    @abstractmethod
    async def execute(self, **kwargs) -> str:
        """Execute the tool with the given parameters."""
        pass
```

Implement a web search tool in `backend/src/tool/web_search.py`:

```python
import json
from typing import Dict, List, Optional

import aiohttp

from .base import BaseTool


class WebSearchTool(BaseTool):
    """Tool for searching the web."""
    
    @property
    def name(self) -> str:
        return "web_search"
    
    @property
    def description(self) -> str:
        return "Search the web for information."
    
    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    
    async def execute(self, query: str, num_results: int = 5) -> str:
        """Execute a web search."""
        try:
            # Use a free search API (example)
            async with aiohttp.ClientSession() as session:
                params = {
                    "q": query,
                    "num": num_results,
                    "format": "json"
                }
                
                async with session.get(
                    "https://ddg-api.herokuapp.com/search",
                    params=params
                ) as response:
                    if response.status != 200:
                        return f"Error: Search failed with status {response.status}"
                    
                    data = await response.json()
                    
                    results = []
                    for result in data.get("results", []):
                        results.append(
                            f"Title: {result.get('title')}\n"
                            f"URL: {result.get('link')}\n"
                            f"Snippet: {result.get('snippet')}\n"
                        )
                    
                    if not results:
                        return "No results found."
                    
                    return "\n\n".join(results)
        except Exception as e:
            return f"Error executing web search: {str(e)}"
```

Create a tool registry in `backend/src/tool/registry.py`:

```python
from typing import Dict, Optional, Type

from .base import BaseTool
from .code_execution import CodeExecutionTool
from .file_system import FileSystemTool
from .web_browser import WebBrowserTool
from .web_search import WebSearchTool


class ToolRegistry:
    """Registry for available tools."""
    
    _tools: Dict[str, Type[BaseTool]] = {
        "web_search": WebSearchTool,
        "code_execution": CodeExecutionTool,
        "file_system": FileSystemTool,
        "web_browser": WebBrowserTool,
    }
    
    def get_tool(self, name: str) -> Optional[Type[BaseTool]]:
        """Get a tool class by name."""
        return self._tools.get(name.lower())
    
    def register_tool(self, name: str, tool_class: Type[BaseTool]):
        """Register a new tool."""
        self._tools[name.lower()] = tool_class
    
    def get_all_tools(self) -> Dict[str, Type[BaseTool]]:
        """Get all registered tools."""
        return self._tools.copy()
```

### 2.6 API Endpoints

Create FastAPI endpoints in `backend/src/api/app.py`:

```python
import json
import os
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ..agent.manus import ManusAgent
from ..config.config import AgentConfig, Settings, settings
from ..llm.base import Message


class ChatRequest(BaseModel):
    agent_id: str
    message: str


class ChatResponse(BaseModel):
    response: str
    agent_id: str


class AgentListResponse(BaseModel):
    agents: List[Dict]


app = FastAPI(title="Manus AI Clone API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active agents
active_agents: Dict[str, ManusAgent] = {}


def load_agent_config(agent_id: str) -> AgentConfig:
    """Load agent configuration from file."""
    config_path = settings.configs_dir / f"{agent_id}.json"
    
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    with open(config_path, "r") as f:
        config_data = json.load(f)
    
    return AgentConfig(**config_data)


def get_or_create_agent(agent_id: str) -> ManusAgent:
    """Get an existing agent or create a new one."""
    if agent_id in active_agents:
        return active_agents[agent_id]
    
    config = load_agent_config(agent_id)
    agent = ManusAgent(config)
    active_agents[agent_id] = agent
    
    return agent


@app.get("/agents", response_model=AgentListResponse)
async def list_agents():
    """List all available agents."""
    agents = []
    
    for file in os.listdir(settings.configs_dir):
        if file.endswith(".json"):
            agent_id = file[:-5]  # Remove .json extension
            config_path = settings.configs_dir / file
            
            with open(config_path, "r") as f:
                config_data = json.load(f)
            
            agents.append({
                "id": agent_id,
                "name": config_data.get("name", agent_id),
                "description": config_data.get("description", ""),
                "model": config_data.get("llm", {}).get("model_id", "unknown")
            })
    
    return AgentListResponse(agents=agents)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to an agent and get a response."""
    agent = get_or_create_agent(request.agent_id)
    response = await agent.process(request.message)
    
    return ChatResponse(
        response=response,
        agent_id=request.agent_id
    )


@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()
    
    try:
        agent = get_or_create_agent(agent_id)
        
        while True:
            message = await websocket.receive_text()
            response = await agent.process(message)
            await websocket.send_text(response)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")
        await websocket.close()


@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    # Create default agent configurations if they don't exist
    default_configs = [
        {
            "id": "general_assistant",
            "name": "General Assistant",
            "description": "A general-purpose assistant that can help with various tasks.",
            "llm": {
                "provider": settings.default_llm_provider,
                "model_id": "llama3.2",
                "temperature": 0.7,
                "max_tokens": 2048
            },
            "memory": {
                "type": "conversation_buffer",
                "max_messages": 10
            },
            "tools": {
                "web_search": {"enabled": True},
                "code_execution": {"enabled": True},
                "file_system": {"enabled": True},
                "web_browser": {"enabled": True}
            },
            "system_prompt": "You are a helpful assistant that can answer questions and perform tasks.",
            "capabilities": ["general", "research", "coding"]
        },
        {
            "id": "code_assistant",
            "name": "Code Assistant",
            "description": "An assistant specialized in software development.",
            "llm": {
                "provider": settings.default_llm_provider,
                "model_id": "codellama",
                "temperature": 0.3,
                "max_tokens": 4096
            },
            "memory": {
                "type": "conversation_buffer",
                "max_messages": 15
            },
            "tools": {
                "code_execution": {"enabled": True},
                "file_system": {"enabled": True},
                "web_search": {"enabled": True}
            },
            "system_prompt": "You are a coding assistant that helps with programming tasks.",
            "capabilities": ["coding", "debugging", "explanation"]
        }
    ]
    
    for config in default_configs:
        config_path = settings.configs_dir / f"{config['id']}.json"
        
        if not os.path.exists(config_path):
            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)
```

Create a main file to run the API in `backend/src/main.py`:

```python
import uvicorn

from .api.app import app
from .config.config import settings


def main():
    """Run the FastAPI application."""
    uvicorn.run(
        "src.api.app:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )


if __name__ == "__main__":
    main()
```

## 3. Frontend Implementation

### 3.1 Core Components

Create a layout component in `frontend/src/components/layout/Layout.tsx`:

```tsx
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DetailsPanel from './DetailsPanel';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
        <DetailsPanel />
      </div>
    </div>
  );
};

export default Layout;
```

Create a chat interface component in `frontend/src/components/chat/ChatInterface.tsx`:

```tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatInterfaceProps {
  agentId: string;
  agentName: string;
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  agentId,
  agentName,
  onSendMessage,
  messages,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(input);
      setInput('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Agent: {agentName}</h2>
        <button className="p-1 rounded hover:bg-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-3/4 p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.role === 'system'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
```

Create an agent configuration component in `frontend/src/components/agent/AgentConfig.tsx`:

```tsx
import React, { useState } from 'react';

interface AgentConfigProps {
  agent: {
    id: string;
    name: string;
    description: string;
    llm: {
      provider: string;
      model_id: string;
      temperature: number;
      max_tokens: number;
    };
    tools: Record<string, { enabled: boolean }>;
    system_prompt: string;
  };
  onSave: (agent: any) => Promise<void>;
}

const AgentConfig: React.FC<AgentConfigProps> = ({ agent, onSave }) => {
  const [editedAgent, setEditedAgent] = useState({ ...agent });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name.startsWith('llm.')) {
      const llmField = name.split('.')[1];
      setEditedAgent({
        ...editedAgent,
        llm: {
          ...editedAgent.llm,
          [llmField]: value,
        },
      });
    } else {
      setEditedAgent({
        ...editedAgent,
        [name]: value,
      });
    }
  };

  const handleToolToggle = (toolName: string) => {
    setEditedAgent({
      ...editedAgent,
      tools: {
        ...editedAgent.tools,
        [toolName]: {
          ...editedAgent.tools[toolName],
          enabled: !editedAgent.tools[toolName].enabled,
        },
      },
    });
  };

  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    if (name.startsWith('llm.')) {
      const llmField = name.split('.')[1];
      setEditedAgent({
        ...editedAgent,
        llm: {
          ...editedAgent.llm,
          [llmField]: numValue,
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(editedAgent);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Agent Configuration</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={editedAgent.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={editedAgent.description}
            onChange={handleChange}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Model Configuration</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Provider</label>
            <select
              name="llm.provider"
              value={editedAgent.llm.provider}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ollama">Ollama</option>
              <option value="lmstudio">LM Studio</option>
              <option value="llamacpp">Llama.cpp</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Model</label>
            <input
              type="text"
              name="llm.model_id"
              value={editedAgent.llm.model_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Temperature: {editedAgent.llm.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              name="llm.temperature"
              min="0"
              max="2"
              step="0.1"
              value={editedAgent.llm.temperature}
              onChange={handleSliderChange}
              className="mt-1 block w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Tokens: {editedAgent.llm.max_tokens}
            </label>
            <input
              type="range"
              name="llm.max_tokens"
              min="256"
              max="8192"
              step="256"
              value={editedAgent.llm.max_tokens}
              onChange={handleSliderChange}
              className="mt-1 block w-full"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Tools</h3>
          
          <div className="space-y-2">
            {Object.entries(editedAgent.tools).map(([toolName, toolConfig]) => (
              <div key={toolName} className="flex items-center">
                <input
                  type="checkbox"
                  id={`tool-${toolName}`}
                  checked={toolConfig.enabled}
                  onChange={() => handleToolToggle(toolName)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor={`tool-${toolName}`}
                  className="ml-2 block text-sm text-gray-900"
                >
                  {toolName.replace(/_/g, ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">System Prompt</label>
          <textarea
            name="system_prompt"
            value={editedAgent.system_prompt}
            onChange={handleChange}
            rows={5}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default AgentConfig;
```

### 3.2 API Client

Create an API client in `frontend/src/utils/api.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class ApiClient {
  async getAgents(): Promise<Agent[]> {
    const response = await fetch(`${API_BASE_URL}/agents`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.agents;
  }
  
  async sendMessage(agentId: string, message: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        message,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
  }
  
  async getAgentConfig(agentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/config`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent config: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async saveAgentConfig(agentId: string, config: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save agent config: ${response.statusText}`);
    }
  }
  
  createWebSocket(agentId: string): WebSocket {
    return new WebSocket(`ws://${API_BASE_URL.replace(/^http:\/\//, '')}/ws/${agentId}`);
  }
}

export const apiClient = new ApiClient();
```

### 3.3 State Management

Create a state management store using Zustand in `frontend/src/store/index.ts`:

```typescript
import { create } from 'zustand';
import { Agent, Message, apiClient } from '../utils/api';

interface AppState {
  agents: Agent[];
  selectedAgentId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
  
  fetchAgents: () => Promise<void>;
  selectAgent: (agentId: string) => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: (agentId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  agents: [],
  selectedAgentId: null,
  messages: {},
  isLoading: false,
  error: null,
  
  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const agents = await apiClient.getAgents();
      set({ agents, isLoading: false });
      
      // Select the first agent if none is selected
      if (agents.length > 0 && !get().selectedAgentId) {
        get().selectAgent(agents[0].id);
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agents',
      });
    }
  },
  
  selectAgent: (agentId: string) => {
    set({ selectedAgentId: agentId });
    
    // Initialize messages for this agent if not already done
    if (!get().messages[agentId]) {
      set((state) => ({
        messages: {
          ...state.messages,
          [agentId]: [],
        },
      }));
    }
  },
  
  sendMessage: async (message: string) => {
    const { selectedAgentId } = get();
    if (!selectedAgentId) return;
    
    // Add user message to state
    set((state) => ({
      messages: {
        ...state.messages,
        [selectedAgentId]: [
          ...(state.messages[selectedAgentId] || []),
          { role: 'user', content: message },
        ],
      },
      isLoading: true,
    }));
    
    try {
      // Send message to API
      const response = await apiClient.sendMessage(selectedAgentId, message);
      
      // Add assistant response to state
      set((state) => ({
        messages: {
          ...state.messages,
          [selectedAgentId]: [
            ...(state.messages[selectedAgentId] || []),
            { role: 'assistant', content: response },
          ],
        },
        isLoading: false,
      }));
    } catch (error) {
      set((state) => ({
        messages: {
          ...state.messages,
          [selectedAgentId]: [
            ...(state.messages[selectedAgentId] || []),
            {
              role: 'system',
              content: `Error: ${
                error instanceof Error ? error.message : 'Failed to send message'
              }`,
            },
          ],
        },
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
    }
  },
  
  clearMessages: (agentId: string) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [agentId]: [],
      },
    }));
  },
}));
```

### 3.4 Pages

Create the main page in `frontend/src/pages/index.tsx`:

```tsx
import React, { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import ChatInterface from '../components/chat/ChatInterface';
import { useAppStore } from '../store';

export default function Home() {
  const {
    agents,
    selectedAgentId,
    messages,
    isLoading,
    error,
    fetchAgents,
    sendMessage,
  } = useAppStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const currentMessages = selectedAgentId ? messages[selectedAgentId] || [] : [];

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </Layout>
    );
  }

  if (!selectedAgent) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          {isLoading ? (
            <div>Loading agents...</div>
          ) : (
            <div>No agent selected. Please select an agent from the sidebar.</div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ChatInterface
        agentId={selectedAgent.id}
        agentName={selectedAgent.name}
        onSendMessage={sendMessage}
        messages={currentMessages}
      />
    </Layout>
  );
}
```

Create an agent configuration page in `frontend/src/pages/agents/[id].tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import AgentConfig from '../../components/agent/AgentConfig';
import { apiClient } from '../../utils/api';

export default function AgentConfigPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchAgentConfig = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const config = await apiClient.getAgentConfig(id as string);
        setAgent(config);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agent configuration');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgentConfig();
  }, [id]);

  const handleSave = async (updatedAgent: any) => {
    try {
      await apiClient.saveAgentConfig(id as string, updatedAgent);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent configuration');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div>Loading agent configuration...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div>Agent not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <AgentConfig agent={agent} onSave={handleSave} />
      </div>
    </Layout>
  );
}
```

## 4. LLM Integration

### 4.1 Setting Up Ollama

1. Install Ollama:

```bash
# For macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# For Windows, download from https://ollama.com/download
```

2. Pull the Llama model:

```bash
ollama pull llama3.2
```

3. Start the Ollama server:

```bash
ollama serve
```

4. Test the Ollama server:

```bash
curl -X POST http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [{"role": "user", "content": "Hello, how are you?"}]
}'
```

### 4.2 Setting Up LM Studio

1. Download and install LM Studio from https://lmstudio.ai/

2. Launch LM Studio and download a model (e.g., Llama 3.2)

3. Go to the "Developer" tab and start the local server

4. Test the LM Studio server:

```bash
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

### 4.3 Configuring the Backend for Local LLMs

Create a `.env` file in the `backend` directory:

```
# API settings
API_HOST=0.0.0.0
API_PORT=8000

# LLM settings
DEFAULT_LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
LMSTUDIO_BASE_URL=http://localhost:1234

# Optional OpenAI fallback
# OPENAI_API_KEY=your_api_key_here
```

## 5. Agent System Implementation

### 5.1 Creating Custom Agents

To create a custom agent, extend the `BaseAgent` class:

```python
# backend/src/agent/research_agent.py
from typing import List

from ..config.config import AgentConfig
from ..llm.base import Message
from .base import BaseAgent


class ResearchAgent(BaseAgent):
    """Agent specialized for research tasks."""
    
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        self._initialize_system_prompt()
    
    def _initialize_system_prompt(self):
        """Initialize the system prompt for research tasks."""
        self.system_prompt = (
            f"{self.config.system_prompt}\n\n"
            "You are a research assistant specialized in finding and synthesizing information. "
            "Your primary goal is to help users find accurate information and provide "
            "comprehensive answers to their questions. When conducting research, follow these guidelines:\n\n"
            "1. Search for information from multiple sources\n"
            "2. Verify facts across different sources\n"
            "3. Synthesize information into coherent answers\n"
            "4. Cite sources when providing information\n"
            "5. Acknowledge limitations and uncertainties\n\n"
            "Use the available tools to gather information and provide the best possible answers."
        )
    
    async def process(self, user_input: str) -> str:
        """Process user input with research-focused approach."""
        # Add user message to memory
        await self.add_message("user", user_input)
        
        # Get all messages from memory
        messages = await self.get_messages()
        
        # Add system message at the beginning
        messages.insert(0, Message("system", self.system_prompt))
        
        # First, determine if we need to search for information
        planning_response = await self.llm.generate([
            Message("system", "You are a research planning assistant. Your job is to determine if the user's query requires searching for information."),
            Message("user", f"Query: {user_input}\nDoes this query require searching for information? Answer with YES or NO and a brief explanation.")
        ])
        
        needs_search = "YES" in planning_response.content.upper()
        
        if needs_search and "web_search" in self.tools:
            # Execute web search
            search_query = user_input
            search_result = await self.tools["web_search"].execute(query=search_query)
            
            # Add search result to memory
            await self.add_message("system", f"Search results for '{search_query}':\n\n{search_result}")
        
        # Generate response based on all information
        messages = await self.get_messages()
        messages.insert(0, Message("system", self.system_prompt))
        response = await self.llm.generate(messages)
        
        # Add response to memory
        await self.add_message("assistant", response.content)
        
        return response.content
```

Register the custom agent in `backend/src/agent/factory.py`:

```python
from typing import Dict, Type

from ..config.config import AgentConfig
from .base import BaseAgent
from .manus import ManusAgent
from .research_agent import ResearchAgent


class AgentFactory:
    """Factory for creating agent instances."""
    
    _types: Dict[str, Type[BaseAgent]] = {
        "manus": ManusAgent,
        "research": ResearchAgent,
    }
    
    @classmethod
    def create(cls, config: AgentConfig) -> BaseAgent:
        """Create an agent instance based on the type."""
        agent_type = config.id.split("_")[0]  # Extract type from ID (e.g., "research_assistant" -> "research")
        
        if agent_type in cls._types:
            return cls._types[agent_type](config)
        
        # Default to ManusAgent
        return ManusAgent(config)
    
    @classmethod
    def register_type(cls, name: str, agent_class: Type[BaseAgent]):
        """Register a new agent type."""
        cls._types[name.lower()] = agent_class
```

## 6. Tool Framework Implementation

### 6.1 Implementing Core Tools

Create a code execution tool in `backend/src/tool/code_execution.py`:

```python
import os
import subprocess
import tempfile
from typing import Dict

from .base import BaseTool


class CodeExecutionTool(BaseTool):
    """Tool for executing code."""
    
    @property
    def name(self) -> str:
        return "code_execution"
    
    @property
    def description(self) -> str:
        return "Execute code in various programming languages."
    
    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The code to execute"
                },
                "language": {
                    "type": "string",
                    "description": "The programming language",
                    "enum": ["python", "javascript", "bash"]
                }
            },
            "required": ["code", "language"]
        }
    
    async def execute(self, code: str, language: str) -> str:
        """Execute code in the specified language."""
        if language.lower() == "python":
            return await self._execute_python(code)
        elif language.lower() == "javascript":
            return await self._execute_javascript(code)
        elif language.lower() == "bash":
            return await self._execute_bash(code)
        else:
            return f"Unsupported language: {language}"
    
    async def _execute_python(self, code: str) -> str:
        """Execute Python code."""
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
            f.write(code.encode())
            temp_file = f.name
        
        try:
            result = subprocess.run(
                ["python", temp_file],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error: {result.stderr}"
        except subprocess.TimeoutExpired:
            return "Error: Execution timed out"
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            os.unlink(temp_file)
    
    async def _execute_javascript(self, code: str) -> str:
        """Execute JavaScript code using Node.js."""
        with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as f:
            f.write(code.encode())
            temp_file = f.name
        
        try:
            result = subprocess.run(
                ["node", temp_file],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error: {result.stderr}"
        except subprocess.TimeoutExpired:
            return "Error: Execution timed out"
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            os.unlink(temp_file)
    
    async def _execute_bash(self, code: str) -> str:
        """Execute Bash code."""
        with tempfile.NamedTemporaryFile(suffix=".sh", delete=False) as f:
            f.write(code.encode())
            temp_file = f.name
        
        try:
            os.chmod(temp_file, 0o755)  # Make the script executable
            
            result = subprocess.run(
                ["bash", temp_file],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                return f"Error: {result.stderr}"
        except subprocess.TimeoutExpired:
            return "Error: Execution timed out"
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            os.unlink(temp_file)
```

Create a file system tool in `backend/src/tool/file_system.py`:

```python
import os
from typing import Dict, Optional

from .base import BaseTool


class FileSystemTool(BaseTool):
    """Tool for interacting with the file system."""
    
    @property
    def name(self) -> str:
        return "file_system"
    
    @property
    def description(self) -> str:
        return "Read, write, and manage files on the file system."
    
    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "description": "The operation to perform",
                    "enum": ["read", "write", "list", "delete"]
                },
                "path": {
                    "type": "string",
                    "description": "The file or directory path"
                },
                "content": {
                    "type": "string",
                    "description": "The content to write (for write operation)"
                }
            },
            "required": ["operation", "path"]
        }
    
    async def execute(
        self, operation: str, path: str, content: Optional[str] = None
    ) -> str:
        """Execute a file system operation."""
        operation = operation.lower()
        
        if operation == "read":
            return await self._read_file(path)
        elif operation == "write":
            return await self._write_file(path, content)
        elif operation == "list":
            return await self._list_directory(path)
        elif operation == "delete":
            return await self._delete_file(path)
        else:
            return f"Unsupported operation: {operation}"
    
    async def _read_file(self, path: str) -> str:
        """Read a file."""
        try:
            with open(path, "r") as f:
                return f.read()
        except FileNotFoundError:
            return f"Error: File not found: {path}"
        except IsADirectoryError:
            return f"Error: {path} is a directory, not a file"
        except Exception as e:
            return f"Error reading file: {str(e)}"
    
    async def _write_file(self, path: str, content: Optional[str]) -> str:
        """Write to a file."""
        if content is None:
            return "Error: No content provided for write operation"
        
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            
            with open(path, "w") as f:
                f.write(content)
            
            return f"Successfully wrote to {path}"
        except IsADirectoryError:
            return f"Error: {path} is a directory, not a file"
        except Exception as e:
            return f"Error writing to file: {str(e)}"
    
    async def _list_directory(self, path: str) -> str:
        """List contents of a directory."""
        try:
            if not os.path.isdir(path):
                return f"Error: {path} is not a directory"
            
            items = os.listdir(path)
            
            result = f"Contents of {path}:\n"
            for item in items:
                item_path = os.path.join(path, item)
                item_type = "Directory" if os.path.isdir(item_path) else "File"
                result += f"- {item} ({item_type})\n"
            
            return result
        except FileNotFoundError:
            return f"Error: Directory not found: {path}"
        except Exception as e:
            return f"Error listing directory: {str(e)}"
    
    async def _delete_file(self, path: str) -> str:
        """Delete a file."""
        try:
            if os.path.isdir(path):
                return f"Error: {path} is a directory, not a file"
            
            os.remove(path)
            return f"Successfully deleted {path}"
        except FileNotFoundError:
            return f"Error: File not found: {path}"
        except Exception as e:
            return f"Error deleting file: {str(e)}"
```

## 7. Memory System Implementation

### 7.1 Implementing Vector Store Memory

Create a vector store memory in `backend/src/memory/vector_store.py`:

```python
import os
from typing import List, Optional

import faiss
import numpy as np

from ..config.config import MemoryConfig, settings
from ..llm.base import BaseLLM, Message
from ..llm.factory import LLMFactory
from .base import BaseMemory


class VectorStoreMemory(BaseMemory):
    """Memory implementation using vector store for semantic search."""
    
    def __init__(self, config: MemoryConfig):
        self.config = config
        self.messages: List[Message] = []
        self.embeddings: List[np.ndarray] = []
        self.index: Optional[faiss.IndexFlatL2] = None
        
        # Create LLM for embeddings
        llm_config = settings.default_llm_config
        llm_config.model_id = config.embedding_model
        self.llm = LLMFactory.create(llm_config)
        
        # Initialize vector store
        self._initialize_vector_store()
    
    def _initialize_vector_store(self):
        """Initialize the vector store."""
        # Create directory if it doesn't exist
        if self.config.vector_store_path:
            os.makedirs(os.path.dirname(self.config.vector_store_path), exist_ok=True)
        
        # Initialize FAISS index
        self.index = faiss.IndexFlatL2(1536)  # Default embedding dimension
    
    async def add_message(self, message: Message):
        """Add a message to memory."""
        self.messages.append(message)
        
        # Generate embedding for the message
        embedding = await self._get_embedding(message.content)
        self.embeddings.append(embedding)
        
        # Add to FAISS index
        if self.index is not None:
            self.index.add(np.array([embedding], dtype=np.float32))
    
    async def get_messages(self) -> List[Message]:
        """Get all messages from memory."""
        return self.messages.copy()
    
    async def search(self, query: str, k: int = 5) -> List[Message]:
        """Search for messages similar to the query."""
        if not self.messages or self.index is None:
            return []
        
        # Generate embedding for the query
        query_embedding = await self._get_embedding(query)
        
        # Search in FAISS index
        D, I = self.index.search(np.array([query_embedding], dtype=np.float32), k)
        
        # Return the most similar messages
        return [self.messages[i] for i in I[0] if i < len(self.messages)]
    
    async def clear(self):
        """Clear all messages from memory."""
        self.messages = []
        self.embeddings = []
        
        # Reset FAISS index
        if self.index is not None:
            self.index.reset()
    
    async def _get_embedding(self, text: str) -> np.ndarray:
        """Get embedding for text."""
        embeddings = await self.llm.get_embeddings([text])
        return np.array(embeddings[0], dtype=np.float32)
```

## 8. Testing and Validation

### 8.1 Backend Tests

Create a test for the Manus agent in `backend/tests/test_agent.py`:

```python
import pytest

from src.agent.manus import ManusAgent
from src.config.config import AgentConfig, LLMConfig, MemoryConfig, ToolConfig


@pytest.fixture
def agent_config():
    """Create a test agent configuration."""
    return AgentConfig(
        id="test_agent",
        name="Test Agent",
        description="Agent for testing",
        llm=LLMConfig(
            provider="mock",  # Use a mock provider for testing
            model_id="mock-model",
            temperature=0.7,
            max_tokens=100
        ),
        memory=MemoryConfig(
            type="conversation_buffer",
            max_messages=10
        ),
        tools={
            "mock_tool": ToolConfig(enabled=True)
        },
        system_prompt="You are a test assistant.",
        capabilities=["testing"]
    )


@pytest.mark.asyncio
async def test_agent_initialization(agent_config, monkeypatch):
    """Test agent initialization."""
    # Mock the LLMFactory and ToolRegistry
    monkeypatch.setattr(
        "src.llm.factory.LLMFactory.create",
        lambda config: MockLLM(config)
    )
    monkeypatch.setattr(
        "src.tool.registry.ToolRegistry.get_tool",
        lambda self, tool_id: MockTool if tool_id == "mock_tool" else None
    )
    
    # Create agent
    agent = ManusAgent(agent_config)
    
    # Check initialization
    assert agent.config.id == "test_agent"
    assert agent.config.name == "Test Agent"
    assert "mock_tool" in agent.tools
    assert isinstance(agent.tools["mock_tool"], MockTool)


@pytest.mark.asyncio
async def test_agent_process(agent_config, monkeypatch):
    """Test agent processing a message."""
    # Mock the LLMFactory and ToolRegistry
    monkeypatch.setattr(
        "src.llm.factory.LLMFactory.create",
        lambda config: MockLLM(config)
    )
    monkeypatch.setattr(
        "src.tool.registry.ToolRegistry.get_tool",
        lambda self, tool_id: MockTool if tool_id == "mock_tool" else None
    )
    
    # Create agent
    agent = ManusAgent(agent_config)
    
    # Process a message
    response = await agent.process("Hello, world!")
    
    # Check response
    assert response == "Mock response"
    
    # Check memory
    messages = await agent.get_messages()
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[0].content == "Hello, world!"
    assert messages[1].role == "assistant"
    assert messages[1].content == "Mock response"


# Mock classes for testing

class MockLLM:
    """Mock LLM for testing."""
    
    def __init__(self, config):
        self.config = config
    
    async def generate(self, messages):
        """Generate a mock response."""
        return MockResponse("Mock response")
    
    async def generate_with_tools(self, messages, tools):
        """Generate a mock response with tools."""
        return MockResponse("Mock response with tools")
    
    async def get_embeddings(self, texts):
        """Generate mock embeddings."""
        return [[0.1, 0.2, 0.3] for _ in texts]


class MockResponse:
    """Mock LLM response for testing."""
    
    def __init__(self, content):
        self.content = content
        self.usage = {}


class MockTool:
    """Mock tool for testing."""
    
    def __init__(self, parameters=None):
        self.parameters = parameters or {}
    
    @property
    def name(self):
        return "mock_tool"
    
    @property
    def description(self):
        return "A mock tool for testing"
    
    @property
    def parameters(self):
        return {
            "type": "object",
            "properties": {
                "param": {
                    "type": "string",
                    "description": "A parameter"
                }
            }
        }
    
    @parameters.setter
    def parameters(self, value):
        self._parameters = value
    
    async def execute(self, **kwargs):
        """Execute the mock tool."""
        return "Mock tool result"
```

### 8.2 Frontend Tests

Create a test for the chat interface in `frontend/src/components/chat/ChatInterface.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from './ChatInterface';

describe('ChatInterface', () => {
  const mockMessages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there! How can I help you?' },
  ];
  
  const mockOnSendMessage = jest.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders the chat interface with agent name', () => {
    render(
      <ChatInterface
        agentId="test-agent"
        agentName="Test Agent"
        onSendMessage={mockOnSendMessage}
        messages={mockMessages}
      />
    );
    
    expect(screen.getByText('Agent: Test Agent')).toBeInTheDocument();
  });
  
  it('displays messages correctly', () => {
    render(
      <ChatInterface
        agentId="test-agent"
        agentName="Test Agent"
        onSendMessage={mockOnSendMessage}
        messages={mockMessages}
      />
    );
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help you?')).toBeInTheDocument();
  });
  
  it('sends a message when the form is submitted', async () => {
    render(
      <ChatInterface
        agentId="test-agent"
        agentName="Test Agent"
        onSendMessage={mockOnSendMessage}
        messages={mockMessages}
      />
    );
    
    const input = screen.getByPlaceholderText('Type your message...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('New message');
    });
    
    expect(input).toHaveValue('');
  });
  
  it('disables input while loading', async () => {
    // Mock implementation that doesn't resolve immediately
    const delayedMockOnSendMessage = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(
      <ChatInterface
        agentId="test-agent"
        agentName="Test Agent"
        onSendMessage={delayedMockOnSendMessage}
        messages={mockMessages}
      />
    );
    
    const input = screen.getByPlaceholderText('Type your message...');
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.submit(form!);
    
    // Input should be disabled during loading
    expect(input).toBeDisabled();
    
    // Wait for the mock to resolve
    await waitFor(() => {
      expect(delayedMockOnSendMessage).toHaveBeenCalledWith('New message');
    });
  });
});
```

## 9. Deployment

### 9.1 Docker Setup

Create a `Dockerfile` for the backend:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/pyproject.toml .

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Copy application code
COPY backend/src ./src

# Create necessary directories
RUN mkdir -p data/configs data/models data/vector_stores

# Expose the API port
EXPOSE 8000

# Run the application
CMD ["python", "-m", "src.main"]
```

Create a `Dockerfile` for the frontend:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY frontend/ .

# Set environment variables
ENV NEXT_PUBLIC_API_URL=http://backend:8000

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose the frontend port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

Create a `docker-compose.yml` file:

```yaml
version: '3'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - API_HOST=0.0.0.0
      - API_PORT=8000
      - DEFAULT_LLM_PROVIDER=ollama
      - OLLAMA_BASE_URL=http://ollama:11434
    depends_on:
      - ollama

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

### 9.2 Running the Application

1. Start the application with Docker Compose:

```bash
docker-compose up -d
```

2. Pull the Llama model in the Ollama container:

```bash
docker-compose exec ollama ollama pull llama3.2
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

### 9.3 Local Development Setup

For local development:

1. Start the backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e ".[dev]"
python -m src.main
```

2. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Start Ollama:

```bash
ollama serve
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
