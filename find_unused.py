import os, glob, re

frontend_files = glob.glob('frontend/src/**/*.jsx', recursive=True) + glob.glob('frontend/src/**/*.js', recursive=True)
unused = []

for f in frontend_files:
    filename = os.path.basename(f)
    if filename in ['main.jsx', 'App.jsx', 'index.js', 'api.js']:
        continue
    name_without_ext = os.path.splitext(filename)[0]
    
    # check if referenced
    is_used = False
    for other in frontend_files:
        if other == f: continue
        with open(other, 'r') as file:
            content = file.read()
            if name_without_ext in content:
                is_used = True
                break
    if not is_used:
        unused.append(f)

print("Unused React Files:")
for u in unused:
    print(u)
