# 🔐 AI Agent

An AI-powered agent that can **clone frontend code from any website URL** and convert it into a clean **React component structure with JSX**.  
Just provide the target URL, and the agent crawls, extracts, and generates reusable components for you. 🚀  
---

### ✨ Features
- Crawl any website by URL 🌐  
- Extract HTML & CSS automatically  
- Convert into modular **React components**  
- Save as a ready-to-use project  

---

## 🖥️ Live Preview

> Open `index.html` in your browser using a local server (e.g. `live-server`) to interact with the cloned app.

---

## 📁 Project Structure

- `index.html`: The main HTML file for the app.
- `styles.css`: CSS styles for the app.
- `feature.js`: JavaScript file containing the logic for website parsing
- `Prompts/system_prompts.js`: js file containing system prompt
- `package.json`: Configuration file for the project.


### 1. Clone the repo
```bash
git clone https://github.com/TrilochanSahoo/Website-cloner-AIAgent.git

```

Go to the project directory

```bash
  cd Website-cloner-AIAgent
```

Install dependencies

```bash
  npm install
```

Add .env file with your OPENAI api key

key name : OPENAI_API_KEY

Run locally
```bash
  node index.js
```





