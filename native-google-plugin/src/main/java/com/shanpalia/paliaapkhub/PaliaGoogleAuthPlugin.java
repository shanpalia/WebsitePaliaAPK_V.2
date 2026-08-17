package com.shanpalia.paliaapkhub;

import android.app.Activity;
import android.os.CancellationSignal;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialException;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

@CapacitorPlugin(name = "PaliaGoogleAuth")
public class PaliaGoogleAuthPlugin extends Plugin {
    private static final String WEB_CLIENT_ID =
            "270953807883-btnln51tlh1e1b2dtjfo6bsoasjhoc3s.apps.googleusercontent.com";

    @PluginMethod
    public void signIn(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity is not available.");
            return;
        }

        try {
            CredentialManager credentialManager = CredentialManager.create(activity);

            // Request all Google accounts so the Android account chooser is shown.
            GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
                    .setServerClientId(WEB_CLIENT_ID)
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build();

            GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build();

            credentialManager.getCredentialAsync(
                    activity,
                    request,
                    new CancellationSignal(),
                    activity.getMainExecutor(),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse response) {
                            try {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential)) {
                                    call.reject("Google credential was not returned.");
                                    return;
                                }

                                CustomCredential customCredential = (CustomCredential) credential;
                                if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                                        .equals(customCredential.getType())) {
                                    call.reject("The selected credential is not a Google ID token.");
                                    return;
                                }

                                GoogleIdTokenCredential googleCredential =
                                        GoogleIdTokenCredential.createFrom(customCredential.getData());

                                JSObject result = new JSObject();
                                result.put("idToken", googleCredential.getIdToken());
                                result.put("displayName", googleCredential.getDisplayName());
                                result.put("email", googleCredential.getId());
                                result.put("profilePictureUri",
                                        googleCredential.getProfilePictureUri() == null
                                                ? null
                                                : googleCredential.getProfilePictureUri().toString());
                                call.resolve(result);
                            } catch (Exception e) {
                                call.reject("Unable to read Google credential: " + e.getMessage(), e);
                            }
                        }

                        @Override
                        public void onError(GetCredentialException e) {
                            String message = e.getMessage();
                            if (message == null || message.trim().isEmpty()) {
                                message = "Google account selection was cancelled or unavailable.";
                            }
                            call.reject(message, e);
                        }
                    }
            );
        } catch (Exception e) {
            call.reject("Unable to start Google account chooser: " + e.getMessage(), e);
        }
    }
}
