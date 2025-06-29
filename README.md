# Extending Copilot Summary for Azure DevOps
A browser extension to provide personalized summaries for Azure DevOps work items.
[Video demo](https://drive.google.com/file/d/1VIb3PV71lUZsHP03VQyA4f-IT19oRjK-/view?usp=sharing)


## ✨ Features

- **Personalized Summaries**: Allows you to set your role and preferred summary style (technical vs general audience). Summaries tailored for Software Engineers, Product Managers, Engineering Managers, etc.
- **Enhanced Analysis**: Extracts key points, open questions, and recommends next steps for you.
- **Feedback System**: Collect user feedback via Microsoft Forms

## 🚀 Setup Instructions

### Load the Extension

1. Open Edge and go to `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder
4. The extension is ready to use!

## 📖 Usage

1. Navigate to any Azure DevOps work item page
2. Click the extension icon in your browser toolbar
3. Select your role and preferred summary style
4. Click "Summarize Work Item" to generate a personalized summary

## 🔒 Privacy & Security

- Work item data is extracted from the page HTML
- Azure OpenAI API calls are made through an Azure Function
- User preferences are stored locally using Chrome/Edge's storage API
- No data is sent to any third-party services except Azure OpenAI through the Azure Function

## 🔧 Troubleshooting

- **"Receiving end does not exist"**: Reload the extension by going on Extensions > Copilot Summary > Reload. Additionally, close and re-open the ADO work item webpage.
- **"Not on ADO"**: Make sure you're on an Azure DevOps page

## Development

To modify the extension:
1. Edit the files in this folder
2. Go to `edge://extensions/`
3. Click the refresh icon on the extension
4. Test your changes

## License

This project is for personal use. Please ensure you comply with Azure OpenAI and Microsoft's terms of service. 📋 
