from pathlib import Path

project_root = Path(".")
plugin_src = project_root / "native-download-plugin/src/main/java/com/shanpalia/paliaapkhub/PaliaDownloaderPlugin.java"
java_dir = project_root / "android/app/src/main/java/com/shanpalia/paliaapkhub"
main = java_dir / "MainActivity.java"
plugin_dst = java_dir / "PaliaDownloaderPlugin.java"

if not plugin_src.exists():
    raise SystemExit("PaliaDownloaderPlugin.java source is missing")
if not main.exists():
    raise SystemExit("MainActivity.java is missing")

java_dir.mkdir(parents=True, exist_ok=True)
plugin_dst.write_bytes(plugin_src.read_bytes())

text = main.read_text(encoding="utf-8")

if "import com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;" not in text:
    text = text.replace(
        "package com.shanpalia.paliaapkhub;\n",
        "package com.shanpalia.paliaapkhub;\n\n"
        "import com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;\n",
        1
    )

if "registerPlugin(PaliaDownloaderPlugin.class);" not in text:
    text = text.replace(
        "registerPlugin(PaliaGoogleAuthPlugin.class);",
        "registerPlugin(PaliaGoogleAuthPlugin.class);\n"
        "        registerPlugin(PaliaDownloaderPlugin.class);",
        1
    )

main.write_text(text, encoding="utf-8")
print("Native PaliaDownloader registered.")
