# File: backend/ai_scripts/embed_text.py
# Purpose: Generate text embeddings using sentence-transformers
# Date: 2025-12-06
#
# This script generates embeddings for text using a lightweight model
# Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)

import sys
import json
import os

# Fix numpy import issues by setting environment variable
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

try:
    # Try to import numpy first to catch any issues early
    import numpy as np
    # Check numpy version compatibility
    numpy_version = np.__version__
    if numpy_version.startswith('2.'):
        print(json.dumps({"warning": f"NumPy {numpy_version} detected. Some versions may have compatibility issues."}), file=sys.stderr)
except ImportError as e:
    print(json.dumps({"error": f"Failed to import numpy: {str(e)}. Please reinstall: pip install --upgrade --force-reinstall numpy"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"NumPy import error: {str(e)}. Try: pip install --upgrade --force-reinstall numpy"}), file=sys.stderr)
    sys.exit(1)

try:
    from sentence_transformers import SentenceTransformer
    MODEL_AVAILABLE = True
except ImportError as e:
    MODEL_AVAILABLE = False
    print(json.dumps({"error": f"sentence-transformers not installed or import failed: {str(e)}. Install with: pip install sentence-transformers"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    MODEL_AVAILABLE = False
    print(json.dumps({"error": f"Failed to import sentence-transformers: {str(e)}. Try: pip install --upgrade --force-reinstall sentence-transformers"}), file=sys.stderr)
    sys.exit(1)

# Load model (cached after first load)
_model = None

def get_model():
    """Lazy load model to avoid reloading on each call"""
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(json.dumps({"error": f"Failed to load model: {str(e)}"}), file=sys.stderr)
            sys.exit(1)
    return _model

def generate_embedding(text):
    """
    Generate embedding for text
    
    Args:
        text: Text string to embed
    
    Returns:
        list: Embedding vector (384 dimensions)
    """
    if not text or not text.strip():
        return None
    
    try:
        model = get_model()
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(json.dumps({"error": f"Embedding generation failed: {str(e)}"}), file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        result = {"error": "Usage: python embed_text.py <text>"}
        print(json.dumps(result))
        sys.exit(1)
    
    text = sys.argv[1]
    embedding = generate_embedding(text)
    
    if embedding:
        print(json.dumps(embedding))
    else:
        result = {"error": "Failed to generate embedding"}
        print(json.dumps(result))
        sys.exit(1)

