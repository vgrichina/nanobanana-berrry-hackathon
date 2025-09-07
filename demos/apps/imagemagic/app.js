const { useState, useEffect, useRef } = React;

// Move all components to top level to prevent recreation
const Header = ({ totalGenerated }) => React.createElement('div', {
    className: 'banana-gradient text-white p-6 rounded-lg mb-6 relative overflow-hidden'
}, [
    React.createElement('div', {
        key: 'mascot',
        className: 'absolute top-4 right-4 text-6xl banana-float'
    }, '🍌'),
    React.createElement('h1', {
        key: 'title',
        className: 'text-4xl font-bold mb-2'
    }, '🍌 NanoBanana API Playground'),
    React.createElement('p', {
        key: 'subtitle',
        className: 'text-lg opacity-90 mb-4'
    }, 'Generate, Edit & Combine Images with AI Magic'),
    React.createElement('div', {
        key: 'stats',
        className: 'text-sm opacity-80'
    }, `Total Images Generated: ${totalGenerated}`)
]);

const TabButton = ({ id, label, icon, activeTab, onClick }) => React.createElement('button', {
    key: id,
    onClick: () => onClick(id),
    className: `px-6 py-3 rounded-lg font-medium transition-all ${
        activeTab === id 
            ? 'bg-yellow-400 text-gray-900 shadow-lg' 
            : 'bg-white text-gray-600 hover:bg-yellow-50'
    }`
}, `${icon} ${label}`);

const SizeSelector = ({ sizes, size, onSizeChange }) => React.createElement('div', {
    className: 'grid grid-cols-2 md:grid-cols-3 gap-3'
}, sizes.map(sizeOption => 
    React.createElement('button', {
        key: sizeOption.value,
        onClick: () => onSizeChange(sizeOption.value),
        className: `p-3 rounded border-2 transition-all ${
            size === sizeOption.value 
                ? 'border-yellow-400 bg-yellow-50' 
                : 'border-gray-200 hover:border-yellow-200'
        }`
    }, [
        React.createElement('div', {
            key: 'label',
            className: 'font-medium'
        }, sizeOption.label),
        React.createElement('div', {
            key: 'aspect',
            className: 'text-xs text-gray-500'
        }, sizeOption.aspect)
    ])
));

const StyleTags = ({ styles, selectedStyle, onStyleChange }) => React.createElement('div', {
    className: 'flex flex-wrap gap-2'
}, styles.map(style => 
    React.createElement('button', {
        key: style,
        onClick: () => onStyleChange(selectedStyle === style ? '' : style),
        className: `px-3 py-1 rounded-full text-sm transition-all ${
            selectedStyle === style 
                ? 'bg-yellow-400 text-gray-900' 
                : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
        }`
    }, style)
));

const GenerateTab = ({ 
    prompt, 
    setPrompt, 
    size, 
    setSize, 
    seed, 
    setSeed, 
    selectedStyle, 
    setSelectedStyle,
    showAdvanced,
    setShowAdvanced,
    loading, 
    generateImage, 
    getRandomPrompt,
    sizes,
    styles
}) => React.createElement('div', {
    className: 'space-y-6'
}, [
    React.createElement('div', { key: 'prompt-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, 'Image Prompt'),
        React.createElement('div', {
            key: 'input-group',
            className: 'relative'
        }, [
            React.createElement('textarea', {
                key: 'textarea',
                value: prompt,
                onChange: (e) => setPrompt(e.target.value),
                placeholder: 'wizard in purple robes holding crystal staff photorealistic',
                className: 'w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400',
                rows: 3
            }),
            React.createElement('button', {
                key: 'random-btn',
                onClick: getRandomPrompt,
                className: 'absolute top-2 right-2 text-yellow-600 hover:text-yellow-800'
            }, '🎲')
        ])
    ]),
    React.createElement('div', { key: 'size-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, 'Image Size'),
        React.createElement(SizeSelector, {
            key: 'size-selector',
            sizes,
            size,
            onSizeChange: setSize
        })
    ]),
    React.createElement('div', { key: 'advanced-section' }, [
        React.createElement('button', {
            key: 'toggle',
            onClick: () => setShowAdvanced(!showAdvanced),
            className: 'text-sm text-gray-600 hover:text-gray-800 mb-2'
        }, `${showAdvanced ? '▼' : '▶'} Advanced Options`),
        showAdvanced && React.createElement('div', {
            key: 'advanced-content',
            className: 'space-y-4 p-4 bg-gray-50 rounded-lg'
        }, [
            React.createElement('div', { key: 'seed' }, [
                React.createElement('label', {
                    key: 'label',
                    className: 'block text-xs text-gray-600 mb-1'
                }, 'Seed (for reproducible results)'),
                React.createElement('input', {
                    key: 'input',
                    type: 'number',
                    value: seed,
                    onChange: (e) => setSeed(e.target.value),
                    className: 'w-full p-2 border rounded text-sm',
                    placeholder: '12345'
                })
            ]),
            React.createElement('div', { key: 'styles' }, [
                React.createElement('label', {
                    key: 'label',
                    className: 'block text-xs text-gray-600 mb-2'
                }, 'Style Suggestions'),
                React.createElement(StyleTags, {
                    key: 'style-tags',
                    styles,
                    selectedStyle,
                    onStyleChange: setSelectedStyle
                })
            ])
        ])
    ]),
    React.createElement('button', {
        key: 'generate-btn',
        onClick: generateImage,
        disabled: loading || !prompt.trim(),
        className: `w-full py-4 rounded-lg font-bold text-lg transition-all ${
            loading || !prompt.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 shadow-lg hover:shadow-xl'
        }`
    }, loading ? React.createElement('span', {
        className: 'inline-flex items-center'
    }, [
        React.createElement('span', {
            key: 'icon',
            className: 'loading-banana mr-2'
        }, '🍌'),
        'Generating Magic...'
    ]) : '✨ Generate Image')
]);

const EditTab = ({ 
    uploadedImage, 
    fileInputRef, 
    handleFileUpload, 
    editPrompt, 
    setEditPrompt, 
    strength, 
    setStrength, 
    loading, 
    editImage 
}) => React.createElement('div', {
    className: 'space-y-6'
}, [
    React.createElement('div', { key: 'upload-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, 'Upload Base Image'),
        React.createElement('div', {
            key: 'upload-zone',
            onClick: () => fileInputRef.current?.click(),
            className: 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-yellow-400 transition-colors'
        }, [
            React.createElement('input', {
                key: 'file-input',
                ref: fileInputRef,
                type: 'file',
                accept: 'image/*',
                onChange: handleFileUpload,
                className: 'hidden'
            }),
            uploadedImage 
                ? React.createElement('div', {
                    key: 'uploaded',
                    className: 'text-green-600'
                }, `📁 ${uploadedImage.name}`)
                : React.createElement('div', {
                    key: 'placeholder',
                    className: 'text-gray-500'
                }, [
                    React.createElement('div', {
                        key: 'icon',
                        className: 'text-4xl mb-2'
                    }, '📸'),
                    React.createElement('div', {
                        key: 'text'
                    }, 'Click to upload or drag & drop')
                ])
        ])
    ]),
    React.createElement('div', { key: 'edit-prompt-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, 'Edit Instructions'),
        React.createElement('textarea', {
            key: 'textarea',
            value: editPrompt,
            onChange: (e) => setEditPrompt(e.target.value),
            placeholder: 'change the background to a modern office',
            className: 'w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400',
            rows: 2
        })
    ]),
    React.createElement('div', { key: 'strength-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, `Edit Strength: ${strength}`),
        React.createElement('input', {
            key: 'slider',
            type: 'range',
            min: 0.1,
            max: 1.0,
            step: 0.1,
            value: strength,
            onChange: (e) => setStrength(parseFloat(e.target.value)),
            className: 'w-full'
        }),
        React.createElement('div', {
            key: 'labels',
            className: 'flex justify-between text-xs text-gray-500 mt-1'
        }, [
            React.createElement('span', { key: 'subtle' }, 'Subtle Changes'),
            React.createElement('span', { key: 'complete' }, 'Complete Transformation')
        ])
    ]),
    React.createElement('button', {
        key: 'edit-btn',
        onClick: editImage,
        disabled: loading || !uploadedImage || !editPrompt.trim(),
        className: `w-full py-4 rounded-lg font-bold text-lg transition-all ${
            loading || !uploadedImage || !editPrompt.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg hover:shadow-xl'
        }`
    }, loading ? React.createElement('span', {
        className: 'inline-flex items-center'
    }, [
        React.createElement('span', {
            key: 'icon',
            className: 'loading-banana mr-2'
        }, '🍌'),
        'Editing Magic...'
    ]) : '✨ Edit Image')
]);

const ComposeTab = ({ 
    multipleImages, 
    multiFileInputRef, 
    handleMultipleFileUpload, 
    composePrompt, 
    setComposePrompt, 
    loading, 
    composeImages 
}) => React.createElement('div', {
    className: 'space-y-6'
}, [
    React.createElement('div', { key: 'multi-upload-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, 'Upload Reference Images'),
        React.createElement('div', {
            key: 'upload-zone',
            onClick: () => multiFileInputRef.current?.click(),
            className: 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-yellow-400 transition-colors'
        }, [
            React.createElement('input', {
                key: 'file-input',
                ref: multiFileInputRef,
                type: 'file',
                accept: 'image/*',
                multiple: true,
                onChange: handleMultipleFileUpload,
                className: 'hidden'
            }),
            multipleImages.length > 0
                ? React.createElement('div', {
                    key: 'uploaded',
                    className: 'text-green-600'
                }, `📁 ${multipleImages.length} images selected`)
                : React.createElement('div', {
                    key: 'placeholder',
                    className: 'text-gray-500'
                }, [
                    React.createElement('div', {
                        key: 'icon',
                        className: 'text-4xl mb-2'
                    }, '🎭'),
                    React.createElement('div', {
                        key: 'text'
                    }, 'Upload multiple images to combine')
                ])
        ])
    ]),
    React.createElement('div', { key: 'compose-prompt-section' }, [
        React.createElement('label', {
            key: 'label',
            className: 'block text-sm font-medium text-gray-700 mb-2'
        }, 'Composition Instructions'),
        React.createElement('textarea', {
            key: 'textarea',
            value: composePrompt,
            onChange: (e) => setComposePrompt(e.target.value),
            placeholder: 'combine these images into a fantasy landscape with magical elements',
            className: 'w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400',
            rows: 3
        })
    ]),
    React.createElement('button', {
        key: 'compose-btn',
        onClick: composeImages,
        disabled: loading || multipleImages.length === 0 || !composePrompt.trim(),
        className: `w-full py-4 rounded-lg font-bold text-lg transition-all ${
            loading || multipleImages.length === 0 || !composePrompt.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
        }`
    }, loading ? React.createElement('span', {
        className: 'inline-flex items-center'
    }, [
        React.createElement('span', {
            key: 'icon',
            className: 'loading-banana mr-2'
        }, '🍌'),
        'Composing Magic...'
    ]) : '🎭 Compose Images')
]);

const ImageCard = ({ image, downloadImage, copyApiUrl }) => React.createElement('div', {
    className: 'bg-white rounded-lg shadow-lg overflow-hidden mb-4 break-inside-avoid'
}, [
    React.createElement('img', {
        key: 'image',
        src: image.url,
        alt: image.prompt,
        className: 'w-full h-auto'
    }),
    React.createElement('div', {
        key: 'content',
        className: 'p-4'
    }, [
        React.createElement('p', {
            key: 'prompt',
            className: 'text-sm text-gray-700 mb-2 line-clamp-2'
        }, image.prompt),
        React.createElement('div', {
            key: 'meta',
            className: 'flex justify-between items-center text-xs text-gray-500 mb-3'
        }, [
            React.createElement('span', {
                key: 'type',
                className: `px-2 py-1 rounded ${
                    image.type === 'generated' ? 'bg-yellow-100 text-yellow-800' :
                    image.type === 'edited' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                }`
            }, image.type),
            React.createElement('span', {
                key: 'time'
            }, new Date(image.timestamp).toLocaleDateString())
        ]),
        React.createElement('div', {
            key: 'actions',
            className: 'flex gap-2'
        }, [
            React.createElement('button', {
                key: 'download',
                onClick: () => downloadImage(image.url),
                className: 'flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm'
            }, '⬇️ Download'),
            React.createElement('button', {
                key: 'copy',
                onClick: () => copyApiUrl(image),
                className: 'flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm'
            }, '🔗 Copy URL')
        ])
    ])
]);

const Gallery = ({ generatedImages, downloadImage, copyApiUrl }) => React.createElement('div', {
    className: 'mt-8'
}, [
    React.createElement('h2', {
        key: 'title',
        className: 'text-2xl font-bold text-gray-800 mb-4'
    }, '🖼️ Your Gallery'),
    generatedImages.length === 0 
        ? React.createElement('div', {
            key: 'empty',
            className: 'text-center py-12 text-gray-500'
        }, [
            React.createElement('div', {
                key: 'icon',
                className: 'text-6xl mb-4'
            }, '🎨'),
            React.createElement('p', {
                key: 'text'
            }, 'No images generated yet. Start creating!')
        ])
        : React.createElement('div', {
            key: 'grid',
            className: 'masonry-grid'
        }, generatedImages.map(image => 
            React.createElement(ImageCard, {
                key: image.id,
                image,
                downloadImage,
                copyApiUrl
            })
        ))
]);

const Footer = () => React.createElement('footer', {
    className: 'mt-12 py-6 border-t border-gray-200 text-center text-sm text-gray-500'
}, [
    React.createElement('p', {
        key: 'tips'
    }, '💡 Tip: Use specific, descriptive prompts for better results!'),
    React.createElement('p', {
        key: 'backlink',
        className: 'mt-2'
    }, [
        'Powered by ',
        React.createElement('a', {
            key: 'link',
            href: 'https://berrry.app',
            className: 'text-yellow-600 hover:text-yellow-800',
            target: '_blank',
            rel: 'noopener noreferrer'
        }, 'berrry.app')
    ])
]);

const App = () => {
    const [activeTab, setActiveTab] = useState('generate');
    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState('512x512');
    const [seed, setSeed] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [strength, setStrength] = useState(0.7);
    const [multipleImages, setMultipleImages] = useState([]);
    const [composePrompt, setComposePrompt] = useState('');
    const [totalGenerated, setTotalGenerated] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState('');
    const fileInputRef = useRef(null);
    const multiFileInputRef = useRef(null);

    const sizes = [
        { label: '512×512', value: '512x512', aspect: 'square' },
        { label: '768×768', value: '768x768', aspect: 'square' },
        { label: '1024×1024', value: '1024x1024', aspect: 'square' },
        { label: '768×512', value: '768x512', aspect: 'landscape' },
        { label: '512×768', value: '512x768', aspect: 'portrait' },
        { label: '1920×1080', value: '1920x1080', aspect: 'wide' }
    ];

    const styles = [
        'photorealistic', 'artistic', 'cinematic', 'modern', 'abstract',
        'vintage', 'minimalist', 'dramatic', 'colorful', 'monochrome'
    ];

    const examplePrompts = [
        'wizard in purple robes holding crystal staff photorealistic',
        'abstract geometric composition blue gold colors artistic style',
        'professional headshot business woman confident smile studio lighting',
        'cozy living room fireplace warm lighting interior design',
        'cyberpunk city skyline neon lights night cinematic',
        'fantasy mountain landscape with castle cinematic lighting'
    ];

    useEffect(() => {
        const stored = localStorage.getItem('nanobanana-images');
        if (stored) {
            const parsed = JSON.parse(stored);
            setGeneratedImages(parsed);
            setTotalGenerated(parsed.length);
        }
    }, []);

    const saveImage = (imageData) => {
        const newImages = [imageData, ...generatedImages];
        setGeneratedImages(newImages);
        localStorage.setItem('nanobanana-images', JSON.stringify(newImages));
        setTotalGenerated(newImages.length);
    };

    const generateImage = async () => {
        if (!prompt.trim()) return;
        
        setLoading(true);
        try {
            const [width, height] = size.split('x');
            const styleAddition = selectedStyle ? ` ${selectedStyle}` : '';
            const finalPrompt = prompt + styleAddition;
            
            let url = `/api/nanobanana/image/${width}/${height}?prompt=${encodeURIComponent(finalPrompt)}`;
            if (seed) url += `&seed=${seed}`;
            
            const imageData = {
                id: Date.now(),
                url,
                prompt: finalPrompt,
                size,
                type: 'generated',
                timestamp: new Date().toISOString()
            };
            
            saveImage(imageData);
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const editImage = async () => {
        if (!uploadedImage || !editPrompt.trim()) return;
        
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('prompt', editPrompt);
            formData.append('base_image', uploadedImage);
            formData.append('strength', strength);
            
            const response = await fetch('/api/nanobanana/image', {
                method: 'POST',
                body: formData
            });
            
            if (response.redirected) {
                const imageData = {
                    id: Date.now(),
                    url: response.url,
                    prompt: editPrompt,
                    type: 'edited',
                    strength,
                    timestamp: new Date().toISOString()
                };
                saveImage(imageData);
            }
        } catch (error) {
            console.error('Edit failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const composeImages = async () => {
        if (multipleImages.length === 0 || !composePrompt.trim()) return;
        
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('prompt', composePrompt);
            multipleImages.forEach(file => {
                formData.append('reference_images', file);
            });
            
            const response = await fetch('/api/nanobanana/image', {
                method: 'POST',
                body: formData
            });
            
            if (response.redirected) {
                const imageData = {
                    id: Date.now(),
                    url: response.url,
                    prompt: composePrompt,
                    type: 'composed',
                    referenceCount: multipleImages.length,
                    timestamp: new Date().toISOString()
                };
                saveImage(imageData);
            }
        } catch (error) {
            console.error('Composition failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) setUploadedImage(file);
    };

    const handleMultipleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setMultipleImages(files);
    };

    const downloadImage = (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `nanobanana-${Date.now()}.png`;
        a.click();
    };

    const copyApiUrl = (imageData) => {
        navigator.clipboard.writeText(imageData.url);
    };

    const getRandomPrompt = () => {
        const randomPrompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
        setPrompt(randomPrompt);
    };

    return React.createElement('div', {
        className: 'max-w-6xl mx-auto p-4'
    }, [
        React.createElement(Header, { 
            key: 'header',
            totalGenerated 
        }),
        
        React.createElement('div', {
            key: 'tabs',
            className: 'flex space-x-4 mb-6'
        }, [
            React.createElement(TabButton, {
                key: 'generate',
                id: 'generate',
                label: 'Generate Fresh',
                icon: '🎨',
                activeTab,
                onClick: setActiveTab
            }),
            React.createElement(TabButton, {
                key: 'edit',
                id: 'edit',
                label: 'Edit Existing',
                icon: '✨',
                activeTab,
                onClick: setActiveTab
            }),
            React.createElement(TabButton, {
                key: 'compose',
                id: 'compose',
                label: 'Combine & Compose',
                icon: '🎭',
                activeTab,
                onClick: setActiveTab
            })
        ]),

        React.createElement('div', {
            key: 'content',
            className: 'bg-white rounded-lg shadow-lg p-6'
        }, 
            activeTab === 'generate' ? React.createElement(GenerateTab, {
                key: 'generate-tab',
                prompt,
                setPrompt,
                size,
                setSize,
                seed,
                setSeed,
                selectedStyle,
                setSelectedStyle,
                showAdvanced,
                setShowAdvanced,
                loading,
                generateImage,
                getRandomPrompt,
                sizes,
                styles
            }) :
            activeTab === 'edit' ? React.createElement(EditTab, {
                key: 'edit-tab',
                uploadedImage,
                fileInputRef,
                handleFileUpload,
                editPrompt,
                setEditPrompt,
                strength,
                setStrength,
                loading,
                editImage
            }) :
            React.createElement(ComposeTab, {
                key: 'compose-tab',
                multipleImages,
                multiFileInputRef,
                handleMultipleFileUpload,
                composePrompt,
                setComposePrompt,
                loading,
                composeImages
            })
        ),

        React.createElement(Gallery, { 
            key: 'gallery',
            generatedImages,
            downloadImage,
            copyApiUrl
        }),
        React.createElement(Footer, { key: 'footer' })
    ]);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));