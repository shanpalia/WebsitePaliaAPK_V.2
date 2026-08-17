from pathlib import Path
import re
p = Path('android/app/build.gradle')
s = p.read_text()
if 'signingConfigs {' not in s:
    marker = '    buildTypes {'
    block = '''    signingConfigs {
        release {
            if (System.getenv("CI")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            }
        }
    }

'''
    if marker not in s:
        raise SystemExit('buildTypes block not found')
    s = s.replace(marker, block + marker, 1)
m = re.search(r'(?m)^    buildTypes\s*\{', s)
if not m:
    raise SystemExit('buildTypes block not found')
tail = s[m.start():]
rm = re.search(r'(?m)^        release\s*\{', tail)
if not rm:
    raise SystemExit('release build type not found')
release_start = m.start() + rm.start()
brace = s.find('{', release_start)
depth = 0
end = None
for i in range(brace, len(s)):
    if s[i] == '{':
        depth += 1
    elif s[i] == '}':
        depth -= 1
        if depth == 0:
            end = i
            break
if end is None:
    raise SystemExit('release block parse failed')
release_block = s[release_start:end+1]
if 'signingConfig signingConfigs.release' not in release_block:
    release_block = release_block[:-1] + '\n            signingConfig signingConfigs.release\n        }'
    s = s[:release_start] + release_block + s[end+1:]
p.write_text(s)
