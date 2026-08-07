import re, os

SRC = r"C:\Users\mosescodes\Downloads\evenova-fixed\frontend\src"

UI = ["Btn","Inp","Card","Bdg","StatCard","Toast","Modal","QRDisplay"]

for d in [os.path.join(SRC,"pages"), os.path.join(SRC,"components")]:
    for root, _, files in os.walk(d):
        for fname in files:
            if not fname.endswith(".jsx"): continue
            path = os.path.join(root, fname)
            with open(path, encoding="utf-8") as f:
                code = f.read()

            used = [u for u in UI if re.search(r'\b'+u+r'\b', code)]
            if not used: continue

            # correct relative path based on folder depth
            rel = os.path.relpath(path, SRC)
            depth = len(rel.split(os.sep)) - 1
            correct = ("../" * depth) + "components/ui/index.jsx"

            new_imp = f'import {{ {", ".join(used)} }} from "{correct}";'

            # remove ALL existing ui imports (any path), then add correct one
            code = re.sub(r'import \{[^}]+\} from "[^"]*(?:ui/index\.jsx|components/ui[^"]*)";\n', '', code)

            # insert after last import line
            lines = code.split("\n")
            last = max((i for i,l in enumerate(lines) if l.startswith("import ")), default=0)
            lines.insert(last + 1, new_imp)
            code = "\n".join(lines)

            with open(path, "w", encoding="utf-8") as f:
                f.write(code)
            print(f"Fixed: {rel}")