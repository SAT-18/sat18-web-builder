# SAT18 Web APK Builder

SAT18 Official | Web APK Builder - A full-stack Next.js application to build Android apps directly from uploaded ZIP projects.

This project provides a web interface to upload an Android project (in a `.zip` file), which is then built on the server, producing a downloadable `.apk` file. It features a robust build process that can attempt a local build and fall back to a remote build server if configured.

## 🚀 Features

-   **Web UI:** Simple interface to upload a `.zip` file and initiate the build process.
-   **Real-time Polling:** The frontend polls the server to provide real-time status updates on the build progress.
-   **Backend API:** Built with Next.js API routes to handle file uploads and build status requests.
-   **Flexible Build Worker:**
    -   Extracts the uploaded `.zip` project.
    -   Attempts to build locally using `./gradlew` or a system-wide `gradle` installation.
    -   **Remote Fallback:** If the local build fails and is configured, it securely uploads the project to a remote server (VPS) via SFTP/SSH to perform the build.
-   **Downloadable Artifact:** Provides a direct download link for the generated `.apk` file upon successful build.

## 🛠️ Tech Stack

-   **Framework:** Next.js (React)
-   **API:** Next.js API Routes
-   **File Handling:** Multer, Adm-Zip
-   **Remote Operations:** `node-ssh`, `ssh2-sftp-client`
-   **Process Execution:** `execa`

## ⚙️ Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd sat18-web-builder
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file with your specific configuration.

    **Basic Configuration:**
    ```env
    # Server port
    PORT=3000

    # Directories for file management
    UPLOAD_DIR=./uploads
    OUTPUT_DIR=./output
    TEMP_DIR=./projects

    # Build process timeout in milliseconds (e.g., 900000ms = 15 minutes)
    BUILD_TIMEOUT=900000
    ```

    **Remote Build Configuration (Optional):**
    To enable the remote build fallback, set `USE_REMOTE=1` and provide your remote server's credentials.
    ```env
    # Set to 1 to enable remote build fallback
    USE_REMOTE=1

    # Remote server details
    REMOTE_HOST=your-vps-ip-or-domain.com
    REMOTE_PORT=22
    REMOTE_USER=your-ssh-user
    REMOTE_PATH=/home/your-ssh-user/builds
    REMOTE_PRIVATE_KEY_PATH=~/.ssh/id_rsa_for_vps # Path to your SSH private key
    ```
    > **Note:** Ensure the remote server has the necessary build tools (JDK, Android SDK, Gradle) and the `run_remote_build.sh` script is in place and executable.

4.  **Run the application:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## 📦 Deployment

To deploy this application, you can use any Node.js hosting provider (like Vercel, Railway, or a traditional VPS).

1.  **Build the application:**
    ```bash
    npm run build
    ```

2.  **Start the production server:**
    ```bash
    npm run start
    ```

Ensure your hosting environment has the necessary build tools (JDK, Android SDK, Gradle) if you plan to use the "local build" feature on the server. Otherwise, configure it to use a dedicated remote build server.
