import os, re, collections
from pathlib import Path
root = Path('c:/Users/Saint/OneDrive/Documents/GitHub/NekoOnlineGameProject').resolve()
exts = {'.js', '.ts', '.tsx'}
skip_dirs = {'node_modules', 'dist', 'build', '.git', '.next', 'coverage'}
patterns = [
    re.compile(r'\bfunction\s+(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\b'),
    re.compile(r'\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_][A-Za-z0-9_]*)\s*=>'),
    re.compile(r'\bexport\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\b'),
    re.compile(r'\bexport\s+(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*='),
]
name_to_paths = collections.defaultdict(list)
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in skip_dirs]
    for f in filenames:
        if os.path.splitext(f)[1].lower() not in exts:
            continue
        path = Path(dirpath) / f
        if not (str(path).startswith(str(root / 'backend')) or str(path).startswith(str(root / 'frontend'))):
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except Exception:
            continue
        for pattern in patterns:
            for m in pattern.finditer(text):
                name = m.group(1)
                if name in {'if','for','while','switch','catch','export','default','return'}:
                    continue
                name_to_paths[name].append(str(path))
for name, paths in sorted(name_to_paths.items()):
    uniq = sorted(set(paths))
    if len(uniq) > 1:
        print(name, '=>', len(uniq), 'files')
        for p in uniq:
            print('  ', os.path.relpath(p, root))
