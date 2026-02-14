# Valentine Surprise

A romantic Valentine's Day surprise creator built with React and Tailwind CSS.

**Made by SOBUJ**

## Features

- Create a personalized surprise message.
- "Love Agreement" certificate.
- Secret message revealed after answering a question.
- AI-powered message generation using Gemini API.
- Shareable links.

## Deployment on Vercel

1. **Push to GitHub**: Push this repository to your GitHub account.
2. **Import in Vercel**: Go to Vercel Dashboard, click "Add New...", select "Project", and import your repository.
3. **Environment Variables**:
   - In the Vercel project settings, go to **Settings > Environment Variables**.
   - Add a new variable:
     - **Key**: `VITE_GEMINI_API_KEY`
     - **Value**: Your Google Gemini API Key.
4. **Deploy**: Click "Deploy".

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory and add your API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Credits

This project was created by **SOBUJ**.
