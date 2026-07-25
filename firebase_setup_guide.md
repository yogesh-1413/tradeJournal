# Firebase Hosting & GitHub Actions Setup Guide

Follow these steps to activate automated deployment (CI/CD) for your Trade Journal app.

---

## Step 1: Enable Firebase Hosting
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Click **Hosting** in the sidebar, then click **Get Started** to initialize hosting for your project.

---

## Step 2: Create a Deployment Service Account
To allow GitHub Actions to build and deploy your app securely:
1. Go to the [Google Cloud Console Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) (select your Firebase project in the top dropdown).
2. Click **+ Create Service Account**.
3. Set the name to `github-actions-deployer` (or similar) and click **Create and Continue**.
4. Grant this Service Account the following roles:
   - **Firebase Hosting Admin** (`roles/firebasehosting.admin`)
   - **API Keys Viewer** (`roles/serviceusage.apiKeysViewer`)
5. Click **Continue**, then click **Done**.

---

## Step 3: Generate the JSON Private Key
1. Find your new `github-actions-deployer` service account in the list.
2. Click the three dots (Actions) on the right and select **Manage keys**.
3. Click **Add Key** -> **Create new key**.
4. Select **JSON** as the key type and click **Create**.
5. A JSON file will download to your computer.
   > [!WARNING]
   > Keep this file secure and **NEVER commit it to Git/GitHub**.

---

## Step 4: Add Secrets to GitHub
1. Open your repository on GitHub.
2. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
3. Click **New repository secret** and add the following two secrets:
   - **Secret Name**: `FIREBASE_PROJECT_ID`
     - **Value**: Your Firebase Project ID (e.g. `tradejournal-abc12`).
   - **Secret Name**: `FIREBASE_SERVICE_ACCOUNT`
     - **Value**: Paste the *entire contents* of the JSON key file you downloaded in Step 3.

---

## Step 5: Commit and Push your files
Run the following commands in your local project terminal:
```bash
git add firebase.json .firebaserc .github/
git commit -m "Configure Firebase Hosting and GitHub Actions CI/CD"
git push
```

---

## Step 6: Verify Deployment
1. Go to the **Actions** tab of your repository on GitHub.
2. You will see the **Deploy to Firebase Hosting on Merge** action running.
3. Once completed, it will output the URL of your live, hosted trading journal!
4. Additionally, whenever you open a new Pull Request, GitHub will build the preview and paste a custom staging link in the PR comments for you to preview!
