const { useState, useEffect, useRef } = React;

const App = () => {
    const [prompt, setPrompt] = useState('Banana surviving the apocalypse with coffee');
    const [imageSize, setImageSize] = useState('512x512');
    const [seed, setSeed] = useState('');
    const [chaosLevel, setChaosLevel] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [error, setError] = useState(null);
    const [currentQuote, setCurrentQuote] = useState(0);
    const [currentStatus, setCurrentStatus] = useState(0);
    const [consoleExpanded, setConsoleExpanded] = useState(false);
    const [survivalTime, setSurvivalTime] = useState(0);
    const [showPanic, setShowPanic] = useState(false);
    const [thisIsFineMode, setThisIsFineMode] = useState(false);

    const developerQuotes = [
        "It works on my machine! 🍌",
        "Just ship it, we'll fix it in post! 🔥",
        "The bugs are features now 🐛",
        "Coffee levels: Critical ☕",
        "404: Sanity not found 🤖",
        "Deploying to production... YOLO! 🚀",
        "This shouldn't work but it does 🎯",
        "Error? What error? I see success! 🎉"
    ];

    const statusMessages = [
        { level: 1, emoji: "🔥", text: "This is fine" },
        { level: 2, emoji: "🔥🔥", text: "Slightly on fire, but functional" },
        { level: 3, emoji: "🔥🔥🔥", text: "Burning bright, still generating" }
    ];

    const loadingMessages = [
        "Generating through the flames...",
        "AI is having an existential crisis, please wait...",
        "Teaching bananas to art while servers melt...",
        "This is fine. Image incoming...",
        "Pixels assembling despite the chaos...",
        "Banana magic happening in server room fire..."
    ];

    const consoleMessages = [
        "INFO: Banana API initialized successfully",
        "WARN: Coffee levels dangerously low",
        "ERROR: Sanity check failed, proceeding anyway",
        "DEBUG: This shouldn't work but it does",
        "WARN: Fire detected in server room. Continuing...",
        "INFO: Everything is fine. Really. Trust us.",
        "ERROR: Help, I'm trapped in an AI factory!",
        "DEBUG: Banana generation at 110% capacity"
    ];

    const suggestions = [
        { emoji: '🔥', text: 'Banana surviving the apocalypse with coffee', chaos: 1 },
        { emoji: '🏢', text: 'Office on fire but banana is coding anyway', chaos: 2 },
        { emoji: '☕', text: 'Developer banana fixing bugs at 3am', chaos: 1 },
        { emoji: '💻', text: 'Banana debugging while servers burn', chaos: 3 },
        { emoji: '🚨', text: 'Banana saying "this is fine" in server room', chaos: 3 },
        { emoji: '🍌', text: 'Zen banana meditating in burning datacenter', chaos: 2 }
    ];

    const sizeOptions = [
        { value: '512x512', label: '512x512 (Stable)', risk: 'Stable' },
        { value: '768x768', label: '768x768 (Risky)', risk: 'Risky' },
        { value: '1024x1024', label: '1024x1024 (Living Dangerously)', risk: 'Living Dangerously' },
        { value: '768x512', label: '768x512 (Landscape Chaos)', risk: 'Landscape Chaos' },
        { value: '512x768', label: '512x768 (Portrait Panic)', risk: 'Portrait Panic' }
    ];

    const fireParticlesRef = useRef();

    useEffect(() => {
        const savedGallery = localStorage.getItem('nanobanana-chaos-gallery');
        if (savedGallery) {
            setGallery(JSON.parse(savedGallery));
        }

        // Survival timer
        const survivalTimer = setInterval(() => {
            setSurvivalTime(prev => prev + 1);
        }, 1000);

        // Quote rotation
        const quoteTimer = setInterval(() => {
            setCurrentQuote(prev => (prev + 1) % developerQuotes.length);
        }, 30000);

        // Status rotation
        const statusTimer = setInterval(() => {
            setCurrentStatus(prev => (prev + 1) % statusMessages.length);
        }, 15000);

        // Fire particles
        const createFireParticle = () => {
            if (!fireParticlesRef.current) return;
            
            const particle = document.createElement('div');
            particle.className = 'fire-particle';
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.animationDelay = Math.random() * 2 + 's';
            fireParticlesRef.current.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 4000);
        };

        const particleInterval = setInterval(createFireParticle, 2000);

        return () => {
            clearInterval(survivalTimer);
            clearInterval(quoteTimer);
            clearInterval(statusTimer);
            clearInterval(particleInterval);
        };
    }, []);

    useEffect(() => {
        fireParticlesRef.current = document.getElementById('fire-particles');
    }, []);

    const saveToGallery = (imageData) => {
        const newGallery = [imageData, ...gallery].slice(0, 8);
        setGallery(newGallery);
        localStorage.setItem('nanobanana-chaos-gallery', JSON.stringify(newGallery));
    };

    const generateImage = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const [width, height] = imageSize.split('x');
            let finalPrompt = prompt;
            
            // Add chaos to prompt based on level and thisIsFineMode
            if (thisIsFineMode) {
                finalPrompt += " with fire and chaos in background";
            }
            
            if (chaosLevel >= 2) {
                finalPrompt += " dramatic lighting";
            }
            if (chaosLevel >= 3) {
                finalPrompt += " apocalyptic scene";
            }
            
            const currentSeed = seed || Math.floor(Math.random() * 1000000);
            const imageUrl = `/api/nanobanana/image/${width}/${height}?prompt=${encodeURIComponent(finalPrompt)}${seed ? `&seed=${currentSeed}` : ''}`;
            
            // Test if image loads
            const img = new Image();
            img.onload = () => {
                const imageData = {
                    url: imageUrl,
                    prompt: finalPrompt,
                    originalPrompt: prompt,
                    size: imageSize,
                    seed: currentSeed,
                    chaosLevel: chaosLevel,
                    timestamp: Date.now()
                };
                setGeneratedImage(imageData);
                saveToGallery(imageData);
                setIsGenerating(false);
            };
            img.onerror = () => {
                const chaosErrors = [
                    "Oops! Our banana got incinerated. Try again!",
                    "Server room is too on fire. Retrying...",
                    "AI had a meltdown. This is fine though.",
                    "Banana.exe has stopped working. Very normal.",
                    "Everything's broken but we're still here!"
                ];
                setError(chaosErrors[Math.floor(Math.random() * chaosErrors.length)]);
                setIsGenerating(false);
            };
            img.src = imageUrl;
            
        } catch (err) {
            setError("Something went catastrophically banana-shaped! But hey, we're still running! 🔥");
            setIsGenerating(false);
        }
    };

    const downloadImage = () => {
        if (!generatedImage) return;
        
        const link = document.createElement('a');
        link.href = generatedImage.url;
        link.download = `this-is-fine-banana-${generatedImage.timestamp}.png`;
        link.click();
    };

    const panicButton = () => {
        setShowPanic(true);
        setTimeout(() => setShowPanic(false), 2000);
    };

    const formatSurvivalTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getChaosButtonClass = () => {
        switch(chaosLevel) {
            case 1: return 'chaos-low';
            case 2: return 'chaos-medium';
            case 3: return 'chaos-high';
            default: return 'chaos-low';
        }
    };

    const getCurrentLoadingMessage = () => {
        return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    };

    return React.createElement('div', { className: 'min-h-screen p-4' },
        React.createElement('div', { className: 'max-w-4xl mx-auto' },
            // Fire Status Bar
            React.createElement('div', { className: 'fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg z-10 status-pulse' },
                React.createElement('div', { className: 'text-sm font-bold' },
                    statusMessages[currentStatus].emoji + ' ' + statusMessages[currentStatus].text),
                React.createElement('div', { className: 'text-xs mt-1' },
                    `Survived: ${formatSurvivalTime(survivalTime)}`)
            ),

            // Panic Button
            React.createElement('div', { className: 'fixed top-4 left-4 z-10' },
                React.createElement('button', {
                    onClick: panicButton,
                    className: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm shake'
                }, 'PANIC!'),
                showPanic && React.createElement('div', { className: 'absolute top-12 left-0 bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap' },
                    "Panicking won't help, but okay... 🔥")
            ),

            // Header
            React.createElement('div', { className: 'text-center mb-8' },
                React.createElement('h1', { 
                    className: 'text-5xl font-bold text-amber-800 mb-2 glitch',
                    'data-text': '🍌 Nanobanana Demo',
                    style: { textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }
                }, '🍌 Nanobanana Demo 🔥'),
                React.createElement('p', { className: 'text-xl text-amber-700 flicker' }, 
                    'This is fine. Everything is bananas! 🔥'),
                React.createElement('div', { className: 'text-sm text-amber-600 mt-2' },
                    `"${developerQuotes[currentQuote]}"`)
            ),

            // Main Interface
            React.createElement('div', { className: 'bg-white/80 backdrop-blur-sm rounded-2xl p-8 banana-shadow mb-8 screen-flicker' },
                // Prompt Input
                React.createElement('div', { className: 'mb-6' },
                    React.createElement('label', { className: 'block text-amber-800 font-semibold mb-3 text-lg' },
                        '✨ Describe your wildest banana dreams... while everything burns around us! 🔥'),
                    React.createElement('div', { className: 'relative' },
                        React.createElement('textarea', {
                            value: prompt,
                            onChange: (e) => setPrompt(e.target.value),
                            className: 'w-full p-4 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none resize-none text-amber-800 bg-white/70 screen-flicker',
                            rows: 3,
                            placeholder: 'Abstract banana art in a burning office'
                        }),
                        React.createElement('div', { className: 'absolute bottom-2 right-3 text-sm text-amber-600' },
                            prompt.length > 100 ? 'ERROR 404: Characters not found... jk, it\'s working' : `${prompt.length} characters`)
                    )
                ),

                // Quick Suggestions
                React.createElement('div', { className: 'mb-6' },
                    React.createElement('h3', { className: 'text-amber-800 font-semibold mb-3' },
                        '💡 Quick suggestions (tested in production):'),
                    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' },
                        ...suggestions.map((suggestion, index) =>
                            React.createElement('button', {
                                key: index,
                                onClick: () => setPrompt(suggestion.text),
                                className: `suggestion-button p-3 rounded-lg text-left text-amber-800 text-sm font-medium suggestion-chaos-${suggestion.chaos}`
                            }, `${suggestion.emoji} ${suggestion.text}`)
                        )
                    )
                ),

                // Settings Row
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6' },
                    // Image Size
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-amber-800 font-semibold mb-2' },
                            '📐 Image Size (may vary based on chaos level)'),
                        React.createElement('select', {
                            value: imageSize,
                            onChange: (e) => setImageSize(e.target.value),
                            className: 'w-full p-3 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:outline-none bg-white/70 text-amber-800'
                        }, ...sizeOptions.map(option =>
                            React.createElement('option', { key: option.value, value: option.value }, option.label)
                        ))
                    ),

                    // Chaos Level
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-amber-800 font-semibold mb-2' },
                            '🔥 Embrace the Chaos'),
                        React.createElement('input', {
                            type: 'range',
                            min: '1',
                            max: '3',
                            value: chaosLevel,
                            onChange: (e) => setChaosLevel(parseInt(e.target.value)),
                            className: 'w-full'
                        }),
                        React.createElement('div', { className: 'text-xs text-amber-600 mt-1' },
                            ['This is fine', 'Full Meltdown', 'Apocalypse Now'][chaosLevel - 1])
                    ),

                    // Seed
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-amber-800 font-semibold mb-2' },
                            '🎲 Seed (or let fate decide)'),
                        React.createElement('input', {
                            type: 'text',
                            value: seed,
                            onChange: (e) => setSeed(e.target.value),
                            placeholder: 'Random like production bugs',
                            className: 'w-full p-3 border-2 border-amber-300 rounded-lg focus:border-amber-500 focus:outline-none bg-white/70 text-amber-800'
                        }),
                        !seed && Math.random() > 0.8 && React.createElement('div', { className: 'text-xs text-red-600 mt-1' },
                            'SEED NOT FOUND')
                    )
                ),

                // This Is Fine Mode Toggle
                React.createElement('div', { className: 'mb-6 text-center' },
                    React.createElement('label', { className: 'inline-flex items-center cursor-pointer' },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: thisIsFineMode,
                            onChange: (e) => setThisIsFineMode(e.target.checked),
                            className: 'mr-2'
                        }),
                        React.createElement('span', { className: 'text-amber-800 font-semibold' },
                            '🔥 "This Is Fine" Mode (adds chaos to all prompts)')
                    )
                ),

                // Generate Button
                React.createElement('button', {
                    onClick: generateImage,
                    disabled: isGenerating || !prompt.trim(),
                    className: `generate-button w-full py-4 px-8 text-white font-bold text-xl rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${getChaosButtonClass()} ${isGenerating ? 'cursor-wait' : ''}`
                }, 
                    isGenerating 
                        ? React.createElement('div', { className: 'flex items-center justify-center' },
                            React.createElement('div', { className: 'spinner w-6 h-6 border-2 border-white border-t-transparent rounded-full mr-3' }),
                            getCurrentLoadingMessage())
                        : '🔥 Generate Despite Everything! 🍌'
                )
            ),

            // Results Area
            generatedImage && React.createElement('div', { className: 'bg-white/80 backdrop-blur-sm rounded-2xl p-8 banana-shadow mb-8 fade-in' },
                React.createElement('div', { className: 'text-center mb-4' },
                    React.createElement('h3', { className: 'text-2xl font-bold text-amber-800 mb-2' },
                        'Generated successfully (somehow) 🔥'),
                    React.createElement('p', { className: 'text-sm text-amber-600' },
                        `Chaos Level: ${generatedImage.chaosLevel} | Quality: Better than expected`)
                ),
                React.createElement('div', { className: 'text-center mb-6' },
                    React.createElement('img', {
                        src: generatedImage.url,
                        alt: generatedImage.originalPrompt,
                        className: 'max-w-full h-auto rounded-xl banana-shadow mx-auto',
                        style: { maxHeight: '600px' }
                    })
                ),
                React.createElement('div', { className: 'flex flex-wrap gap-4 justify-center' },
                    React.createElement('button', {
                        onClick: downloadImage,
                        className: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors'
                    }, '💾 Save Before It Burns'),
                    React.createElement('button', {
                        onClick: () => {
                            setSeed('');
                            generateImage();
                        },
                        className: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors'
                    }, '🔄 Try Again (What Could Go Wrong?)'),
                    React.createElement('button', {
                        onClick: () => {
                            if (navigator.share) {
                                navigator.share({
                                    title: 'This Is Fine - Nanobanana',
                                    text: 'Check out this AI-generated chaos!',
                                    url: window.location.href
                                });
                            }
                        },
                        className: 'bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors'
                    }, '📤 Share the Chaos')
                )
            ),

            // Error Message
            error && React.createElement('div', { className: 'bg-red-100 border-2 border-red-300 rounded-xl p-4 mb-8 text-red-800 text-center shake' },
                error,
                React.createElement('div', { className: 'text-xs mt-2' },
                    'But we\'re still running! 🔥')
            ),

            // Developer Console
            React.createElement('div', { className: 'bg-white/80 backdrop-blur-sm rounded-2xl p-6 banana-shadow mb-8' },
                React.createElement('button', {
                    onClick: () => setConsoleExpanded(!consoleExpanded),
                    className: 'w-full text-left text-amber-800 font-bold text-lg mb-4 hover:text-amber-600'
                }, '🐛 Dev Console (For the Brave) ' + (consoleExpanded ? '▼' : '▶')),
                consoleExpanded && React.createElement('div', { className: 'console p-4 text-xs' },
                    ...consoleMessages.map((msg, index) =>
                        React.createElement('div', { key: index, className: 'mb-1' },
                            `[${new Date().toLocaleTimeString()}] ${msg}`)
                    ),
                    React.createElement('div', { className: 'text-yellow-400 mt-2' },
                        `> System Status: Everything is on fire, but operational! 🔥`)
                )
            ),

            // Gallery
            gallery.length > 0 && React.createElement('div', { className: 'bg-white/80 backdrop-blur-sm rounded-2xl p-8 banana-shadow mb-8' },
                React.createElement('h3', { className: 'text-xl font-bold text-amber-800 mb-4' },
                    '🖼️ Chaos Gallery (Survived the Fire)'),
                React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
                    ...gallery.map((item, index) =>
                        React.createElement('div', { key: index, className: 'group cursor-pointer relative' },
                            React.createElement('img', {
                                src: item.url,
                                alt: item.originalPrompt,
                                onClick: () => setGeneratedImage(item),
                                className: 'w-full h-24 object-cover rounded-lg banana-shadow group-hover:scale-105 transition-transform'
                            }),
                            React.createElement('div', { className: 'absolute top-1 right-1 text-xs bg-black/70 text-white px-1 rounded' },
                                '🔥'.repeat(item.chaosLevel))
                        )
                    )
                )
            ),

            // Fire Extinguisher (cosmetic)
            React.createElement('div', { className: 'text-center mb-8' },
                React.createElement('button', {
                    onClick: () => {
                        // Just show a message, doesn't actually do anything
                        alert("Fire extinguisher is out of order. This is fine. 🔥");
                    },
                    className: 'bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium'
                }, '🧯 Fire Extinguisher (Broken)')
            ),

            // Footer
            React.createElement('div', { className: 'text-center text-amber-700 mt-8' },
                React.createElement('p', { className: 'mb-2' },
                    'Powered by ',
                    React.createElement('a', {
                        href: 'https://berrry.app',
                        className: 'text-amber-800 hover:text-amber-900 font-semibold underline',
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }, '🫐 berrry.app'),
                    ' • Running on hopes, dreams, and caffeine ☕🔥'),
                React.createElement('p', { className: 'text-sm text-amber-600' },
                    'No developers were harmed in the making of this demo (probably)'),
                React.createElement('div', { className: 'text-xs text-amber-500 mt-2' },
                    'Achievement Unlocked: Survived ', formatSurvivalTime(survivalTime), ' of chaos! 🏆')
            )
        )
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));