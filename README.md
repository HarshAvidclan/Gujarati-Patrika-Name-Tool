# Gujarati Patrika Name Filler

A desktop app for adding Gujarati member names to the Patrika template and
exporting print-ready PDFs. It supports generating one PDF or a batch of PDFs
from a list of names.

## Requirements

- Python 3
- Pillow 10.0.0 or newer

## Run

Install the dependency and start the app:

```bash
python3 -m pip install -r requirements.txt
python3 Gujarati_Patrika_Name_Filler.py
```

Enter a Gujarati name to generate one PDF, or enter one name per line to
generate a batch. PDFs are saved to the `Generated` folder by default; the app
also lets you choose another output folder.

The included `Patrika_Clean_Template.png` and `NotoSansGujarati-Regular.ttf`
are required by the app and should remain alongside the Python script.

This is a desktop Tkinter application. The repository hosts its source and
required assets; it does not run as a web application.
