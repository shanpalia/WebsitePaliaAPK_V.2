from pathlib import Path
import re

root = Path('.')
www = root / 'www'
www.mkdir(exist_ok=True)

# Copy top-level web assets.
for p in root.glob('*.html'):
    if p.name != 'index.html':
        (www / p.name).write_bytes(p.read_bytes())
for pattern in ('*.js', '*.css'):
    for p in root.glob(pattern):
        (www / p.name).write_bytes(p.read_bytes())

# Copy index explicitly.
index = root / 'index.html'
if not index.is_file():
    raise SystemExit('index.html is missing')
(www / 'index.html').write_bytes(index.read_bytes())

for folder in ('assets', 'images'):
    src = root / folder
    if src.is_dir():
        import shutil
        shutil.copytree(src, www / folder, dirs_exist_ok=True)

# Capacitor's runtime is needed by the plain HTML pages.
cap = root / 'node_modules' / '@capacitor' / 'core' / 'dist' / 'capacitor.js'
if not cap.is_file():
    raise SystemExit(f'Missing Capacitor runtime: {cap}')
(www / 'capacitor.js').write_bytes(cap.read_bytes())

# Remove obsolete/manual Firebase native bridge references. The current login uses Firebase Web Auth redirect.
for p in www.glob('*.html'):
    text = p.read_text(encoding='utf-8')
    text = re.sub(r'\s*<script[^>]+src=["\']capacitor-auth\.js["\'][^>]*></script>', '', text, flags=re.I)
    text = re.sub(r'\s*<script[^>]+src=["\']firebase-authentication-plugin\.js["\'][^>]*></script>', '', text, flags=re.I)
    # Ensure capacitor runtime appears once in head, before application scripts.
    text = re.sub(r'\s*<script[^>]+src=["\']capacitor\.js["\'][^>]*></script>', '', text, flags=re.I)
    tag = '<script src="capacitor.js"></script>'
    if re.search(r'<head[^>]*>', text, flags=re.I):
        text = re.sub(r'(<head[^>]*>)', r'\1\n    ' + tag, text, count=1, flags=re.I)
    else:
        text = tag + '\n' + text
    p.write_text(text, encoding='utf-8')

print(f'Prepared {len(list(www.glob("*.html")))} HTML pages in {www}')
