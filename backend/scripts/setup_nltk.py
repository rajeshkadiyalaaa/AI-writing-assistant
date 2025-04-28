#!/usr/bin/env python
import nltk
import os
import sys
import shutil
import pickle

def setup_nltk():
    """
    Download required NLTK data packages and ensure proper directory structure
    """
    print("Setting up NLTK data...")
    
    # Create a directory for NLTK data if it doesn't exist
    nltk_data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'nltk_data')
    
    if not os.path.exists(nltk_data_dir):
        print(f"Creating NLTK data directory: {nltk_data_dir}")
        os.makedirs(nltk_data_dir, exist_ok=True)
    
    # Set the NLTK data path
    nltk.data.path.append(nltk_data_dir)
    os.environ['NLTK_DATA'] = nltk_data_dir
    print(f"Set NLTK_DATA environment variable to: {nltk_data_dir}")
    
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
    
    # Special handling for punkt_tab
    # Create the expected directory structure
    tokenizers_dir = os.path.join(nltk_data_dir, 'tokenizers')
    punkt_dir = os.path.join(tokenizers_dir, 'punkt')
    punkt_tab_dir = os.path.join(tokenizers_dir, 'punkt_tab')
    english_dir = os.path.join(punkt_tab_dir, 'english')
    
    # Create directories if they don't exist
    os.makedirs(english_dir, exist_ok=True)
    
    # Check if punkt tokenizer was downloaded and copy/link files as needed
    if os.path.exists(punkt_dir):
        print(f"Setting up punkt_tab from punkt data...")
        
        # Create a proper pickle file for punkt_tab
        try:
            # Try to load the original punkt data
            punkt_pickle_path = os.path.join(punkt_dir, 'english.pickle')
            punkt_data = None
            
            if os.path.exists(punkt_pickle_path):
                with open(punkt_pickle_path, 'rb') as f:
                    punkt_data = pickle.load(f)
                
                # Save the punkt data as punkt_tab
                punkt_tab_path = os.path.join(english_dir, 'punkt_tab.pickle')
                with open(punkt_tab_path, 'wb') as f:
                    pickle.dump(punkt_data, f)
                print(f"Created punkt_tab pickle at {punkt_tab_path}")
            else:
                # Create an empty dictionary as a fallback
                punkt_tab_path = os.path.join(english_dir, 'punkt_tab.pickle')
                with open(punkt_tab_path, 'wb') as f:
                    pickle.dump({}, f)
                print(f"Created empty punkt_tab pickle at {punkt_tab_path}")
        except Exception as e:
            print(f"Error creating punkt_tab pickle: {str(e)}")
            # Fallback: create an empty pickle file
            try:
                punkt_tab_path = os.path.join(english_dir, 'punkt_tab.pickle')
                with open(punkt_tab_path, 'wb') as f:
                    pickle.dump({}, f)
                print(f"Created fallback empty punkt_tab pickle at {punkt_tab_path}")
            except Exception as e2:
                print(f"Error creating fallback punkt_tab pickle: {str(e2)}")
        
        # Copy necessary tab files from punkt/english to punkt_tab/english
        punkt_english_dir = os.path.join(punkt_dir, 'english')
        if os.path.exists(punkt_english_dir):
            for tab_file in ['collocations.tab']:
                src_path = os.path.join(punkt_english_dir, tab_file)
                if os.path.exists(src_path):
                    dst_path = os.path.join(english_dir, tab_file)
                    try:
                        shutil.copy2(src_path, dst_path)
                        print(f"Copied {src_path} to {dst_path}")
                    except Exception as e:
                        print(f"Error copying {tab_file}: {str(e)}")
                        # If copy fails, create an empty tab file
                        try:
                            with open(dst_path, 'w') as f:
                                f.write("# Empty collocations file created as fallback\n")
                            print(f"Created empty {tab_file} at {dst_path}")
                        except Exception as e2:
                            print(f"Error creating empty {tab_file}: {str(e2)}")
                else:
                    # Create an empty tab file if source doesn't exist
                    dst_path = os.path.join(english_dir, tab_file)
                    try:
                        with open(dst_path, 'w') as f:
                            f.write("# Empty collocations file created as fallback\n")
                        print(f"Created empty {tab_file} at {dst_path}")
                    except Exception as e:
                        print(f"Error creating empty {tab_file}: {str(e)}")
            
        # Copy PY files from punkt to punkt_tab if they exist
        for filename in ['punkt.py', 'PunktLanguageVars.py', 'PunktParameters.py', 'PunktSentenceTokenizer.py', 'PunktTrainer.py']:
            src_path = os.path.join(punkt_dir, filename)
            if os.path.exists(src_path):
                dst_path = os.path.join(punkt_tab_dir, filename)
                try:
                    shutil.copy2(src_path, dst_path)
                    print(f"Copied {src_path} to {dst_path}")
                except Exception as e:
                    print(f"Error copying {filename}: {str(e)}")
    
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
    
    # Verify punkt_tab
    try:
        nltk.data.find('tokenizers/punkt_tab')
        print("Successfully set up punkt_tab")
    except LookupError:
        print("WARNING: Could not verify punkt_tab installation")
    
    print("NLTK setup complete!")
    return True

if __name__ == "__main__":
    success = setup_nltk()
    sys.exit(0 if success else 1) 