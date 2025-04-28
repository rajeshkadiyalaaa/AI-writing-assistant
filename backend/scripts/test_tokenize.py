#!/usr/bin/env python
import sys
from utils import safe_tokenize

# Test text for tokenization
test_text = """
This is a test sentence. Here's another one! And a third? 
Let's see if our tokenization works properly.
We need to make sure it handles various punctuation marks.
Even with unusual formatting... It should work fine.
"""

def main():
    print("Testing safe_tokenize function...")
    try:
        sentences = safe_tokenize(test_text)
        print(f"Successfully tokenized text into {len(sentences)} sentences:")
        for i, sentence in enumerate(sentences, 1):
            print(f"{i}. {sentence}")
        return True
    except Exception as e:
        print(f"Error testing tokenization: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 