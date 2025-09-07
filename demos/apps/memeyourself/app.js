const { useState, useEffect, useRef } = React;

const App = () => {
    const [memes, setMemes] = useState([]);
    const [selectedMeme, setSelectedMeme] = useState(null);
    const [userImage, setUserImage] = useState(null);
    const [userImagePreview, setUserImagePreview] = useState(null);
    const [topText, setTopText] = useState('');
    const [bottomText, setBottomText] = useState('');
    const [faceStrength, setFaceStrength] = useState(0.7);
    const [facePosition, setFacePosition] = useState('center');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMeme, setGeneratedMeme] = useState(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [seed, setSeed] = useState('');
    const [visibleMemes, setVisibleMemes] = useState(12);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchMemes();
    }, []);

    const fetchMemes = async () => {
        try {
            const response = await fetch('https://api.imgflip.com/get_memes');
            const data = await response.json();
            if (data.success) {
                setMemes(data.data.memes);
            }
        } catch (error) {
            console.error('Failed to fetch memes:', error);
            // Fallback memes if API fails
            setMemes([
                { id: '181913649', name: 'Drake Pointing', url: 'https://i.imgflip.com/30b1gx.jpg' },
                { id: '87743020', name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg' },
                { id: '112126428', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg' }
            ]);
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setUserImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setUserImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setUserImage(file);
            const reader = new FileReader();
            reader.onload = (e) => setUserImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const generateMeme = async () => {
        if (!selectedMeme || !userImage) {
            alert('Please select a meme template and upload your photo!');
            return;
        }

        setIsGenerating(true);
        setLoadingMessage('Analyzing meme template...');

        try {
            // Convert user image to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const userImageBase64 = e.target.result.split(',')[1];

                setLoadingMessage('Inserting your face...');

                // Create prompt for face insertion
                const prompt = `Insert the person's face from the reference image into this ${selectedMeme.name} meme template, maintaining the meme's style and context. The face should look natural and integrated. Face positioning: ${facePosition}. ${topText ? `Top text: "${topText}". ` : ''}${bottomText ? `Bottom text: "${bottomText}". ` : ''}Make it look like a professional meme.`;

                const formData = new FormData();
                formData.append('prompt', prompt);
                formData.append('reference_images', userImage);
                formData.append('strength', faceStrength.toString());
                if (seed) formData.append('seed', seed);

                setLoadingMessage('Adding finishing touches...');

                const response = await fetch('/api/nanobanana/image', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const imageUrl = response.url;
                    setGeneratedMeme(imageUrl);
                    
                    // Save to history
                    const history = JSON.parse(localStorage.getItem('memeHistory') || '[]');
                    history.unshift({
                        id: Date.now(),
                        meme: selectedMeme.name,
                        timestamp: new Date().toISOString(),
                        url: imageUrl
                    });
                    localStorage.setItem('memeHistory', JSON.stringify(history.slice(0, 10)));
                } else {
                    throw new Error('Generation failed');
                }
            };
            reader.readAsDataURL(userImage);
        } catch (error) {
            console.error('Meme generation failed:', error);
            alert('Oops! The meme council rejected your application. Try again with a different photo or meme!');
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const downloadMeme = () => {
        if (generatedMeme) {
            const link = document.createElement('a');
            link.href = generatedMeme;
            link.download = `meme-${selectedMeme.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const shareToTwitter = () => {
        const text = encodeURIComponent(`I just turned myself into a ${selectedMeme.name} meme! 🤣 Made with @BerrryComputer`);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(window.location.href)}`, '_blank');
    };

    const resetApp = () => {
        setSelectedMeme(null);
        setUserImage(null);
        setUserImagePreview(null);
        setGeneratedMeme(null);
        setTopText('');
        setBottomText('');
        setSeed('');
    };

    const filteredMemes = memes.filter(meme => 
        meme.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, visibleMemes);

    const loadMoreMemes = () => {
        setVisibleMemes(prev => prev + 12);
    };

    return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-4' },
        // Header
        React.createElement('div', { className: 'max-w-6xl mx-auto' },
            React.createElement('div', { className: 'text-center mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20' },
                React.createElement('h1', { className: 'text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg' }, '🍌 Meme Yourself Generator'),
                React.createElement('p', { className: 'text-xl text-white/90 font-medium' }, 'Turn yourself into any meme with AI magic!')
            ),

            // Step 1: Meme Selection
            !selectedMeme && React.createElement('div', { className: 'mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20' },
                React.createElement('h2', { className: 'text-2xl font-bold text-white mb-6' }, '🎯 Step 1: Choose Your Meme Template'),
                
                // Search bar
                React.createElement('div', { className: 'mb-6' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Search memes...',
                        value: searchTerm,
                        onChange: (e) => setSearchTerm(e.target.value),
                        className: 'w-full max-w-md mx-auto block px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all'
                    })
                ),

                // Meme grid
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6' },
                    filteredMemes.map(meme =>
                        React.createElement('div', {
                            key: meme.id,
                            className: 'group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl',
                            onClick: () => setSelectedMeme(meme)
                        },
                            React.createElement('div', { className: 'bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/30 group-hover:border-white/60 transition-all' },
                                React.createElement('img', {
                                    src: meme.url,
                                    alt: meme.name,
                                    className: 'w-full h-48 object-cover rounded-xl mb-3'
                                }),
                                React.createElement('h3', { className: 'text-white font-semibold text-center group-hover:text-yellow-300 transition-colors' }, meme.name),
                                React.createElement('div', { className: 'text-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity' },
                                    React.createElement('span', { className: 'inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full font-bold text-sm' }, 'Select This Meme!')
                                )
                            )
                        )
                    )
                ),

                // Load more button
                visibleMemes < memes.length && React.createElement('div', { className: 'text-center' },
                    React.createElement('button', {
                        onClick: loadMoreMemes,
                        className: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-full font-bold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg'
                    }, 'Load More Memes')
                )
            ),

            // Selected meme preview
            selectedMeme && React.createElement('div', { className: 'mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20' },
                React.createElement('h2', { className: 'text-2xl font-bold text-white mb-4' }, '✅ Selected Meme'),
                React.createElement('div', { className: 'flex flex-col md:flex-row items-center gap-6' },
                    React.createElement('img', {
                        src: selectedMeme.url,
                        alt: selectedMeme.name,
                        className: 'w-48 h-48 object-cover rounded-2xl shadow-lg'
                    }),
                    React.createElement('div', { className: 'text-center md:text-left' },
                        React.createElement('h3', { className: 'text-2xl font-bold text-white mb-2' }, selectedMeme.name),
                        React.createElement('button', {
                            onClick: resetApp,
                            className: 'bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-2 rounded-full font-bold hover:from-red-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200'
                        }, 'Choose Different Meme')
                    )
                )
            ),

            // Step 2: Image Upload
            selectedMeme && React.createElement('div', { className: 'mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20' },
                React.createElement('h2', { className: 'text-2xl font-bold text-white mb-6' }, '📸 Step 2: Upload Your Photo'),
                
                !userImagePreview && React.createElement('div', {
                    className: 'border-4 border-dashed border-white/40 rounded-2xl p-12 text-center cursor-pointer hover:border-white/60 hover:bg-white/5 transition-all',
                    onDrop: handleDrop,
                    onDragOver: (e) => e.preventDefault(),
                    onClick: () => fileInputRef.current?.click()
                },
                    React.createElement('div', { className: 'text-6xl mb-4' }, '📤'),
                    React.createElement('p', { className: 'text-white text-xl font-semibold mb-2' }, 'Drop your photo here or click to upload'),
                    React.createElement('p', { className: 'text-white/70' }, 'For best results, use a clear front-facing photo with good lighting')
                ),

                userImagePreview && React.createElement('div', { className: 'text-center' },
                    React.createElement('img', {
                        src: userImagePreview,
                        alt: 'Your photo',
                        className: 'w-48 h-48 object-cover rounded-2xl mx-auto mb-4 shadow-lg'
                    }),
                    React.createElement('button', {
                        onClick: () => fileInputRef.current?.click(),
                        className: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-bold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200'
                    }, 'Upload Different Photo')
                ),

                React.createElement('input', {
                    ref: fileInputRef,
                    type: 'file',
                    accept: 'image/*',
                    onChange: handleImageUpload,
                    style: { display: 'none' }
                })
            ),

            // Step 3: Customization
            selectedMeme && userImage && React.createElement('div', { className: 'mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20' },
                React.createElement('h2', { className: 'text-2xl font-bold text-white mb-6' }, '⚙️ Step 3: Customize Your Meme'),
                
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-6' },
                    React.createElement('div', {},
                        React.createElement('label', { className: 'block text-white font-semibold mb-2' }, 'Top Text (optional)'),
                        React.createElement('input', {
                            type: 'text',
                            value: topText,
                            onChange: (e) => setTopText(e.target.value),
                            placeholder: 'Enter top text...',
                            className: 'w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all'
                        })
                    ),
                    React.createElement('div', {},
                        React.createElement('label', { className: 'block text-white font-semibold mb-2' }, 'Bottom Text (optional)'),
                        React.createElement('input', {
                            type: 'text',
                            value: bottomText,
                            onChange: (e) => setBottomText(e.target.value),
                            placeholder: 'Enter bottom text...',
                            className: 'w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all'
                        })
                    )
                ),

                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-6' },
                    React.createElement('div', {},
                        React.createElement('label', { className: 'block text-white font-semibold mb-2' }, `Face Integration Strength: ${faceStrength}`),
                        React.createElement('input', {
                            type: 'range',
                            min: '0.3',
                            max: '0.9',
                            step: '0.1',
                            value: faceStrength,
                            onChange: (e) => setFaceStrength(parseFloat(e.target.value)),
                            className: 'w-full'
                        })
                    ),
                    React.createElement('div', {},
                        React.createElement('label', { className: 'block text-white font-semibold mb-2' }, 'Face Position'),
                        React.createElement('select', {
                            value: facePosition,
                            onChange: (e) => setFacePosition(e.target.value),
                            className: 'w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all'
                        },
                            React.createElement('option', { value: 'center' }, 'Center'),
                            React.createElement('option', { value: 'left' }, 'Left side'),
                            React.createElement('option', { value: 'right' }, 'Right side'),
                            React.createElement('option', { value: 'multiple' }, 'Multiple faces')
                        )
                    )
                ),

                React.createElement('div', { className: 'mb-6' },
                    React.createElement('button', {
                        onClick: () => setShowAdvanced(!showAdvanced),
                        className: 'text-white font-semibold hover:text-yellow-300 transition-colors'
                    }, `${showAdvanced ? '▼' : '▶'} Advanced Options`),
                    
                    showAdvanced && React.createElement('div', { className: 'mt-4' },
                        React.createElement('label', { className: 'block text-white font-semibold mb-2' }, 'Seed (for reproducible results)'),
                        React.createElement('input', {
                            type: 'text',
                            value: seed,
                            onChange: (e) => setSeed(e.target.value),
                            placeholder: 'Enter seed number...',
                            className: 'w-full max-w-md px-4 py-3 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/70 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all'
                        })
                    )
                )
            ),

            // Generation Area
            selectedMeme && userImage && React.createElement('div', { className: 'mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20' },
                React.createElement('h2', { className: 'text-2xl font-bold text-white mb-6' }, '🚀 Generate Your Meme'),
                
                React.createElement('div', { className: 'text-center' },
                    !isGenerating && !generatedMeme && React.createElement('button', {
                        onClick: generateMeme,
                        className: 'bg-gradient-to-r from-green-500 to-blue-600 text-white px-12 py-4 rounded-full text-xl font-bold hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg mb-6'
                    }, '🎨 Generate My Meme!'),

                    isGenerating && React.createElement('div', { className: 'mb-6' },
                        React.createElement('div', { className: 'animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4' }),
                        React.createElement('p', { className: 'text-white text-lg font-semibold' }, loadingMessage)
                    ),

                    generatedMeme && React.createElement('div', { className: 'space-y-6' },
                        React.createElement('div', { className: 'text-center' },
                            React.createElement('h3', { className: 'text-2xl font-bold text-white mb-4' }, '🎉 Your Meme is Ready!'),
                            React.createElement('img', {
                                src: generatedMeme,
                                alt: 'Generated meme',
                                className: 'max-w-lg w-full mx-auto rounded-2xl shadow-lg mb-6'
                            })
                        ),
                        
                        React.createElement('div', { className: 'flex flex-wrap justify-center gap-4' },
                            React.createElement('button', {
                                onClick: downloadMeme,
                                className: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-full font-bold hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg'
                            }, '📥 Download'),
                            
                            React.createElement('button', {
                                onClick: shareToTwitter,
                                className: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white px-6 py-3 rounded-full font-bold hover:from-blue-500 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg'
                            }, '🐦 Share on Twitter'),
                            
                            React.createElement('button', {
                                onClick: () => generateMeme(),
                                className: 'bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-full font-bold hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg'
                            }, '🎲 Try Another Variation'),
                            
                            React.createElement('button', {
                                onClick: resetApp,
                                className: 'bg-gradient-to-r from-gray-500 to-gray-700 text-white px-6 py-3 rounded-full font-bold hover:from-gray-600 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg'
                            }, '🔄 Start Over')
                        )
                    )
                )
            ),

            // Footer
            React.createElement('div', { className: 'text-center mt-12 text-white/70' },
                React.createElement('p', { className: 'mb-2' }, 'Made with 🍓 by '),
                React.createElement('a', {
                    href: 'https://berrry.app',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'text-yellow-300 hover:text-yellow-200 font-semibold transition-colors'
                }, 'Berrry Computer'),
                React.createElement('p', { className: 'text-sm mt-2' }, 'Turn yourself into meme history! 🤣')
            )
        )
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));