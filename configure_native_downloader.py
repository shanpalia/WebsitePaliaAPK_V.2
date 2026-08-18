from pathlib import Path

project_root = Path(".")
plugin_src = project_root / "native-download-plugin/src/main/java/com/shanpalia/paliaapkhub/PaliaDownloaderPlugin.java"
java_dir = project_root / "android/app/src/main/java/com/shanpalia/paliaapkhub"
main = java_dir / "MainActivity.java"

if not plugin_src.exists():
    raise SystemExit("PaliaDownloaderPlugin.java source is missing")
if not main.exists():
    raise SystemExit("MainActivity.java is missing")

java_dir.mkdir(parents=True, exist_ok=True)
(java_dir / "PaliaDownloaderPlugin.java").write_bytes(plugin_src.read_bytes())

text = main.read_text(encoding="utf-8")
package = "package com.shanpalia.paliaapkhub;\n"
imp = "import com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;\n"

if imp not in text:
    text = text.replace(package, package + "\n" + imp, 1)

if "registerPlugin(PaliaDownloaderPlugin.class);" not in text:
    if "registerPlugin(PaliaGoogleAuthPlugin.class);" in text:
        text = text.replace(
            "registerPlugin(PaliaGoogleAuthPlugin.class);",
            "registerPlugin(PaliaGoogleAuthPlugin.class);\n        registerPlugin(PaliaDownloaderPlugin.class);",
            1
        )
    elif "super.onCreate(savedInstanceState);" in text:
        text = text.replace(
            "super.onCreate(savedInstanceState);",
            "super.onCreate(savedInstanceState);\n        registerPlugin(PaliaDownloaderPlugin.class);",
            1
        )
    else:
        raise SystemExit("Could not find a safe location to register PaliaDownloaderPlugin")

main.write_text(text, encoding="utf-8")
print("Native PaliaDownloader configured.")
