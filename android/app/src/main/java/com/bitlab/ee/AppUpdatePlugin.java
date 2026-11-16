package com.bitlab.ee;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

/**
 * Downloads an APK and hands it to the package installer through FileProvider.
 * Matches the AppUpdate.downloadAndInstall contract used by the other apps.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final int MAX_BYTES = 150 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 5;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
            call.reject("apkUrl must be an http(s) URL");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settingsIntent);
            call.reject("INSTALL_PERMISSION_REQUIRED");
            return;
        }

        // Keep the bridge callback alive for the whole download.
        call.setKeepAlive(true);
        new Thread(() -> {
            try {
                File apk = download(url);
                Runnable install = () -> {
                    try {
                        launchInstaller(apk);
                        JSObject result = new JSObject();
                        result.put("started", true);
                        call.resolve(result);
                    } catch (Exception error) {
                        call.reject(error.getMessage() == null ? "install failed" : error.getMessage());
                    } finally {
                        call.setKeepAlive(false);
                    }
                };
                if (getActivity() != null) {
                    getActivity().runOnUiThread(install);
                } else {
                    install.run();
                }
            } catch (Exception error) {
                call.setKeepAlive(false);
                call.reject(error.getMessage() == null ? "download failed" : error.getMessage());
            }
        }, "bitlab-update").start();
    }

    private File download(String urlString) throws Exception {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("could not create the update directory");
        }
        File apk = new File(dir, "bitlab-update.apk");
        if (apk.exists() && !apk.delete()) {
            throw new Exception("could not replace the previous download");
        }

        HttpURLConnection connection = openFollowingRedirects(urlString);
        int code = connection.getResponseCode();
        if (code < 200 || code >= 300) {
            connection.disconnect();
            throw new Exception("download failed (" + code + ")");
        }
        long advertised = connection.getContentLengthLong();
        if (advertised > MAX_BYTES) {
            connection.disconnect();
            throw new Exception("update is larger than expected");
        }

        long written = 0;
        try (InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(apk)) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                written += count;
                if (written > MAX_BYTES) {
                    throw new Exception("update is larger than expected");
                }
                output.write(buffer, 0, count);
            }
        } catch (Exception error) {
            connection.disconnect();
            apk.delete();
            throw error;
        } finally {
            connection.disconnect();
        }
        if (!looksLikeZip(apk)) {
            apk.delete();
            throw new Exception("downloaded file is not an APK");
        }
        return apk;
    }

    private HttpURLConnection openFollowingRedirects(String urlString) throws Exception {
        String current = urlString;
        for (int hop = 0; hop < MAX_REDIRECTS; hop++) {
            HttpURLConnection connection = (HttpURLConnection) new URL(current).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(60000);
            connection.setRequestProperty("User-Agent", "BitLab/1.0");
            connection.setRequestProperty("Accept", "*/*");
            int code = connection.getResponseCode();
            if (code >= 300 && code < 400) {
                String next = connection.getHeaderField("Location");
                connection.disconnect();
                if (next == null || next.isEmpty()) {
                    throw new Exception("download redirect without a location (" + code + ")");
                }
                current = new URL(new URL(current), next).toString();
                if (!(current.startsWith("https://") || current.startsWith("http://"))) {
                    throw new Exception("refusing a non-http download redirect");
                }
                continue;
            }
            return connection;
        }
        throw new Exception("download had too many redirects");
    }

    private void launchInstaller(File apk) {
        Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

        List<ResolveInfo> handlers = getContext().getPackageManager()
                .queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo handler : handlers) {
            getContext().grantUriPermission(
                    handler.activityInfo.packageName,
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        getContext().startActivity(intent);
    }

    private static boolean looksLikeZip(File file) throws Exception {
        try (InputStream in = new FileInputStream(file)) {
            byte[] magic = new byte[4];
            if (in.read(magic) != 4) return false;
            return magic[0] == 0x50 && magic[1] == 0x4B && magic[2] == 0x03 && magic[3] == 0x04;
        }
    }
}
