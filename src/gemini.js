const debug = require('debug')('berrry:gemini');

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_FILES_URL = 'https://generativelanguage.googleapis.com/v1beta/files';

/**
 * Factory function that creates a Gemini client with injected dependencies
 */
function createGeminiClient(options = {}) {
  const fetchFn = options.fetch;
  const defaultDb = options.db || null;
  
  if (!fetchFn) {
    throw new Error('fetch function must be provided to createGeminiClient');
  }

  /**
   * Check if Gemini API is configured
   */
  function isConfigured() {
    return !!GEMINI_API_KEY;
  }

  /**
   * Upload video to Gemini File API
   */
  async function uploadVideo(videoUrl, requestId = null) {
    debug('Uploading video to Gemini File API: %s', videoUrl);
    
    // Download video content
    const response = await fetchFn(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    
    const videoBuffer = Buffer.from(await response.arrayBuffer());
    const videoSize = videoBuffer.length;
    debug('Downloaded video: %d bytes', videoSize);
    
    // Check size limit (Gemini has a 20MB limit for videos)
    if (videoSize > 20 * 1024 * 1024) {
      throw new Error(`Video too large: ${videoSize} bytes (max 20MB)`);
    }
    
    // Generate a unique filename
    const filename = `twitter_video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
    
    // Create multipart form data
    const boundary = `----formdata-${Date.now()}`;
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="metadata"',
      'Content-Type: application/json',
      '',
      JSON.stringify({
        file: {
          displayName: filename,
          mimeType: 'video/mp4'
        }
      }),
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      'Content-Type: video/mp4',
      '',
      videoBuffer.toString('binary'),
      `--${boundary}--`
    ].join('\r\n');
    
    const uploadResponse = await fetchFn(GEMINI_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData, 'binary').toString()
      },
      body: Buffer.from(formData, 'binary')
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Video upload failed: ${uploadResponse.status} ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    debug('Video uploaded successfully: %s', uploadResult.file?.uri);
    
    // Extract the file name from the full URI for status checking
    const fileName = uploadResult.file.name; // This should be the correct file name
    debug('File name for status checking: %s', fileName);
    
    // Wait for video processing to complete
    await waitForVideoProcessing(fileName, requestId);
    
    return uploadResult.file;
  }
  
  /**
   * Wait for video processing to complete
   */
  async function waitForVideoProcessing(fileName, requestId = null, maxWaitTime = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    debug('Waiting for video processing to complete: %s', fileName);
    
    while (Date.now() - startTime < maxWaitTime) {
      // fileName already includes the 'files/' prefix, so we need to construct the URL correctly
      const fileUrl = fileName.startsWith('files/') 
        ? `https://generativelanguage.googleapis.com/v1beta/${fileName}`
        : `${GEMINI_FILES_URL}/${fileName}`;
      debug('Checking file status at URL: %s', fileUrl);
      
      const response = await fetchFn(fileUrl, {
        headers: { 'x-goog-api-key': GEMINI_API_KEY }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        debug('File status check failed: %d %s', response.status, errorText);
        throw new Error(`Failed to check file status: ${response.status} - ${errorText}`);
      }
      
      const fileStatus = await response.json();
      debug('Video processing status: %s', fileStatus.state);
      
      if (fileStatus.state === 'ACTIVE') {
        debug('Video processing completed');
        return fileStatus;
      } else if (fileStatus.state === 'FAILED') {
        throw new Error('Video processing failed');
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Video processing timeout');
  }
  
  /**
   * Delete uploaded file from Gemini
   */
  async function deleteFile(fileName) {
    // fileName already includes the 'files/' prefix
    const deleteUrl = fileName.startsWith('files/') 
      ? `https://generativelanguage.googleapis.com/v1beta/${fileName}`
      : `${GEMINI_FILES_URL}/${fileName}`;
    
    const response = await fetchFn(deleteUrl, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': GEMINI_API_KEY }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status}`);
    }
    
    debug('Deleted uploaded video file: %s', fileName);
  }

  /**
   * Call Gemini API with retry logic
   */
  async function callWithRetry(requestData, requestId = null, maxRetries = 3) {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchFn(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          },
          body: JSON.stringify(requestData)
        });

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          debug('Gemini rate limited, waiting %dms before retry %d/%d', waitTime, attempt, maxRetries);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        // Log to database if we have context
        if (requestId && defaultDb) {
          try {
            const duration = Date.now() - startTime;
            await defaultDb.logLLMInteraction({
              requestId,
              interactionType: 'video_analysis',
              model: 'gemini-2.5-flash-preview-05-20',
              promptText: JSON.stringify(requestData),
              responseText: JSON.stringify(result),
              durationMs: duration,
              success: true
            });
          } catch (dbError) {
            console.error('Failed to log Gemini interaction:', dbError);
          }
        }

        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          // Log error to database if we have context
          if (requestId && defaultDb) {
            try {
              const duration = Date.now() - startTime;
              await defaultDb.logLLMInteraction({
                requestId,
                interactionType: 'video_analysis',
                model: 'gemini-2.5-flash-preview-05-20',
                promptText: JSON.stringify(requestData),
                responseText: '',
                durationMs: duration,
                success: false,
                errorMessage: error.message
              });
            } catch (dbError) {
              console.error('Failed to log Gemini error:', dbError);
            }
          }
          throw error;
        }
        
        debug('Gemini API call failed (attempt %d/%d): %s', attempt, maxRetries, error.message);
      }
    }
  }

  /**
   * Analyze video content using uploaded video file
   */
  async function analyzeVideo(videoUrl, requestId = null) {
    const prompt = `Analyze this video content and describe what kind of web application or app could be inspired by what you see. Pay attention to:
- Visual elements, animations, and transitions
- User interactions and interface patterns  
- Functionality that could be implemented as a web app
- Creative features or novel UI concepts
Be specific about actionable app ideas based on the video content.`;

    debug('Starting video analysis for: %s', videoUrl);

    try {
      // Upload video to Gemini File API first
      const uploadedFile = await uploadVideo(videoUrl, requestId);
      
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            {
              fileData: {
                mimeType: uploadedFile.mimeType,
                fileUri: uploadedFile.uri
              }
            }
          ]
        }]
      };

      const response = await callWithRetry(requestBody, requestId, 3);

      if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid Gemini API response structure');
      }

      const result = response.candidates[0].content.parts[0].text.trim();

      // Clean up uploaded file
      try {
        await deleteFile(uploadedFile.name);
      } catch (cleanupError) {
        debug('Failed to cleanup uploaded file: %s', cleanupError.message);
      }

      return result;
    } catch (error) {
      debug('Video analysis failed: %s', error.message);
      throw error;
    }
  }


  // Return the Gemini client object
  return {
    isConfigured,
    uploadVideo,
    deleteFile,
    analyzeVideo,
    callWithRetry
  };
}

// Export factory function
module.exports = createGeminiClient;
module.exports.createGeminiClient = createGeminiClient;