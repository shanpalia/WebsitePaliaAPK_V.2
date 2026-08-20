package com.shanpalia.paliaapkhub;
import android.content.*;
import android.net.Uri;
import android.os.*;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.*;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name="PaliaDownloader")
public class PaliaDownloaderPlugin extends Plugin {
  private final Handler h=new Handler(Looper.getMainLooper());
  private final AtomicLong ids=new AtomicLong(System.currentTimeMillis());
  private File dir(){File d=new File(getContext().getExternalFilesDir(null),"PaliaAPK-HUB");if(!d.exists())d.mkdirs();return d;}
  @PluginMethod public void download(PluginCall c){
    String url=c.getString("url"), name=c.getString("filename","PaliaAPK-HUB-App.apk");
    if(url==null||url.isEmpty()){c.reject("Download URL missing");return;}
    final String fn=name.replaceAll("[^A-Za-z0-9._ -]","_");
    final long id=ids.incrementAndGet();
    JSObject r=new JSObject();r.put("downloadId",id);r.put("filename",fn);r.put("status",2);c.resolve(r);
    new Thread(()->run(id,url,fn),"PaliaAPK-HUB-"+id).start();
  }
  private void emit(long id,int status,long bytes,long total,String fn){
    h.post(()->{JSObject o=new JSObject();o.put("downloadId",id);o.put("status",status);o.put("bytesDownloaded",bytes);o.put("totalBytes",total);o.put("filename",fn);o.put("downloadMode","app_owned");notifyListeners("downloadProgress",o);});
  }
  private void run(long id,String url,String fn){
    File part=new File(dir(),fn+".part"), out=new File(dir(),fn);
    HttpURLConnection x=null;
    try{
      x=(HttpURLConnection)new URL(url).openConnection();x.setInstanceFollowRedirects(true);x.setConnectTimeout(20000);x.setReadTimeout(30000);
      int code=x.getResponseCode();if(code<200||code>=300)throw new IOException("HTTP "+code);
      long total=x.getContentLengthLong();long n=0,last=0;
      try(InputStream in=new BufferedInputStream(x.getInputStream());FileOutputStream f=new FileOutputStream(part)){
        byte[] b=new byte[65536];int q;emit(id,1,0,total,fn);
        while((q=in.read(b))!=-1){f.write(b,0,q);n+=q;long now=System.currentTimeMillis();if(now-last>200){last=now;emit(id,2,n,total,fn);}}
      }
      if(out.exists())out.delete();if(!part.renameTo(out))throw new IOException("Could not finalize APK");
      emit(id,8,out.length(),total>0?total:out.length(),fn);
    }catch(Exception e){if(part.exists())part.delete();emit(id,16,0,0,fn);}
    finally{if(x!=null)x.disconnect();}
  }
  @PluginMethod public void openInstaller(PluginCall c){
    String fn=c.getString("filename");try{
      File apk=new File(dir(),fn);Uri u=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",apk);
      Intent i=new Intent(Intent.ACTION_VIEW);i.setDataAndType(u,"application/vnd.android.package-archive");i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);getContext().startActivity(i);c.resolve(new JSObject());
    }catch(Exception e){c.reject(e.getMessage());}
  }
}
