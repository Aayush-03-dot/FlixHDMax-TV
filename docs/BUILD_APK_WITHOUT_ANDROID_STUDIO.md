# Build the Fire TV APK without Android Studio

The project can build the installable APK on GitHub's servers. No Android Studio, Android SDK, Java, or Gradle installation is required on the Windows laptop.

## 1. Push the project to GitHub

From the project root:

```powershell
git init
git add .
git commit -m "Add FlixHDMax TV application"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Skip commands that are already configured for the repository.

## 2. Run the APK build

1. Open the repository on GitHub.
2. Open **Actions**.
3. Select **Build Fire TV APK**.
4. Select **Run workflow**.
5. For local testing, enter the laptop address, for example:

```text
http://172.16.0.189:5173/
```

For production, enter:

```text
https://tv.flixhdmax.com/
```

6. Select **Run workflow**.

## 3. Download the APK

1. Open the completed workflow run.
2. Scroll to **Artifacts**.
3. Download **FlixHDMax-TV-APK**.
4. Extract the downloaded ZIP.
5. The installable file is `app-debug.apk`.

## 4. Install it on Fire TV

Install the **Downloader** application from the Amazon Appstore, then transfer the APK using a local HTTP file server, cloud storage link, or ADB from another machine.

For ADB installation:

```powershell
adb connect FIRE_TV_IP:5555
adb install -r app-debug.apk
```

The Fire TV must be allowed to install applications from the selected source.

## Development without an APK

For immediate testing, run the frontend on the Windows laptop and open it through Amazon Web App Tester or Silk:

```text
http://YOUR_LAPTOP_IP:5173/
```

An APK is only required when the application must appear in the Fire TV application launcher.
