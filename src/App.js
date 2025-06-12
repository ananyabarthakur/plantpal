import React, { useState, useRef } from 'react';
import { Camera, MessageCircle, Leaf, Sun, Droplets, Thermometer, Calendar, Send, Upload, X, Bot, User, AlertCircle } from 'lucide-react';

// Debug: Check if API keys are loaded
console.log('OpenAI API Key exists:', !!process.env.REACT_APP_OPENAI_API_KEY);
console.log('PlantNet API Key exists:', !!process.env.REACT_APP_PLANTNET_API_KEY);

const PlantPal = () => {
  const [activeTab, setActiveTab] = useState('identify');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [plantData, setPlantData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'bot', message: "Hi! I'm your PlantPal assistant. Ask me anything about plant care - like 'Why are my plant's leaves turning yellow?' or 'How often should I water my succulent?'" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const fileInputRef = useRef(null);

  // Common plant database for offline fallback
  const commonPlants = {
    'broad_leaves_indoor': {
      name: "Monstera deliciosa",
      commonName: "Swiss Cheese Plant",
      confidence: 75,
      care: {
        watering: "Water when top 1-2 inches of soil are dry, usually every 1-2 weeks",
        light: "Bright, indirect light. Avoid direct sunlight",
        humidity: "Prefers 50-60% humidity. Mist regularly or use humidity tray",
        temperature: "65-80°F (18-27°C)",
        soil: "Well-draining potting mix with peat or coco coir",
        fertilizer: "Monthly during spring and summer with balanced liquid fertilizer",
        repotting: "Every 1-2 years in spring when rootbound"
      },
      tips: [
        "Support with moss pole for climbing growth",
        "Wipe leaves weekly to remove dust",
        "Fenestrations (holes) develop with maturity",
        "Prune aerial roots if they become unruly"
      ]
    },
    'succulent_thick_leaves': {
      name: "Echeveria elegans",
      commonName: "Mexican Snow Ball",
      confidence: 70,
      care: {
        watering: "Water deeply but infrequently, every 10-14 days. Allow soil to dry completely",
        light: "Bright, direct sunlight for 6+ hours daily",
        humidity: "Low humidity preferred, 30-40%",
        temperature: "65-75°F (18-24°C)",
        soil: "Cactus/succulent mix with excellent drainage",
        fertilizer: "Diluted cactus fertilizer monthly during growing season",
        repotting: "Every 2-3 years in spring"
      },
      tips: [
        "Water at soil level, avoid getting leaves wet",
        "Provide excellent drainage to prevent root rot",
        "Reduce watering in winter months",
        "Propagate easily from leaf cuttings"
      ]
    },
    'small_green_leaves': {
      name: "Pothos aureus",
      commonName: "Golden Pothos",
      confidence: 80,
      care: {
        watering: "Water when top inch of soil is dry, usually weekly",
        light: "Low to bright, indirect light. Very adaptable",
        humidity: "Average household humidity (40-50%)",
        temperature: "65-75°F (18-24°C)",
        soil: "Regular potting mix with good drainage",
        fertilizer: "Monthly during growing season",
        repotting: "Every 2-3 years when rootbound"
      },
      tips: [
        "Excellent air purifier",
        "Can grow in water or soil",
        "Trim long vines to encourage bushy growth",
        "Very forgiving and low-maintenance"
      ]
    }
  };

  // Offline plant care knowledge base
  const offlineCareAdvice = {
    'yellow leaves': "Yellow leaves usually indicate overwatering, underwatering, or natural aging. Check soil moisture - if soggy, reduce watering. If dry, increase frequency. Remove yellow leaves to redirect energy to healthy growth.",
    'brown tips': "Brown leaf tips typically result from low humidity, fluoride in tap water, or overfertilization. Increase humidity, use filtered water, and reduce fertilizer. Trim brown tips with clean scissors.",
    'dropping leaves': "Leaf drop can indicate stress from changes in light, watering, or environment. Maintain consistent care routine and avoid moving the plant frequently. Some leaf drop is normal when adjusting to new conditions.",
    'not growing': "Slow growth may indicate insufficient light, nutrients, or it may be dormant season. Ensure adequate bright light, feed during growing season (spring/summer), and be patient during winter months.",
    'pests': "Common pests include spider mites, aphids, and mealybugs. Inspect regularly, isolate affected plants, and treat with insecticidal soap or neem oil. Increase humidity to prevent spider mites.",
    'overwatering': "Signs include yellow leaves, musty smell, or soft stems. Allow soil to dry out, improve drainage, and reduce watering frequency. Remove affected roots if repotting.",
    'underwatering': "Signs include wilting, dry soil, and crispy leaves. Water thoroughly until water drains from bottom. Establish consistent watering schedule based on soil moisture."
  };

  // Enhanced plant identification with multiple fallback levels
  const identifyPlant = async (imageFile) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('Starting plant identification...');
      
      // Level 1: Try PlantNet API first (if available)
      if (process.env.REACT_APP_PLANTNET_API_KEY) {
        try {
          console.log('Attempting PlantNet identification...');
          const plantNetResult = await identifyWithPlantNet(imageFile);
          if (plantNetResult) {
            const careInstructions = await getCareInstructionsWithFallback(plantNetResult.name);
            setPlantData({
              ...plantNetResult,
              ...careInstructions,
              source: 'PlantNet API'
            });
            return;
          }
        } catch (error) {
          console.log('PlantNet failed, trying OpenAI...', error.message);
        }
      }

      // Level 2: Try OpenAI Vision API
      if (process.env.REACT_APP_OPENAI_API_KEY) {
        try {
          console.log('Attempting OpenAI identification...');
          const base64Image = await convertToBase64(imageFile);
          const openAIResult = await identifyWithOpenAI(base64Image);
          if (openAIResult) {
            const careInstructions = await getCareInstructionsWithFallback(openAIResult.name);
            setPlantData({
              ...openAIResult,
              ...careInstructions,
              source: 'OpenAI Vision'
            });
            return;
          }
        } catch (error) {
          console.log('OpenAI failed, using offline fallback...', error.message);
          if (error.message.includes('429')) {
            setError('API quota exceeded. Using offline identification.');
          } else if (error.message.includes('401')) {
            setError('API key invalid. Using offline identification.');
          } else {
            setError('AI services unavailable. Using offline identification.');
          }
        }
      }

      // Level 3: Offline fallback with basic image analysis
      console.log('Using offline plant identification...');
      const offlineResult = identifyPlantOffline(imageFile);
      setPlantData({
        ...offlineResult,
        source: 'Offline Database'
      });
      setIsOfflineMode(true);

    } catch (error) {
      console.error('All identification methods failed:', error);
      setError('Unable to identify plant. Please try again or ask in the chat for help.');
      
      // Ultimate fallback - general plant care
      setPlantData({
        name: "Plant identification unavailable",
        commonName: "General Houseplant",
        confidence: 0,
        care: {
          watering: "Water when top inch of soil feels dry to touch",
          light: "Most houseplants prefer bright, indirect light",
          humidity: "Average household humidity (40-60%) is suitable for most plants",
          temperature: "Keep between 65-75°F (18-24°C) for optimal growth",
          soil: "Use well-draining potting mix appropriate for plant type",
          fertilizer: "Feed monthly during spring and summer growing season",
          repotting: "Repot every 1-2 years when plant becomes rootbound"
        },
        tips: [
          "Observe your plant daily for changes in appearance",
          "Check soil moisture before watering",
          "Rotate plant weekly for even light exposure",
          "Remove dead or yellowing leaves promptly",
          "Research your specific plant type for targeted care"
        ],
        source: 'General Care Guidelines'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // PlantNet API with error handling
  const identifyWithPlantNet = async (imageFile) => {
    const formData = new FormData();
    formData.append('images', imageFile);
    formData.append('modifiers', '["crops", "flower", "leaf", "auto"]');
    formData.append('project', 'weurope');
    
    const response = await fetch(`https://my-api.plantnet.org/v2/identify/weurope?api-key=${process.env.REACT_APP_PLANTNET_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`PlantNet API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const topResult = data.results[0];
      return {
        name: topResult.species.scientificNameWithoutAuthor,
        commonName: topResult.species.commonNames?.[0] || topResult.species.scientificNameWithoutAuthor,
        confidence: Math.round(topResult.score * 100)
      };
    }
    
    throw new Error('No plant identified by PlantNet');
  };

  // OpenAI Vision API with retry logic
  const identifyWithOpenAI = async (base64Image, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`OpenAI attempt ${attempt + 1}/${retries + 1}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Identify this plant. Return ONLY a JSON object with 'name' (scientific name), 'commonName', and 'confidence' (0-1 scale). Example: {\"name\":\"Monstera deliciosa\",\"commonName\":\"Swiss Cheese Plant\",\"confidence\":0.95}"
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 150
          })
        });

        if (response.status === 429) {
          throw new Error('429'); // Let this bubble up for quota handling
        }

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        
        return {
          name: result.name,
          commonName: result.commonName,
          confidence: Math.round(result.confidence * 100)
        };
      } catch (error) {
        if (error.message === '429' || attempt === retries) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  // Offline plant identification using basic heuristics
  const identifyPlantOffline = (imageFile) => {
    // This is a simplified example - in reality, you might use basic image processing
    // or ask the user to select characteristics
    
    // For now, return a random common plant with explanation
    const plantKeys = Object.keys(commonPlants);
    const randomPlant = commonPlants[plantKeys[Math.floor(Math.random() * plantKeys.length)]];
    
    return {
      ...randomPlant,
      name: randomPlant.name + " (estimated)",
      commonName: randomPlant.commonName + " (example)",
      confidence: Math.floor(Math.random() * 30) + 40, // 40-70% confidence
      note: "This is an example identification based on common houseplants. For accurate identification, try again when AI services are available."
    };
  };

  // Enhanced care instructions with fallback
  const getCareInstructionsWithFallback = async (plantName, retries = 1) => {
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      return getGenericCareInstructions();
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: `Provide care instructions for ${plantName}. Return ONLY a JSON object with this structure:
                {
                  "care": {
                    "watering": "detailed watering instructions",
                    "light": "light requirements",
                    "humidity": "humidity needs",
                    "temperature": "temperature range",
                    "soil": "soil requirements",
                    "fertilizer": "fertilization schedule",
                    "repotting": "repotting guidance"
                  },
                  "tips": ["tip1", "tip2", "tip3", "tip4"]
                }`
              }
            ],
            max_tokens: 600
          })
        });

        if (response.ok) {
          const data = await response.json();
          return JSON.parse(data.choices[0].message.content);
        }
      } catch (error) {
        console.log(`Care instructions attempt ${attempt + 1} failed:`, error.message);
      }
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Fallback to generic care
    return getGenericCareInstructions();
  };

  // Generic care instructions fallback
  const getGenericCareInstructions = () => ({
    care: {
      watering: "Water when top inch of soil feels dry, usually every 1-2 weeks",
      light: "Bright, indirect light works for most houseplants",
      humidity: "Average household humidity (40-50%) is adequate",
      temperature: "65-75°F (18-24°C) is ideal for most plants",
      soil: "Well-draining potting mix appropriate for plant type",
      fertilizer: "Monthly feeding during spring and summer",
      repotting: "Every 1-2 years when plant becomes rootbound"
    },
    tips: [
      "Check soil moisture before watering",
      "Rotate plant weekly for even growth",
      "Remove dead leaves promptly",
      "Monitor for pests regularly",
      "Adjust care based on seasonal changes"
    ]
  });

  // Enhanced chat response with fallback
  const getChatResponse = async (userMessage) => {
    console.log('Getting chat response for:', userMessage);
    
    // Check for offline responses first
    const offlineResponse = getOfflineResponse(userMessage);
    if (offlineResponse) {
      return offlineResponse;
    }

    // Try OpenAI if available
    if (process.env.REACT_APP_OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are PlantPal, a friendly plant care expert. Help diagnose plant problems and provide specific care advice. Be conversational and ask follow-up questions when helpful."
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0].message.content;
        } else if (response.status === 429) {
          return "I'm experiencing high demand right now. Here's what I can tell you from my offline knowledge: " + (getOfflineResponse(userMessage) || "Try asking a more specific question about watering, light, or common plant problems.");
        }
      } catch (error) {
        console.error('Chat API error:', error);
      }
    }

    // Final fallback
    return getOfflineResponse(userMessage) || "I'm having trouble connecting to my knowledge base right now. For general plant care, remember: check soil moisture before watering, provide bright indirect light, and maintain good drainage. What specific plant problem are you experiencing?";
  };

  // Offline response matcher
  const getOfflineResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    for (const [keyword, response] of Object.entries(offlineCareAdvice)) {
      if (lowerMessage.includes(keyword)) {
        return response + "\n\nFor more specific help, please describe your plant type and current care routine.";
      }
    }
    
    // Common question patterns
    if (lowerMessage.includes('water')) {
      return "Most plants should be watered when the top inch of soil feels dry. Stick your finger into the soil - if it's dry, it's time to water. Water thoroughly until it drains from the bottom, then empty the saucer.";
    }
    if (lowerMessage.includes('light')) {
      return "Most houseplants prefer bright, indirect light. Place them near a window but not in direct sunlight, which can scorch leaves. If you notice leggy growth, your plant likely needs more light.";
    }
    if (lowerMessage.includes('fertilizer') || lowerMessage.includes('feed')) {
      return "Feed your plants monthly during spring and summer with a balanced liquid fertilizer diluted to half strength. Stop fertilizing in fall and winter when growth slows.";
    }
    
    return null;
  };

  // Helper function to convert file to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        identifyPlant(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      sender: 'user',
      message: chatInput
    };

    setChatMessages(prev => [...prev, newMessage]);

    try {
      const botResponse = await getChatResponse(chatInput);
      
      const botMessage = {
        id: chatMessages.length + 2,
        sender: 'bot',
        message: botResponse
      };

      setChatMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat response failed:', error);
      const botMessage = {
        id: chatMessages.length + 2,
        sender: 'bot',
        message: "I'm having trouble right now, but here's some general advice: Most plant problems stem from watering issues. Check if your soil is too wet or too dry, ensure good drainage, and provide bright indirect light. What specific symptoms are you seeing?"
      };
      setChatMessages(prev => [...prev, botMessage]);
    }

    setChatInput('');
  };

  const resetIdentification = () => {
    setUploadedImage(null);
    setPlantData(null);
    setIsAnalyzing(false);
    setError(null);
    setIsOfflineMode(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <Leaf className="w-8 h-8" />
          <h1 className="text-3xl font-bold">PlantPal</h1>
          {isOfflineMode && (
            <div className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium">
              Offline Mode
            </div>
          )}
        </div>
        <p className="text-center text-green-100 mt-2">Your AI-powered plant care companion</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-6 mt-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <p className="text-yellow-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-gray-50 border-b">
        <button
          onClick={() => setActiveTab('identify')}
          className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
            activeTab === 'identify'
              ? 'bg-white text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-green-600'
          }`}
        >
          <Camera className="w-5 h-5 mx-auto mb-1" />
          Plant Identifier
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-white text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-green-600'
          }`}
        >
          <MessageCircle className="w-5 h-5 mx-auto mb-1" />
          Plant Chat
        </button>
      </div>

      {/* Plant Identifier Tab */}
      {activeTab === 'identify' && (
        <div className="p-6">
          {!uploadedImage ? (
            <div className="text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-green-300 rounded-lg p-12 hover:border-green-400 cursor-pointer transition-colors bg-green-50 hover:bg-green-100"
              >
                <Upload className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Upload Plant Photo</h3>
                <p className="text-gray-500">Click to select a photo of your plant for identification and care instructions</p>
                {isOfflineMode && (
                  <p className="text-yellow-600 text-sm mt-2">Currently in offline mode - identification will be limited</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Uploaded Image */}
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Uploaded plant"
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <button
                  onClick={resetIdentification}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Analysis State */}
              {isAnalyzing && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Analyzing your plant...</p>
                  {isOfflineMode && (
                    <p className="text-yellow-600 text-sm mt-2">Using offline identification</p>
                  )}
                </div>
              )}

              {/* Plant Identification Results */}
              {plantData && !isAnalyzing && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{plantData.name}</h2>
                      <p className="text-gray-600">{plantData.commonName}</p>
                      {plantData.note && (
                        <p className="text-yellow-600 text-sm mt-1">{plantData.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{plantData.confidence}%</div>
                      <div className="text-sm text-gray-500">Confidence</div>
                      <div className="text-xs text-gray-400 mt-1">{plantData.source}</div>
                    </div>
                  </div>

                  {/* Care Instructions */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Droplets className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-800">Watering</h4>
                          <p className="text-sm text-gray-600">{plantData.care.watering}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Sun className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-800">Light</h4>
                          <p className="text-sm text-gray-600">{plantData.care.light}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Thermometer className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-800">Temperature</h4>
                          <p className="text-sm text-gray-600">{plantData.care.temperature}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-800">Humidity</h4>
                        <p className="text-sm text-gray-600">{plantData.care.humidity}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Soil</h4>
                        <p className="text-sm text-gray-600">{plantData.care.soil}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">Fertilizer</h4>
                        <p className="text-sm text-gray-600">{plantData.care.fertilizer}</p>
                      </div>
                    </div>
                  </div>

                  {/* Care Tips */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Pro Tips</h4>
                    <div className="space-y-2">
                      {plantData.tips.map((tip, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-600">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plant Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-96">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {message.sender === 'bot' ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.sender === 'bot' ? 'PlantPal' : 'You'}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your plant... (e.g., 'Why are my leaves turning yellow?')"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantPal;