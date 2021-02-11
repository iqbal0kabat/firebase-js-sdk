<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@firebase/auth](./auth.md) &gt; [GoogleAuthProvider](./auth.googleauthprovider.md) &gt; [credential](./auth.googleauthprovider.credential.md)

## GoogleAuthProvider.credential() method

Creates a credential for Google. At least one of ID token and access token is required.

<b>Signature:</b>

```typescript
static credential(idToken?: string | null, accessToken?: string | null): externs.OAuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  idToken | string \| null | Google ID token. |
|  accessToken | string \| null | Google access token. |

<b>Returns:</b>

externs.[OAuthCredential](./auth-types.oauthcredential.md)

## Example


```javascript
// \`googleUser\` from the onsuccess Google Sign In callback.
const credential = GoogleAuthProvider.credential(googleUser.getAuthResponse().id_token);
const result = await signInWithCredential(credential);

```
