#!/usr/bin/env python
import os
import sys
import shutil
import tempfile

# First, save the original NLTK_DATA environment variable if it exists
original_nltk_data = os.environ.get('NLTK_DATA', '')

# Set a temporary directory for NLTK data to simulate a fresh environment
temp_dir = tempfile.mkdtemp(prefix='nltk_test_')
os.environ['NLTK_DATA'] = temp_dir
print(f"Set temporary NLTK_DATA to: {temp_dir}")

# Now import our utility module which should handle the NLTK setup
try:
    from utils import safe_tokenize
    
    # Test text
    test_text = """
    This is a test sentence with NLTK. This tests our tokenization in a clean environment.
    We want to make sure it works correctly in production. Multiple sentences should be handled properly!
    """
    
    # Try tokenizing
    sentences = safe_tokenize(test_text)
    print(f"Successfully tokenized into {len(sentences)} sentences:")
    for i, sentence in enumerate(sentences, 1):
        print(f"{i}. {sentence}")
    
    success = True
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    success = False

# Clean up
try:
    # Restore original NLTK_DATA if it existed
    if original_nltk_data:
        os.environ['NLTK_DATA'] = original_nltk_data
    else:
        os.environ.pop('NLTK_DATA', None)
    
    # Remove the temporary directory
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"Cleaned up temporary directory: {temp_dir}")
except Exception as cleanup_err:
    print(f"Warning during cleanup: {str(cleanup_err)}")

# Exit with appropriate status code
sys.exit(0 if success else 1) 