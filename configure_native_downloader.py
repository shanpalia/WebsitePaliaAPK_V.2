from pathlib import Path
root=Path("android")
java=root/"app/src/main/java/com/shanpalia/paliaapkhub"
main=java/"MainActivity.java"
src=Path("native-download-plugin/src/main/java/com/shanpalia/paliaapkhub/PaliaDownloaderPlugin.java")
dst=java/"PaliaDownloaderPlugin.java"
if not main.exists() or not src.exists(): raise SystemExit("Native Android files missing")
java.mkdir(parents=True,exist_ok=True)
dst.write_bytes(src.read_bytes())
s=main.read_text(encoding="utf-8")
if "import com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;" not in s:
    s=s.replace("import com.getcapacitor.BridgeActivity;", "import com.getcapacitor.BridgeActivity;\nimport com.shanpalia.paliaapkhub.PaliaDownloaderPlugin;")
if "registerPlugin(PaliaDownloaderPlugin.class);" not in s:
    s=s.replace("registerPlugin(PaliaGoogleAuthPlugin.class);", "registerPlugin(PaliaGoogleAuthPlugin.class);\n        registerPlugin(PaliaDownloaderPlugin.class);")
main.write_text(s,encoding="utf-8")
assert "registerPlugin(PaliaDownloaderPlugin.class);" in main.read_text()
print("PaliaDownloader registered.")
