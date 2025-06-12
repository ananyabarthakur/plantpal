🌱 PlantPal - AI-Powered Plant Care Companion
PlantPal is a React-based web application that helps you identify plants and get personalized care advice using AI. Simply upload a photo of your plant to get instant identification and detailed care instructions, or chat with the AI assistant for help with plant problems.
✨ Features

Plant Identification: Upload photos to identify plants using AI vision
Care Instructions: Get detailed, personalized care guides for your plants
Interactive Chat: Ask questions about plant care and get expert advice
Offline Mode: Basic plant identification and care advice when APIs aren't available
Responsive Design: Works seamlessly on desktop and mobile devices

🚀 Quick Start
Prerequisites

Node.js (version 14 or higher)
npm or yarn package manager

Installation

Clone or download the project
bashgit clone <your-repo-url>
cd plantpal

Install dependencies
bashnpm install

Set up environment variables
Create a .env file in the root directory:
bashtouch .env
Add your API keys to the .env file:
envREACT_APP_OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_PLANTNET_API_KEY=your_plantnet_api_key_here

Start the development server
bashnpm start

Open your browser
Navigate to http://localhost:3000 to use PlantPal!