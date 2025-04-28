#!/usr/bin/env python
import nltk
import os
import sys

def setup_nltk():
    """
    Download required NLTK data packages
    """
    print("Setting up NLTK data...")
    
    # Create a directory for NLTK data if it doesn't exist
    nltk_data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'nltk_data')
    
    if not os.path.exists(nltk_data_dir):
        print(f"Creating NLTK data directory: {nltk_data_dir}")
        os.makedirs(nltk_data_dir, exist_ok=True)
    
    # Set the NLTK data path
    nltk.data.path.append(nltk_data_dir)
    
    # Download required NLTK packages
    packages = [
        'punkt',      # For tokenization
        'averaged_perceptron_tagger',  # For part-of-speech tagging
        'stopwords',  # For stopword removal
        'wordnet',    # For lemmatization
        'omw-1.4'     # Open Multilingual Wordnet
    ]
    
    for package in packages:
        try:
            print(f"Downloading NLTK package: {package}")
            nltk.download(package, download_dir=nltk_data_dir, quiet=False)
        except Exception as e:
            print(f"Error downloading {package}: {str(e)}")
    
    # Verify the downloads
    for package in packages:
        try:
            nltk.data.find(f'tokenizers/{package}')
            print(f"Successfully installed: {package}")
        except LookupError:
            try:
                nltk.data.find(f'corpora/{package}')
                print(f"Successfully installed: {package}")
            except LookupError:
                try:
                    nltk.data.find(f'taggers/{package}')
                    print(f"Successfully installed: {package}")
                except LookupError:
                    print(f"WARNING: Could not verify installation of {package}")
    
    print("NLTK setup complete!")
    return True

if __name__ == "__main__":
    success = setup_nltk()
    sys.exit(0 if success else 1) 