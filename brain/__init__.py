"""A repo-scoped agent with a swappable brain and a policy gate."""

from .loop import Agent, load_memory
from .policy import Policy

__all__ = ["Agent", "Policy", "load_memory"]
__version__ = "0.1.0"
