from datasets import Dataset, Audio
from huggingface_hub import create_repo
import os, glob, pandas as pd

# ⚙️ CHANGE THIS to your actual HF username

USER = "WLCODING"
REPO_ID = f"{USER}/edm_drums_dataset"

# create a private dataset repo on your Hugging Face account
create_repo(REPO_ID, repo_type="dataset", private=True, exist_ok=True)

# point to your local drum folders
base_path = "drumset"

rows = []
for label in os.listdir(base_path):
    folder_path = os.path.join(base_path, label)
    if os.path.isdir(folder_path):
        for f in glob.glob(os.path.join(folder_path, "*.wav")):
            rows.append({"audio": f, "label": label})

# turn into a Hugging Face dataset
df = pd.DataFrame(rows)
ds = Dataset.from_pandas(df)
ds = ds.cast_column("audio", Audio())

# upload everything
ds.push_to_hub(REPO_ID)
print(f"✅ Uploaded! View it here: https://huggingface.co/datasets/{REPO_ID}")
