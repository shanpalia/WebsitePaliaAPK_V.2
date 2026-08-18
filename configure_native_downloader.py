from pathlib import Path
import re

root = Path("android")
java_dir = root / "app/src/main/java/com/shanpalia/paliaapkhub"
main = java_dir / "MainActivity.java"
plugin_src = Path("native-download-plugin/src/main/java/com/shanpalia/paliaapkhub/PaliaDownloaderPlugin.java")
plugin_dst = java_dir / "PaliaDownloaderPlugin.java"

if not main.exists():
    raise SystemExit("MainActivity.java missing after Google plugin configuration")
if not plugin_src.exists():
    raise SystemExit("PaliaDownloaderPlugin.java source missing")

plugin_dst.write_bytes(plugin_src.read_bytes())
text=main.read_text(encoding="utf-8")

if "import com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;" not in text:
    text=text.replace(
        "import com.getcapacitor.BridgeActivity;",
        "import com.getcapacitor.BridgeActivity;\nimport com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;"
    )

if "registerPlugin(PaliaDownloaderPlugin.class);" not in text:
    text=text.replace(
        "registerPlugin(PaliaGoogleAuthPlugin.class);",
        "registerPlugin(PaliaGoogleAuthPlugin.class);\n        registerPlugin(PaliaDownloaderPlugin.class);"
    )

main.write_text(text,encoding="utf-8")
if "registerPlugin(PaliaDownloaderPlugin.class);" not in main.read_text(encoding="utf-8"):
    raise SystemExit("PaliaDownloader registration missing")
print("Native PaliaDownloader registered successfully.")
