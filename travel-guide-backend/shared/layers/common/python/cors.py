"""
CORS helper functions for Lambda responses
Re-export from utils.cors for backward compatibility
"""
from utils.cors import ok, error, options

__all__ = ['ok', 'error', 'options']
