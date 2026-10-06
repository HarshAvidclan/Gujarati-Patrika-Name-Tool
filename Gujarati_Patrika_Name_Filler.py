import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

from PIL import Image, ImageDraw, ImageFont

APP_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(APP_DIR, "Patrika_Clean_Template.png")
FONT = os.path.join(APP_DIR, "NotoSansGujarati-Regular.ttf")

DPI = 300
PX_PER_PT = DPI / 72

# Name area: immediately after "સ્નેહી," and before the end of the underline.
NAME_X1_PT = 58
NAME_X2_PT = 216
NAME_BASELINE_PT = 275
MAX_WIDTH = int((NAME_X2_PT - NAME_X1_PT) * PX_PER_PT)

TEXT_COLOR = (125, 24, 73, 255)


def safe_filename(name):
    bad = '<>:"/\\|?*'
    return "".join("_" if c in bad else c for c in name).strip() or "Member"


def make_text_layer(name):
    # Automatically reduce the font until the complete Gujarati name fits.
    size_pt = 16.5
    min_size_pt = 9.5

    while size_pt >= min_size_pt:
        font = ImageFont.truetype(FONT, int(size_pt * PX_PER_PT))
        bbox = font.getbbox(name)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]

        if width <= MAX_WIDTH:
            layer = Image.new("RGBA", (width + 20, height + 20), (0, 0, 0, 0))
            draw = ImageDraw.Draw(layer)
            draw.text(
                (10 - bbox[0], 10 - bbox[1]),
                name,
                font=font,
                fill=TEXT_COLOR,
            )
            return layer

        size_pt -= 0.25

    # Extremely long names: wrap by words instead of overflowing the line.
    font = ImageFont.truetype(FONT, int(min_size_pt * PX_PER_PT))
    words = name.split()
    lines = []
    current = ""

    for word in words:
        test = (current + " " + word).strip()
        bbox = font.getbbox(test)
        width = bbox[2] - bbox[0]

        if width <= MAX_WIDTH:
            current = test
        else:
            if current:
                lines.append(current)
            current = word

    if current:
        lines.append(current)

    if not lines:
        lines = [name]

    line_height = int(min_size_pt * PX_PER_PT * 1.25)
    widths = []
    for line in lines:
        b = font.getbbox(line)
        widths.append(b[2] - b[0])

    layer_width = min(MAX_WIDTH, max(widths) + 20)
    layer_height = line_height * len(lines) + 20
    layer = Image.new("RGBA", (layer_width, layer_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    y = 10
    for line, width in zip(lines, widths):
        x = (layer_width - width) // 2
        draw.text((x, y), line, font=font, fill=TEXT_COLOR)
        y += line_height

    return layer


def generate_pdf(name):
    if not os.path.isfile(TEMPLATE):
        raise FileNotFoundError("Patrika_Clean_Template.png was not found.")

    if not os.path.isfile(FONT):
        raise FileNotFoundError("NotoSansGujarati-Regular.ttf was not found.")

    background = Image.open(TEMPLATE).convert("RGB")
    layer = make_text_layer(name)

    area_x1 = int(NAME_X1_PT * PX_PER_PT)
    area_x2 = int(NAME_X2_PT * PX_PER_PT)
    area_center = (area_x1 + area_x2) // 2

    x = area_center - layer.width // 2
    baseline = int(NAME_BASELINE_PT * PX_PER_PT)
    y = baseline - layer.height + 8

    # Keep the name inside the intended name area.
    x = max(area_x1, min(x, area_x2 - layer.width))

    background.paste(layer, (x, y), layer)

    output_dir = output_var.get().strip() or os.path.join(APP_DIR, "Generated")
    os.makedirs(output_dir, exist_ok=True)

    output = os.path.join(output_dir, f"Patrika_{safe_filename(name)}.pdf")

    # PDF is generated at 300 DPI for good print quality.
    background.save(output, "PDF", resolution=300.0)
    return output


def generate():
    name = name_var.get().strip()
    if not name:
        messagebox.showwarning("Name required", "Enter the Gujarati member name.")
        return

    try:
        output = generate_pdf(name)
        status_var.set(f"Created: {output}")
        messagebox.showinfo(
            "PDF Created",
            f"Your Patrika is ready.\n\n{output}"
        )
    except Exception as e:
        messagebox.showerror("Error", str(e))


def generate_batch():
    text = batch_text.get("1.0", "end").strip()
    names = [x.strip() for x in text.splitlines() if x.strip()]

    if not names:
        messagebox.showwarning(
            "Names required",
            "Enter one Gujarati member name per line."
        )
        return

    try:
        created = []
        for name in names:
            created.append(generate_pdf(name))

        status_var.set(f"Created {len(created)} PDFs.")
        messagebox.showinfo(
            "Batch Complete",
            f"Created {len(created)} individual PDFs in:\n\n"
            f"{output_var.get().strip() or os.path.join(APP_DIR, 'Generated')}"
        )
    except Exception as e:
        messagebox.showerror("Error", str(e))


def choose_output():
    path = filedialog.askdirectory(title="Select output folder")
    if path:
        output_var.set(path)


def open_output():
    path = output_var.get().strip() or os.path.join(APP_DIR, "Generated")
    os.makedirs(path, exist_ok=True)

    if sys.platform == "darwin":
        subprocess.run(["open", path])
    elif os.name == "nt":
        os.startfile(path)
    else:
        subprocess.run(["xdg-open", path])


root = tk.Tk()
root.title("Gujarati Patrika Name Filler")
root.geometry("720x620")
root.resizable(False, False)

frame = ttk.Frame(root, padding=22)
frame.pack(fill="both", expand=True)

ttk.Label(
    frame,
    text="Gujarati Patrika Name Filler",
    font=("Arial", 20, "bold")
).pack(anchor="w")

ttk.Label(
    frame,
    text="Enter a member name in Gujarati and generate a ready-to-print PDF.",
).pack(anchor="w", pady=(5, 18))

ttk.Label(frame, text="Single Member Name").pack(anchor="w")
name_var = tk.StringVar()
entry = ttk.Entry(frame, textvariable=name_var, font=("Arial", 16))
entry.pack(fill="x", pady=(5, 12))
entry.focus()

ttk.Button(
    frame,
    text="Generate PDF",
    command=generate
).pack(anchor="w", pady=(0, 20))

ttk.Separator(frame).pack(fill="x", pady=(0, 18))

ttk.Label(
    frame,
    text="Or generate many members at once",
    font=("Arial", 13, "bold")
).pack(anchor="w")

ttk.Label(
    frame,
    text="Put one Gujarati name on each line:"
).pack(anchor="w", pady=(4, 5))

batch_text = tk.Text(frame, height=8, font=("Arial", 14))
batch_text.pack(fill="x", pady=(0, 10))

ttk.Button(
    frame,
    text="Generate All PDFs",
    command=generate_batch
).pack(anchor="w", pady=(0, 15))

ttk.Label(frame, text="Output Folder").pack(anchor="w")
output_var = tk.StringVar(value=os.path.join(APP_DIR, "Generated"))
row = ttk.Frame(frame)
row.pack(fill="x", pady=(5, 10))

ttk.Entry(row, textvariable=output_var).pack(side="left", fill="x", expand=True)
ttk.Button(row, text="Browse", command=choose_output).pack(side="left", padx=(8, 0))
ttk.Button(row, text="Open", command=open_output).pack(side="left", padx=(8, 0))

status_var = tk.StringVar(value="Ready")
ttk.Label(frame, textvariable=status_var, foreground="#555").pack(
    anchor="w", pady=(12, 0)
)

ttk.Label(
    frame,
    text="Names automatically fit the available line width. Very long names are wrapped instead of overflowing.",
    foreground="#666",
    wraplength=650,
).pack(anchor="w", pady=(8, 0))

root.mainloop()
