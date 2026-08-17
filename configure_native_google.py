from pathlib import Path
import re

root = Path('android')
if not root.is_dir():
    raise SystemExit('android directory missing')

java_dir = root / 'app/src/main/java/com/shanpalia/paliaapkhub'
java_dir.mkdir(parents=True, exist_ok=True)
plugin_src = Path('native-google-plugin/src/main/java/com/shanpalia/paliaapkhub/PaliaGoogleAuthPlugin.java')
plugin_dst = java_dir / 'PaliaGoogleAuthPlugin.java'
plugin_dst.write_bytes(plugin_src.read_bytes())

main = java_dir / 'MainActivity.java'
main.write_text('''package com.shanpalia.paliaapkhub;\n\nimport android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(PaliaGoogleAuthPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}\n''')

gradle = root / 'app/build.gradle'
s = gradle.read_text()
deps = '''\n    implementation "androidx.credentials:credentials:1.3.0"\n    implementation "androidx.credentials:credentials-play-services-auth:1.3.0"\n    implementation "com.google.android.libraries.identity.googleid:googleid:1.1.1"\n'''
if 'androidx.credentials:credentials:1.3.0' not in s:
    m = re.search(r'dependencies\s*\{', s)
    if not m:
        raise SystemExit('dependencies block not found')
    pos = s.find('{', m.start()) + 1
    s = s[:pos] + deps + s[pos:]
gradle.write_text(s)

# Verify files and native dependencies are present.
checks = [plugin_dst, main]
for f in checks:
    if not f.is_file() or f.stat().st_size == 0:
        raise SystemExit(f'Missing native Google file: {f}')
if 'androidx.credentials:credentials:1.3.0' not in gradle.read_text():
    raise SystemExit('Credential Manager dependency missing')
if 'PaliaGoogleAuthPlugin.class' not in main.read_text():
    raise SystemExit('MainActivity plugin registration missing')
print('Native Google Credential Manager integration configured successfully.')
